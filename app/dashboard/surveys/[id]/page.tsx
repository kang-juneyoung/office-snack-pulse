import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getResults, AppError } from "@/lib/services";
import { CATEGORIES, BUDGETS, FREQUENCIES, DECISION, labelOf } from "@/lib/options";
import { leaders } from "@/lib/metrics";
import Bars from "@/components/Bars";
import CopyLink from "@/components/CopyLink";
import QuoteForm from "@/components/QuoteForm";
import Track from "@/components/Track";

export const dynamic = "force-dynamic";

export default async function SurveyResult({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  let r;
  try {
    r = await getResults(user, id);
  } catch (e) {
    if (e instanceof AppError) notFound(); // 남의 조사인지 여부도 드러내지 않는다
    throw e;
  }
  const names = (t: typeof r.categories, list: Parameters<typeof labelOf>[0]) => leaders(t).map((x) => labelOf(list, x.id)).join(", ") || "-";
  const top = r.categories[0];
  return (
    <div className="space-y-6">
      <Track name="results_view" surveyId={r.survey.id} />
      <Link href="/dashboard" className="text-sm text-stone-500 hover:text-stone-900">← 내 조사</Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{r.survey.title}</h1>
          <p className="text-stone-500">응답 {r.responseCount} / {r.survey.headcount}명 ({Math.round(r.responseRate * 100)}%)</p>
        </div>
      </div>
      <div className="card">
        <h2 className="mb-2 font-bold">직원 공유 링크</h2>
        <CopyLink path={`/s/${r.survey.token}`} surveyId={r.survey.id} />
        <p className="mt-2 text-xs text-stone-500">로그인 없이 익명으로 답합니다. 이름·연락처는 수집하지 않아요.</p>
      </div>
      {!r.ready ? (
        <div className="card text-stone-600">
          응답이 {DECISION.minResponses}건 이상 모이면 결과를 보여 드려요. (현재 {r.responseCount}건)
        </div>
      ) : (
        <>
          <div className="card bg-brand-50">
            <p className="text-sm text-brand-700">한 줄 요약</p>
            <p className="mt-1 text-lg font-bold">
              가장 많이 원한 간식: {names(r.categories, CATEGORIES)}{top ? ` (${Math.round(top.share * 100)}%)` : ""} · 예산: {names(r.budgets, BUDGETS)} · 주기: {names(r.frequencies, FREQUENCIES)}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card md:col-span-1"><h3 className="mb-3 font-bold">선호 간식 (복수 선택)</h3><Bars data={r.categories} list={CATEGORIES} total={r.responseCount} /></div>
            <div className="card"><h3 className="mb-3 font-bold">1인 예산</h3><Bars data={r.budgets} list={BUDGETS} total={r.responseCount} /></div>
            <div className="card"><h3 className="mb-3 font-bold">배송 주기</h3><Bars data={r.frequencies} list={FREQUENCIES} total={r.responseCount} /></div>
          </div>
          {r.comments.length > 0 && (
            <div className="card">
              <h3 className="mb-3 font-bold">직원 한마디</h3>
              <ul className="space-y-2 text-sm text-stone-700">{r.comments.map((c, i) => <li key={i}>“{c}”</li>)}</ul>
            </div>
          )}
        </>
      )}
      {r.survey.ownerId === user.id && (
        <div className="card">
          <h2 className="mb-1 font-bold">이 결과로 간식 정기배송 견적 받기</h2>
          <p className="mb-4 text-sm text-stone-500">조사 결과를 바탕으로 맞춤 구성을 제안해 드립니다.</p>
          {r.quote ? <p className="rounded-xl bg-emerald-50 p-4 text-emerald-700">견적 요청 완료 ({new Date(r.quote.createdAt).toLocaleDateString("ko-KR")})</p> : <QuoteForm surveyId={r.survey.id} />}
        </div>
      )}
    </div>
  );
}
