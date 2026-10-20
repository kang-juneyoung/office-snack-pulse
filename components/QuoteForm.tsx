"use client";
import { useActionState } from "react";
import { requestQuoteAction, type FormState } from "@/app/actions";

export default function QuoteForm({ surveyId }: { surveyId: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestQuoteAction.bind(null, surveyId), undefined);
  if (state?.ok) return <p className="rounded-xl bg-emerald-50 p-4 text-emerald-700">견적 요청이 접수됐습니다. 담당자가 영업일 1일 안에 연락드려요.</p>;
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="contactPhone">연락받을 번호</label>
        <input id="contactPhone" name="contactPhone" className="input" placeholder="010-0000-0000" required defaultValue={state?.values?.contactPhone} key={`p${state?.values?.contactPhone}`} />
        {state?.fieldErrors?.contactPhone && <p className="err">{state.fieldErrors.contactPhone}</p>}
      </div>
      <div>
        <label className="label" htmlFor="note">요청 사항 (선택)</label>
        <textarea id="note" name="note" className="input" rows={2} placeholder="예: 매주 화요일 오전 배송 희망" defaultValue={state?.values?.note} key={`n${state?.values?.note}`} />
      </div>
      {state?.error && <p className="err">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "보내는 중…" : "이 결과로 견적 받기"}</button>
    </form>
  );
}
