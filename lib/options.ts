export const CATEGORIES = [
  { id: "snack", label: "과자·쿠키" },
  { id: "healthy", label: "견과·건강 간식" },
  { id: "drink", label: "음료·커피" },
  { id: "breakfast", label: "아침 대용(빵·시리얼)" },
  { id: "fruit", label: "과일" },
  { id: "dessert", label: "아이스크림·디저트" },
] as const;

export const BUDGETS = [
  { id: "low", label: "1인 월 1만 원 이하" },
  { id: "mid", label: "1인 월 1~2만 원" },
  { id: "high", label: "1인 월 2만 원 이상" },
] as const;

export const FREQUENCIES = [
  { id: "weekly", label: "주 1회" },
  { id: "twice", label: "주 2~3회" },
  { id: "daily", label: "매일" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type BudgetId = (typeof BUDGETS)[number]["id"];
export type FrequencyId = (typeof FREQUENCIES)[number]["id"];

export const labelOf = (list: readonly { id: string; label: string }[], id: string) =>
  list.find((x) => x.id === id)?.label ?? id;

// 가설 판단 기준. 이 값이 바뀌면 README의 판단 기준도 함께 바꾼다.
export const DECISION = {
  minResponses: 5, // 결과를 볼 만하다고 보는 응답 수
  quoteRateGo: 0.1, // 조사 생성 대비 견적 요청 비율이 이 이상이면 "계속"
} as const;
