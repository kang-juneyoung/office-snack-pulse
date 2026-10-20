import { pgTable, serial, text, integer, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

// 총무(manager)와 위펀 내부 담당자(staff). 직원 응답자는 계정을 만들지 않는다(개인정보 최소 수집).
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  role: text("role").$type<"manager" | "staff">().notNull().default("manager"),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const surveys = pgTable(
  "surveys",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    headcount: integer("headcount").notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("surveys_token_idx").on(t.token), index("surveys_owner_idx").on(t.ownerId)],
);

// 응답에는 이름·이메일을 저장하지 않는다. 중복 응답 방지는 브라우저 식별값의 해시만 사용.
export const responses = pgTable(
  "responses",
  {
    id: serial("id").primaryKey(),
    surveyId: integer("survey_id").notNull().references(() => surveys.id),
    categories: jsonb("categories").$type<string[]>().notNull(),
    budget: text("budget").notNull(),
    frequency: text("frequency").notNull(),
    comment: text("comment"),
    clientHash: text("client_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("responses_dedupe_idx").on(t.surveyId, t.clientHash)],
);

export const quoteRequests = pgTable("quote_requests", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").notNull().references(() => surveys.id),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  contactPhone: text("contact_phone").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 행동 데이터: 퍼널 판단에 필요한 이벤트만 기록한다.
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    anonId: text("anon_id"),
    userId: integer("user_id"),
    surveyId: integer("survey_id"),
    props: jsonb("props").$type<Record<string, string | number>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_name_idx").on(t.name)],
);
