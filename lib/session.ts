import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import type { SessionUser } from "./services";

const COOKIE = "sp_session";
const ANON = "sp_anon";
const MAX_AGE = 60 * 60 * 8; // 8시간

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET이 설정되지 않았습니다");
  return new TextEncoder().encode(s ?? "dev-only-secret-change-me-dev-only-secret");
}

export async function setSession(u: SessionUser) {
  const jwt = await new SignJWT({ role: u.role, name: u.name, company: u.company })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(u.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, jwt, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id: Number(payload.sub), role: payload.role as SessionUser["role"], name: String(payload.name), company: String(payload.company) };
  } catch {
    return null;
  }
}

// 화면 단이 아니라 서버에서 권한을 확인한다.
export async function requireUser(): Promise<SessionUser> {
  const u = await getSession();
  if (!u) redirect("/login");
  return u;
}

export async function requireStaffUser(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "staff") redirect("/dashboard");
  return u;
}

// 익명 방문자 식별값: 퍼널 집계와 중복 응답 방지에만 쓴다.
export async function getAnonId(create = true): Promise<string | undefined> {
  const jar = await cookies();
  const v = jar.get(ANON)?.value;
  if (v || !create) return v;
  const id = randomUUID();
  jar.set(ANON, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 180 });
  return id;
}
