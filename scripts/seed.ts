// 데모용 가상 데이터. 실제 회사·사람과 관계없습니다.
// 실행: npm run seed  (DB를 비우고 다시 채웁니다)
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb } from "../lib/db";
import { users, surveys, responses, quoteRequests, events } from "../lib/schema";
import { hashClient } from "../lib/services";
import { CATEGORIES, BUDGETS, FREQUENCIES } from "../lib/options";

let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(arr: readonly T[], w?: number[]) => {
  if (!w) return arr[Math.floor(rand() * arr.length)];
  const t = w.reduce((a, b) => a + b, 0);
  let r = rand() * t;
  for (let i = 0; i < arr.length; i++) if ((r -= w[i]) <= 0) return arr[i];
  return arr[arr.length - 1];
};
const daysAgo = (d: number, h = 10) => new Date(Date.now() - d * 86400_000 - h * 3600_000);

const COMPANIES = [
  "한빛소프트랩", "그린데이터", "오렌지마케팅", "누리디자인", "바른회계법인", "모아물류", "하늘건축", "새봄교육",
  "블루웨이브", "온새미로", "다온테크", "빛나래출판", "가람세무", "솔빛컨설팅",
];
const COMMENTS = ["제로 음료 있으면 좋겠어요", "견과류 소포장이 좋아요", "아침에 먹을 빵이 있으면 좋겠어요", "커피 원두 종류가 다양했으면", "과일은 주 2회 정도면 충분해요", "너무 단 과자는 줄여 주세요"];

async function main() {
  const db = await getDb();
  await db.execute(sql`TRUNCATE events, quote_requests, responses, surveys, users RESTART IDENTITY CASCADE`);

  await db.insert(users).values({ email: "admin@snackpulse.test", passwordHash: await bcrypt.hash("demo-admin-1234", 10), name: "검증담당", company: "위펀 CEO Staff(데모)", role: "staff", createdAt: daysAgo(20) });

  // 랜딩 방문 → CTA 클릭
  for (let i = 0; i < 132; i++) {
    const at = daysAgo(Math.floor(rand() * 14), Math.floor(rand() * 10));
    await db.insert(events).values({ name: "landing_view", anonId: `v${i}`, createdAt: at });
    if (rand() < 0.32) await db.insert(events).values({ name: "cta_click", anonId: `v${i}`, createdAt: at });
  }

  const managerHash = await bcrypt.hash("demo-1234!", 10);
  for (let i = 0; i < COMPANIES.length; i++) {
    const day = 13 - i;
    const [u] = await db
      .insert(users)
      .values({ email: i === 0 ? "demo@hanbit.test" : `manager${i}@demo.test`, passwordHash: managerHash, name: `총무${i + 1}`, company: COMPANIES[i], createdAt: daysAgo(day, 9) })
      .returning();
    await db.insert(events).values({ name: "signup", userId: u.id, anonId: `v${i}`, createdAt: daysAgo(day, 9) });

    const headcount = 8 + Math.floor(rand() * 40);
    const [s] = await db
      .insert(surveys)
      .values({ ownerId: u.id, title: "탕비실 간식 취향 조사", headcount, token: `demo${String(i).padStart(4, "0")}tok`, createdAt: daysAgo(day, 8) })
      .returning();
    await db.insert(events).values({ name: "survey_created", userId: u.id, surveyId: s.id, createdAt: daysAgo(day, 8) });

    // 응답률은 회사마다 다르게: 일부는 공유를 안 해서 응답 0
    const rate = i % 5 === 3 ? 0 : 0.2 + rand() * 0.6;
    const n = Math.round(headcount * rate);
    if (n > 0) await db.insert(events).values({ name: "share_link_copied", userId: u.id, surveyId: s.id, createdAt: daysAgo(day, 7) });
    for (let k = 0; k < n; k++) {
      const cats = new Set<string>();
      const want = 1 + Math.floor(rand() * 3);
      while (cats.size < want) cats.add(pick(CATEGORIES.map((c) => c.id), [5, 3, 7, 3, 2, 2]));
      await db.insert(responses).values({
        surveyId: s.id,
        categories: [...cats],
        budget: pick(BUDGETS.map((b) => b.id), [3, 5, 2]),
        frequency: pick(FREQUENCIES.map((f) => f.id), [3, 5, 2]),
        comment: rand() < 0.25 ? pick(COMMENTS) : null,
        clientHash: hashClient(`emp-${i}-${k}`, s.id),
        createdAt: daysAgo(day - 1, 6),
      });
      await db.insert(events).values({ name: "survey_view", anonId: `emp-${i}-${k}`, surveyId: s.id, createdAt: daysAgo(day - 1, 6) });
      await db.insert(events).values({ name: "response_submitted", anonId: `emp-${i}-${k}`, surveyId: s.id, createdAt: daysAgo(day - 1, 6) });
    }
    if (n >= 5) await db.insert(events).values({ name: "results_view", userId: u.id, surveyId: s.id, createdAt: daysAgo(day - 1, 2) });
    if ([0, 4, 9].includes(i) && n >= 5) {
      await db.insert(quoteRequests).values({ surveyId: s.id, ownerId: u.id, contactPhone: `010-0000-${String(1000 + i).slice(-4)}`, note: i === 0 ? "화요일 오전 배송 희망" : null, createdAt: daysAgo(day - 2, 3) });
      await db.insert(events).values({ name: "quote_requested", userId: u.id, surveyId: s.id, createdAt: daysAgo(day - 2, 3) });
    }
  }
  console.log("seed 완료 — 내부 담당 admin@snackpulse.test / demo-admin-1234, 총무 demo@hanbit.test / demo-1234!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
