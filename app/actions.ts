"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signupSchema, loginSchema, surveySchema, responseSchema, quoteSchema } from "@/lib/validation";
import * as svc from "@/lib/services";
import { setSession, clearSession, requireUser, getAnonId } from "@/lib/session";

export type FormState = { error?: string; ok?: boolean; fieldErrors?: Record<string, string>; values?: Record<string, string> } | undefined;

// React 19는 액션 후 폼을 비우므로, 오류 시 입력값(비밀번호 제외)을 돌려줘 다시 채운다.
const keep = (fd: FormData): Record<string, string> =>
  Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === "string" && k !== "password" && !k.startsWith("$")).map(([k, v]) => [k, v as string]));

const firstErrors = (issues: { path: (string | number)[]; message: string }[]) =>
  Object.fromEntries(issues.map((i) => [String(i.path[0]), i.message]));

const fail = (e: unknown): FormState => {
  if (e instanceof svc.AppError) return { error: e.message };
  console.error(e);
  return { error: "처리 중 문제가 생겼습니다. 다시 시도해 주세요" };
};

export async function signupAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error.issues), values: keep(fd) };
  try {
    const u = await svc.signup(parsed.data);
    await setSession(u);
    await svc.track("signup", { anonId: await getAnonId(), userId: u.id });
  } catch (e) {
    return { ...fail(e), values: keep(fd) };
  }
  redirect("/dashboard");
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "이메일과 비밀번호를 확인하세요", values: keep(fd) };
  let role: "manager" | "staff";
  try {
    const u = await svc.login(parsed.data.email, parsed.data.password);
    await setSession(u);
    role = u.role;
  } catch (e) {
    return { ...fail(e), values: keep(fd) };
  }
  redirect(role === "staff" ? "/admin" : "/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function createSurveyAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = surveySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error.issues), values: keep(fd) };
  let id: number;
  try {
    const s = await svc.createSurvey(user, parsed.data);
    id = s.id;
    await svc.track("survey_created", { userId: user.id, surveyId: s.id, props: { headcount: s.headcount } });
  } catch (e) {
    return { ...fail(e), values: keep(fd) };
  }
  redirect(`/dashboard/surveys/${id}`);
}

export async function submitResponseAction(token: string, _: FormState, fd: FormData): Promise<FormState> {
  const parsed = responseSchema.safeParse({
    categories: fd.getAll("categories"),
    budget: fd.get("budget") ?? undefined,
    frequency: fd.get("frequency") ?? undefined,
    comment: fd.get("comment") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error.issues), values: keep(fd) };
  try {
    const anonId = (await getAnonId())!;
    const r = await svc.submitResponse(token, anonId, parsed.data);
    await svc.track("response_submitted", { anonId, surveyId: r.surveyId, props: { n: r.responseCount } });
  } catch (e) {
    return { ...fail(e), values: keep(fd) };
  }
  return { ok: true };
}

export async function requestQuoteAction(surveyId: number, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = quoteSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error.issues), values: keep(fd) };
  try {
    await svc.requestQuote(user, surveyId, parsed.data);
    await svc.track("quote_requested", { userId: user.id, surveyId });
  } catch (e) {
    return { ...fail(e), values: keep(fd) };
  }
  revalidatePath(`/dashboard/surveys/${surveyId}`);
  return { ok: true };
}

// 화면 단 이벤트 (조회·클릭). 허용 목록에 있는 이름만 받는다.
const CLIENT_EVENTS = ["landing_view", "cta_click", "share_link_copied", "survey_view", "results_view"] as const;

export async function trackAction(name: string, surveyId?: number) {
  if (!(CLIENT_EVENTS as readonly string[]).includes(name)) return;
  await svc.track(name as svc.TrackedEvent, { anonId: await getAnonId(), surveyId });
}
