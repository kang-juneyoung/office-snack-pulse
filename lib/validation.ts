import { z } from "zod";
import { CATEGORIES, BUDGETS, FREQUENCIES } from "./options";

const ids = <T extends readonly { id: string }[]>(list: T) =>
  list.map((x) => x.id) as unknown as [T[number]["id"], ...T[number]["id"][]];

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("이메일 형식이 아닙니다").max(120),
  password: z.string().min(8, "비밀번호는 8자 이상").max(72),
  name: z.string().trim().min(1, "이름을 입력하세요").max(30),
  company: z.string().trim().min(1, "회사명을 입력하세요").max(60),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(72),
});

export const surveySchema = z.object({
  title: z.string().trim().min(2, "제목은 2자 이상").max(60),
  headcount: z.coerce.number().int().min(1, "1명 이상").max(500, "500명 이하"),
});

export const responseSchema = z.object({
  categories: z.array(z.enum(ids(CATEGORIES))).min(1, "하나 이상 고르세요").max(3, "최대 3개"),
  budget: z.enum(ids(BUDGETS)),
  frequency: z.enum(ids(FREQUENCIES)),
  comment: z.string().trim().max(200).optional().transform((v) => (v ? v : undefined)),
});

export const quoteSchema = z.object({
  contactPhone: z
    .string()
    .trim()
    .regex(/^0\d{1,2}-?\d{3,4}-?\d{4}$/, "연락처 형식을 확인하세요"),
  note: z.string().trim().max(300).optional().transform((v) => (v ? v : undefined)),
});

export type ResponseInput = z.infer<typeof responseSchema>;
