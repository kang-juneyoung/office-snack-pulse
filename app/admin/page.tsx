import { requireStaffUser } from "@/lib/session";
import { funnelCounts, recentQuotes, eventCounts, overallPreferences } from "@/lib/services";
import { buildFunnel, decide, pct, biggestDrop } from "@/lib/metrics";
import { CATEGORIES, DECISION } from "@/lib/options";
import Bars from "@/components/Bars";

export const dynamic = "force-dynamic";

const VERDICT = {
  continue: { text: "계속 — 개발부문 인계 검토", cls: "bg-emerald-100 text-emerald-800" },
  stop: { text: "중단 검토 — 기준 미달", cls: "bg-red-100 text-red-800" },
  wait: { text: "판단 보류 — 표본 부족", cls: "bg-stone-200 text-stone-700" },
} as const;

export default async function Admin() {
  const user = await requireStaffUser();
  const [counts, quotes, ev, prefs] = await Promise.all([funnelCounts(user), recentQuotes(user), eventCounts(user), overallPreferences(user)]);
  const funnel = buildFunnel(counts);
  const d = decide(counts);
  const drop = biggestDrop(funnel);
  const max = Math.max(1, ...funnel.map((f) => f.count));
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand-600">CEO Staff · 가설 검증 대시보드</p>
        <h1 className="text-2xl font-bold">“간식 계약 전 직원 취향 조사를 주면, 총무는 견적까지 간다”</h1>
        <p className="mt-1 text-sm text-stone-500">판단 기준: 조사를 만든 총무 중 견적 요청 {pct(DECISION.quoteRateGo)} 이상이면 계속, 미만이면 중단 (조사 10개 이상 모였을 때)</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card"><p className="text-sm text-stone-500">견적 전환 (조사 생성 대비)</p><p className="mt-1 text-3xl font-extrabold tabular-nums">{pct(d.quoteRate)}</p></div>
        <div className="card"><p className="text-sm text-stone-500">조사 생성 / 견적 요청</p><p className="mt-1 text-3xl font-extrabold tabular-nums">{counts.surveysCreated} / {counts.quoteRequests}</p></div>
        <div className="card"><p className="text-sm text-stone-500">현재 판단</p><p className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-bold ${VERDICT[d.verdict].cls}`}>{VERDICT[d.verdict].text}</p><p className="mt-2 text-xs text-stone-500">{d.reason}</p></div>
      </div>
      <div className="card">
        <h2 className="mb-4 font-bold">퍼널</h2>
        <ul className="space-y-3">
          {funnel.map((f) => (
            <li key={f.key} className={`grid ${drop?.key === f.key ? "rounded-lg ring-2 ring-amber-300" : ""} grid-cols-[120px_1fr_150px] items-center gap-3 text-sm`}>
              <span className="font-medium">{f.label}</span>
              <div className="h-6 rounded-md bg-stone-100"><div className="flex h-6 items-center rounded-md bg-brand-500 px-2 text-xs font-semibold text-white" style={{ width: `${Math.max(4, (f.count / max) * 100)}%` }}>{f.count}</div></div>
              <span className="text-right tabular-nums text-stone-500">{f.fromPrev === null ? "기준" : `이전 단계 ${pct(f.fromPrev)}`}</span>
            </li>
          ))}
        </ul>
        {drop && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            다음 실험 대상: <b>{drop.label}</b> 단계 (이전 단계 대비 {pct(drop.fromPrev)}) — 이 단계를 바꾸는 실험 하나만 먼저 돌립니다.
          </p>
        )}
        <p className="mt-2 text-xs text-stone-500">숫자는 모두 DB 집계로 계산합니다.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-bold">전체 응답 선호 ({prefs.total}명)</h2>
          <Bars data={prefs.categories} list={CATEGORIES} total={prefs.total} />
        </div>
        <div className="card">
          <h2 className="mb-3 font-bold">이벤트 수</h2>
          <ul className="space-y-1 text-sm">{ev.map((e) => <li key={e.name} className="flex justify-between"><code>{e.name}</code><span className="tabular-nums">{Number(e.n)}</span></li>)}</ul>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-bold">최근 견적 요청 (영업 연결)</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-stone-500"><tr><th className="py-2">회사</th><th>담당</th><th>인원</th><th>연락처</th><th>요청 사항</th><th>일자</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {quotes.map((q) => (
              <tr key={q.id}><td className="py-2 font-medium">{q.company}</td><td>{q.manager}</td><td>{q.headcount}</td><td className="tabular-nums">{q.phone}</td><td className="text-stone-600">{q.note ?? "-"}</td><td>{new Date(q.createdAt).toLocaleDateString("ko-KR")}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
