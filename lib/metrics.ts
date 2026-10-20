import { DECISION } from "./options";

export type FunnelCounts = {
  landingVisitors: number; // 랜딩을 본 고유 방문자
  signups: number; // 가입한 총무
  surveysCreated: number; // 만든 조사 수
  surveysWithResponse: number; // 응답이 1건 이상 들어온 조사
  surveysReady: number; // 응답이 기준(5건) 이상 모인 조사
  quoteRequests: number; // 견적 요청이 들어온 조사
};

export type FunnelStep = { key: keyof FunnelCounts; label: string; count: number; fromPrev: number | null; fromTop: number | null };

const LABELS: Record<keyof FunnelCounts, string> = {
  landingVisitors: "랜딩 방문",
  signups: "총무 가입",
  surveysCreated: "조사 생성",
  surveysWithResponse: "첫 응답 도착",
  surveysReady: `응답 ${DECISION.minResponses}건 이상`,
  quoteRequests: "견적 요청",
};

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export function buildFunnel(c: FunnelCounts): FunnelStep[] {
  const keys = Object.keys(LABELS) as (keyof FunnelCounts)[];
  return keys.map((key, i) => ({
    key,
    label: LABELS[key],
    count: c[key],
    fromPrev: i === 0 ? null : ratio(c[key], c[keys[i - 1]]),
    fromTop: i === 0 ? null : ratio(c[key], c[keys[0]]),
  }));
}

// 이전 단계 대비 전환율이 가장 낮은 단계 = 다음 실험 대상 (랜딩은 제외)
export function biggestDrop(f: FunnelStep[]): FunnelStep | null {
  const cands = f.filter((x) => x.fromPrev !== null);
  if (!cands.length) return null;
  return cands.reduce((a, b) => ((b.fromPrev as number) < (a.fromPrev as number) ? b : a));
}

// 동률 1위를 모두 돌려준다 (요약 문장에서 한쪽만 고르지 않기 위해)
export function leaders(t: Tally): Tally {
  if (!t.length || t[0].count === 0) return [];
  return t.filter((x) => x.count === t[0].count);
}

export type Decision = { verdict: "continue" | "stop" | "wait"; quoteRate: number | null; reason: string };

// 핵심 판단: 조사를 만든 총무 중 견적까지 가는 비율.
// 표본이 너무 작으면(조사 10개 미만) 결론을 내리지 않는다.
export function decide(c: FunnelCounts, minSample = 10): Decision {
  const quoteRate = ratio(c.quoteRequests, c.surveysCreated);
  if (c.surveysCreated < minSample) {
    return { verdict: "wait", quoteRate, reason: `조사가 ${c.surveysCreated}개뿐이라 판단 보류 (최소 ${minSample}개)` };
  }
  if ((quoteRate ?? 0) >= DECISION.quoteRateGo) {
    return { verdict: "continue", quoteRate, reason: `견적 전환 ${pct(quoteRate)} ≥ 기준 ${pct(DECISION.quoteRateGo)}` };
  }
  return { verdict: "stop", quoteRate, reason: `견적 전환 ${pct(quoteRate)} < 기준 ${pct(DECISION.quoteRateGo)}` };
}

export const pct = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(1)}%`);

// 조사 결과 집계: 숫자는 코드가 계산한다.
export type Tally = { id: string; count: number; share: number }[];

export function tally(values: string[], universe: readonly { id: string }[], denominator: number): Tally {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return universe
    .map(({ id }) => ({ id, count: counts.get(id) ?? 0, share: denominator > 0 ? (counts.get(id) ?? 0) / denominator : 0 }))
    .sort((a, b) => b.count - a.count);
}
