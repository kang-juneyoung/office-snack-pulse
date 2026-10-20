import { describe, it, expect, beforeEach } from "vitest";
process.env.PGLITE_DIR = "memory";
process.env.DATABASE_URL = "";
import { resetDbForTests, getDb } from "@/lib/db";
import * as svc from "@/lib/services";
import { users } from "@/lib/schema";
import { responseSchema } from "@/lib/validation";
import bcrypt from "bcryptjs";

const answer = { categories: ["drink", "snack"] as ("drink" | "snack")[], budget: "mid" as const, frequency: "twice" as const };

async function staff(): Promise<svc.SessionUser> {
  const db = await getDb();
  const [u] = await db.insert(users).values({ email: "staff@t.test", passwordHash: await bcrypt.hash("x-password", 4), name: "s", company: "w", role: "staff" }).returning();
  return { id: u.id, role: "staff", name: u.name, company: u.company };
}

beforeEach(() => resetDbForTests());

describe("계정", () => {
  it("같은 이메일로 두 번 가입할 수 없다", async () => {
    await svc.signup({ email: "a@t.test", password: "password1", name: "a", company: "A" });
    await expect(svc.signup({ email: "a@t.test", password: "password1", name: "a", company: "A" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("가입은 항상 manager 권한으로만 만들어진다", async () => {
    const u = await svc.signup({ email: "b@t.test", password: "password1", name: "b", company: "B" });
    expect(u.role).toBe("manager");
  });
  it("비밀번호 5회 실패 시 잠기고, 맞는 비밀번호로도 로그인되지 않는다", async () => {
    await svc.signup({ email: "c@t.test", password: "password1", name: "c", company: "C" });
    for (let i = 0; i < 4; i++) await expect(svc.login("c@t.test", "wrong")).rejects.toMatchObject({ code: "INVALID_LOGIN" });
    await expect(svc.login("c@t.test", "wrong")).rejects.toMatchObject({ code: "LOCKED" });
    await expect(svc.login("c@t.test", "password1")).rejects.toMatchObject({ code: "LOCKED" });
    // 잠금 시간이 지나면 다시 로그인된다
    const later = new Date(Date.now() + 11 * 60_000);
    await expect(svc.login("c@t.test", "password1", later)).resolves.toMatchObject({ role: "manager" });
  });
  it("없는 이메일과 틀린 비밀번호는 같은 메시지를 준다", async () => {
    await svc.signup({ email: "d@t.test", password: "password1", name: "d", company: "D" });
    const a = await svc.login("none@t.test", "x").catch((e) => e.message);
    const b = await svc.login("d@t.test", "x").catch((e) => e.message);
    expect(a).toBe(b);
  });
});

describe("인가 경계", () => {
  it("다른 회사 총무는 내 조사 결과를 볼 수 없고, 내부 담당자는 볼 수 있다", async () => {
    const me = await svc.signup({ email: "me@t.test", password: "password1", name: "me", company: "M" });
    const other = await svc.signup({ email: "o@t.test", password: "password1", name: "o", company: "O" });
    const s = await svc.createSurvey(me, { title: "조사", headcount: 10 });
    await expect(svc.getResults(other, s.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(svc.getResults(await staff(), s.id)).resolves.toMatchObject({ responseCount: 0 });
  });
  it("견적은 조사를 만든 총무만, 한 번만 요청할 수 있다 (내부 담당자도 대신 못 함)", async () => {
    const me = await svc.signup({ email: "q@t.test", password: "password1", name: "q", company: "Q" });
    const s = await svc.createSurvey(me, { title: "조사", headcount: 10 });
    await expect(svc.requestQuote(await staff(), s.id, { contactPhone: "010-1234-5678" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await svc.requestQuote(me, s.id, { contactPhone: "010-1234-5678" });
    await expect(svc.requestQuote(me, s.id, { contactPhone: "010-1234-5678" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("검증 대시보드 집계는 내부 담당자만 조회할 수 있다", async () => {
    const m = await svc.signup({ email: "f@t.test", password: "password1", name: "f", company: "F" });
    await expect(svc.funnelCounts(m)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(svc.recentQuotes(m)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("직원용 공개 정보에는 제목·회사명만 담긴다 (총무 이메일 없음)", async () => {
    const me = await svc.signup({ email: "p@t.test", password: "password1", name: "p", company: "P사" });
    const s = await svc.createSurvey(me, { title: "조사", headcount: 10 });
    const pub = await svc.getPublicSurvey(s.token);
    expect(Object.keys(pub!).sort()).toEqual(["company", "id", "title"]);
  });
});

describe("응답", () => {
  it("같은 브라우저는 한 조사에 한 번만 응답한다", async () => {
    const me = await svc.signup({ email: "r@t.test", password: "password1", name: "r", company: "R" });
    const s = await svc.createSurvey(me, { title: "조사", headcount: 10 });
    await svc.submitResponse(s.token, "browser-1", answer);
    await expect(svc.submitResponse(s.token, "browser-1", answer)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(svc.submitResponse(s.token, "browser-2", answer)).resolves.toMatchObject({ responseCount: 2 });
  });
  it("간식은 1~3개, 목록에 없는 값은 거부한다", () => {
    expect(responseSchema.safeParse({ ...answer, categories: [] }).success).toBe(false);
    expect(responseSchema.safeParse({ ...answer, categories: ["drink", "snack", "fruit", "dessert"] }).success).toBe(false);
    expect(responseSchema.safeParse({ ...answer, categories: ["beer"] }).success).toBe(false);
  });
  it("결과 집계 숫자는 저장된 응답과 일치하고, 퍼널에 반영된다", async () => {
    const me = await svc.signup({ email: "t@t.test", password: "password1", name: "t", company: "T" });
    const s = await svc.createSurvey(me, { title: "조사", headcount: 10 });
    for (let i = 0; i < 5; i++) await svc.submitResponse(s.token, `b${i}`, { ...answer, categories: i < 3 ? ["drink"] : ["snack"] });
    const r = await svc.getResults(me, s.id);
    expect(r.ready).toBe(true);
    expect(r.categories[0]).toMatchObject({ id: "drink", count: 3 });
    const f = await svc.funnelCounts(await staff());
    expect(f).toMatchObject({ surveysCreated: 1, surveysWithResponse: 1, surveysReady: 1, quoteRequests: 0 });
  });
});
