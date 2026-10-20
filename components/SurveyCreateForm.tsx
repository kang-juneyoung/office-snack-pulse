"use client";
import { useActionState } from "react";
import { createSurveyAction } from "@/app/actions";

export default function SurveyCreateForm() {
  const [state, action, pending] = useActionState(createSurveyAction, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="title">조사 제목</label>
        <input id="title" name="title" className="input" defaultValue={state?.values?.title ?? "11월 탕비실 간식 취향 조사"} key={`t${state?.values?.title}`} required />
        {state?.fieldErrors?.title && <p className="err">{state.fieldErrors.title}</p>}
      </div>
      <div>
        <label className="label" htmlFor="headcount">직원 수</label>
        <input id="headcount" name="headcount" type="number" min={1} max={500} className="input" defaultValue={state?.values?.headcount ?? 20} key={`h${state?.values?.headcount}`} required />
        {state?.fieldErrors?.headcount && <p className="err">{state.fieldErrors.headcount}</p>}
      </div>
      <button className="btn" disabled={pending}>{pending ? "만드는 중…" : "조사 만들기"}</button>
      {state?.error && <p className="err sm:col-span-3">{state.error}</p>}
    </form>
  );
}
