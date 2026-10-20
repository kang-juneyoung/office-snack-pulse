import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./db";
import { users, surveys, responses, quoteRequests, events } from "./schema";
import { DECISION, CATEGORIES, BUDGETS, FREQUENCIES } from "./options";
import { tally, type FunnelCounts } from "./metrics";
import type { ResponseInput } from "./validation";

export class AppError extends Error {
  constructor(public code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "LOCKED" | "INVALID_LOGIN", message: string) {
    super(message);
  }
}

export type SessionUser = { id: number; role: "manager" | "staff"; name: string; company: string };

const MAX_FAILED = 5;
const LOCK_MINUTES = 10;

// ---------- 계정 ----------
export async function signup(input: { email: string; password: string; name: string; company: string }): Promise<SessionUser> {
  const db = await getDb();
  const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email));
  if (exists.length) throw new AppError("CONFLICT", "이미 가입된 이메일입니다");
  const passwordHash = await bcrypt.hash(input.password, 10);
  const [u] = await db
    .insert(users)
    .values({ email: input.email, passwordHash, name: input.name, company: input.company, role: "manager" })
    .returning();
  return { id: u.id, role: u.role, name: u.name, company: u.company };
}

export async function login(email: string, password: string, now = new Date()): Promise<SessionUser> {
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.email, email));
  // 계정 존재 여부를 드러내지 않도록 같은 메시지를 쓴다.
  if (!u) throw new AppError("INVALID_LOGIN", "이메일 또는 비밀번호가 맞지 않습니다");
  if (u.lockedUntil && u.lockedUntil > now) throw new AppError("LOCKED", `로그인 ${MAX_FAILED}회 실패로 잠겼습니다. ${LOCK_MINUTES}분 뒤 다시 시도하세요`);
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) {
    const failed = u.failedLogins + 1;
    const lockedUntil = failed >= MAX_FAILED ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : null;
    await db.update(users).set({ failedLogins: lockedUntil ? 0 : failed, lockedUntil }).where(eq(users.id, u.id));
    throw new AppError(lockedUntil ? "LOCKED" : "INVALID_LOGIN", lockedUntil ? `로그인 ${MAX_FAILED}회 실패로 ${LOCK_MINUTES}분간 잠겼습니다` : "이메일 또는 비밀번호가 맞지 않습니다");
  }
  await db.update(users).set({ failedLogins: 0, lockedUntil: null }).where(eq(users.id, u.id));
  return { id: u.id, role: u.role, name: u.name, company: u.company };
}

// ---------- 조사 ----------
const newToken = () => randomBytes(9).toString("base64url");

export async function createSurvey(owner: SessionUser, input: { title: string; headcount: number }) {
  const db = await getDb();
  const [s] = await db.insert(surveys).values({ ownerId: owner.id, title: input.title, headcount: input.headcount, token: newToken() }).returning();
  return s;
}

export async function listMySurveys(owner: SessionUser) {
  const db = await getDb();
  return db
    .select({
      id: surveys.id,
      title: surveys.title,
      headcount: surveys.headcount,
      token: surveys.token,
      createdAt: surveys.createdAt,
      responseCount: sql<number>`(select count(*)::int from ${responses} r where r.survey_id = ${surveys.id})`,
      quoted: sql<boolean>`exists(select 1 from ${quoteRequests} q where q.survey_id = ${surveys.id})`,
    })
    .from(surveys)
    .where(eq(surveys.ownerId, owner.id))
    .orderBy(desc(surveys.createdAt));
}

// 인가 경계: 조사 결과는 만든 총무 본인 또는 내부 담당자(staff)만 볼 수 있다.
export async function getOwnedSurvey(user: SessionUser, surveyId: number) {
  const db = await getDb();
  const [s] = await db.select().from(surveys).where(eq(surveys.id, surveyId));
  if (!s) throw new AppError("NOT_FOUND", "조사를 찾을 수 없습니다");
  if (s.ownerId !== user.id && user.role !== "staff") throw new AppError("FORBIDDEN", "본인이 만든 조사만 볼 수 있습니다");
  return s;
}

// 직원용 공개 정보: 제목과 회사명만 노출한다.
export async function getPublicSurvey(token: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: surveys.id, title: surveys.title, company: users.company })
    .from(surveys)
    .innerJoin(users, eq(users.id, surveys.ownerId))
    .where(eq(surveys.token, token));
  return row ?? null;
}

export const hashClient = (clientId: string, surveyId: number) =>
  createHash("sha256").update(`${surveyId}:${clientId}`).digest("hex");

export async function submitResponse(token: string, clientId: string, input: ResponseInput) {
  const db = await getDb();
  const s = await getPublicSurvey(token);
  if (!s) throw new AppError("NOT_FOUND", "조사를 찾을 수 없습니다");
  const clientHash = hashClient(clientId, s.id);
  const dup = await db.select({ id: responses.id }).from(responses).where(and(eq(responses.surveyId, s.id), eq(responses.clientHash, clientHash)));
  if (dup.length) throw new AppError("CONFLICT", "이미 응답했습니다");
  await db.insert(responses).values({ surveyId: s.id, categories: input.categories, budget: input.budget, frequency: input.frequency, comment: input.comment ?? null, clientHash });
  const [{ n }] = await db.select({ n: count() }).from(responses).where(eq(responses.surveyId, s.id));
  return { surveyId: s.id, responseCount: Number(n) };
}

export async function getResults(user: SessionUser, surveyId: number) {
  const s = await getOwnedSurvey(user, surveyId);
  const db = await getDb();
  const rows = await db.select().from(responses).where(eq(responses.surveyId, s.id)).orderBy(desc(responses.createdAt));
  const n = rows.length;
  const [quote] = await db.select().from(quoteRequests).where(eq(quoteRequests.surveyId, s.id));
  return {
    survey: s,
    responseCount: n,
    responseRate: s.headcount > 0 ? n / s.headcount : 0,
    ready: n >= DECISION.minResponses,
    categories: tally(rows.flatMap((r) => r.categories), CATEGORIES, n),
    budgets: tally(rows.map((r) => r.budget), BUDGETS, n),
    frequencies: tally(rows.map((r) => r.frequency), FREQUENCIES, n),
    comments: rows.filter((r) => r.comment).map((r) => r.comment as string).slice(0, 20),
    quote: quote ?? null,
  };
}

export async function requestQuote(user: SessionUser, surveyId: number, input: { contactPhone: string; note?: string }) {
  const s = await getOwnedSurvey(user, surveyId);
  if (s.ownerId !== user.id) throw new AppError("FORBIDDEN", "조사를 만든 총무만 견적을 요청할 수 있습니다");
  const db = await getDb();
  const existing = await db.select({ id: quoteRequests.id }).from(quoteRequests).where(eq(quoteRequests.surveyId, s.id));
  if (existing.length) throw new AppError("CONFLICT", "이미 견적을 요청했습니다");
  const [q] = await db.insert(quoteRequests).values({ surveyId: s.id, ownerId: user.id, contactPhone: input.contactPhone, note: input.note ?? null }).returning();
  return q;
}

// ---------- 행동 데이터 ----------
export const TRACKED = ["landing_view", "cta_click", "signup", "survey_created", "share_link_copied", "survey_view", "response_submitted", "results_view", "quote_requested"] as const;
export type TrackedEvent = (typeof TRACKED)[number];

export async function track(name: TrackedEvent, data: { anonId?: string; userId?: number; surveyId?: number; props?: Record<string, string | number> } = {}) {
  const db = await getDb();
  await db.insert(events).values({ name, anonId: data.anonId ?? null, userId: data.userId ?? null, surveyId: data.surveyId ?? null, props: data.props ?? null });
}

// ---------- 내부 대시보드 (staff 전용) ----------
function requireStaff(user: SessionUser) {
  if (user.role !== "staff") throw new AppError("FORBIDDEN", "내부 담당자만 볼 수 있습니다");
}

export async function funnelCounts(user: SessionUser, since?: Date): Promise<FunnelCounts> {
  requireStaff(user);
  const db = await getDb();
  const from = since ?? new Date(0);
  const one = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);
  // 조사별 응답 수를 DB에서 집계한 뒤, 단계 기준(1건·5건) 비교는 코드에서 한다.
  const perSurvey = await db
    .select({ id: surveys.id, n: count(responses.id) })
    .from(surveys)
    .leftJoin(responses, eq(responses.surveyId, surveys.id))
    .where(gte(surveys.createdAt, from))
    .groupBy(surveys.id);
  const ns = perSurvey.map((r) => Number(r.n));
  return {
    landingVisitors: await one(db.select({ n: sql<number>`count(distinct ${events.anonId})` }).from(events).where(and(eq(events.name, "landing_view"), gte(events.createdAt, from)))),
    signups: await one(db.select({ n: count() }).from(users).where(and(eq(users.role, "manager"), gte(users.createdAt, from)))),
    surveysCreated: ns.length,
    surveysWithResponse: ns.filter((n) => n >= 1).length,
    surveysReady: ns.filter((n) => n >= DECISION.minResponses).length,
    quoteRequests: await one(db.select({ n: count() }).from(quoteRequests).innerJoin(surveys, eq(surveys.id, quoteRequests.surveyId)).where(gte(surveys.createdAt, from))),
  };
}

export async function recentQuotes(user: SessionUser) {
  requireStaff(user);
  const db = await getDb();
  return db
    .select({ id: quoteRequests.id, company: users.company, manager: users.name, phone: quoteRequests.contactPhone, note: quoteRequests.note, title: surveys.title, headcount: surveys.headcount, createdAt: quoteRequests.createdAt, surveyId: surveys.id })
    .from(quoteRequests)
    .innerJoin(users, eq(users.id, quoteRequests.ownerId))
    .innerJoin(surveys, eq(surveys.id, quoteRequests.surveyId))
    .orderBy(desc(quoteRequests.createdAt))
    .limit(20);
}

export async function eventCounts(user: SessionUser) {
  requireStaff(user);
  const db = await getDb();
  return db.select({ name: events.name, n: count() }).from(events).groupBy(events.name).orderBy(desc(count()));
}

// 응답이 모인 조사 전체의 카테고리 선호 (영업 자료용 집계, 개별 응답은 노출하지 않음)
export async function overallPreferences(user: SessionUser) {
  requireStaff(user);
  const db = await getDb();
  const rows = await db.select({ categories: responses.categories }).from(responses);
  return { total: rows.length, categories: tally(rows.flatMap((r) => r.categories), CATEGORIES, rows.length) };
}
