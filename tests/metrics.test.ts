import { describe, it, expect } from "vitest";
import { buildFunnel, decide, tally, biggestDrop, leaders, type FunnelCounts } from "@/lib/metrics";
import { CATEGORIES } from "@/lib/options";

const base: FunnelCounts = { landingVisitors: 100, signups: 20, surveysCreated: 20, surveysWithResponse: 15, surveysReady: 10, quoteRequests: 3 };

describe("퍼널", () => {
  it("단계별 전환율을 이전 단계 기준으로 계산한다", () => {
    const f = buildFunnel(base);
    expect(f[0].fromPrev).toBeNull();
    expect(f[1].fromPrev).toBeCloseTo(0.2);
    expect(f[5].fromPrev).toBeCloseTo(0.3);
    expect(f[5].fromTop).toBeCloseTo(0.03);
  });
  it("분모가 0이면 비율을 null로 둔다 (0으로 나누지 않음)", () => {
    const f = buildFunnel({ ...base, landingVisitors: 0, signups: 0 });
    expect(f[1].fromPrev).toBeNull();
    expect(f[2].fromPrev).toBeNull();
  });
});

describe("판단 규칙", () => {
  it("표본이 부족하면 보류", () => {
    expect(decide({ ...base, surveysCreated: 5, quoteRequests: 3 }).verdict).toBe("wait");
  });
  it("견적 전환 10% 이상이면 계속", () => {
    expect(decide(base).verdict).toBe("continue");
  });
  it("10% 미만이면 중단 검토", () => {
    expect(decide({ ...base, quoteRequests: 1 }).verdict).toBe("stop");
  });
});

describe("집계", () => {
  it("응답자 수를 분모로 선택 비율을 계산하고 많은 순으로 정렬한다", () => {
    const t = tally(["drink", "snack", "drink", "fruit"], CATEGORIES, 3);
    expect(t[0]).toEqual({ id: "drink", count: 2, share: 2 / 3 });
    expect(t.find((x) => x.id === "dessert")?.count).toBe(0);
    expect(t).toHaveLength(CATEGORIES.length);
  });
});

describe("다음 실험 대상과 동률 처리", () => {
  it("이전 단계 대비 가장 많이 빠지는 단계를 고른다", () => {
    expect(biggestDrop(buildFunnel(base))?.key).toBe("signups");
  });
  it("1위가 동률이면 모두 돌려주고, 응답이 없으면 빈 목록", () => {
    expect(leaders(tally(["low", "mid"], [{ id: "low" }, { id: "mid" }, { id: "high" }], 2)).map((x) => x.id).sort()).toEqual(["low", "mid"]);
    expect(leaders(tally([], [{ id: "low" }], 0))).toEqual([]);
  });
});
