"use client";
import { useActionState, useState } from "react";
import { submitResponseAction, type FormState } from "@/app/actions";
import { CATEGORIES, BUDGETS, FREQUENCIES } from "@/lib/options";

export default function ResponseForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitResponseAction.bind(null, token), undefined);
  const [picked, setPicked] = useState<string[]>([]);
  if (state?.ok) {
    return (
      <div className="py-10 text-center">
        <p className="text-4xl">🙌</p>
        <p className="mt-3 text-xl font-bold">응답해 주셔서 고마워요!</p>
        <p className="mt-1 text-stone-500">결과는 담당자가 간식 구성에 반영합니다.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="mb-2 font-semibold">1. 어떤 간식을 원하세요? <span className="text-sm font-normal text-stone-500">(최대 3개)</span></legend>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => {
            const on = picked.includes(c.id);
            return (
              <label key={c.id} className={`cursor-pointer rounded-xl border px-3 py-3 text-sm ${on ? "border-brand-500 bg-brand-50 font-semibold" : "border-stone-300"}`}>
                <input
                  type="checkbox"
                  name="categories"
                  value={c.id}
                  className="sr-only"
                  checked={on}
                  onChange={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : p.length < 3 ? [...p, c.id] : p))}
                />
                {c.label}
              </label>
            );
          })}
        </div>
        {state?.fieldErrors?.categories && <p className="err">{state.fieldErrors.categories}</p>}
      </fieldset>
      {([["budget", "2. 1인당 한 달 간식 예산은 어느 정도가 적당할까요?", BUDGETS], ["frequency", "3. 얼마나 자주 채워지면 좋을까요?", FREQUENCIES]] as const).map(([name, q, list]) => (
        <fieldset key={name}>
          <legend className="mb-2 font-semibold">{q}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {list.map((o) => (
              <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-300 px-3 py-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input type="radio" name={name} value={o.id} required className="accent-brand-500" defaultChecked={state?.values?.[name] === o.id} key={`${o.id}${state?.values?.[name]}`} />
                {o.label}
              </label>
            ))}
          </div>
          {state?.fieldErrors?.[name] && <p className="err">{state.fieldErrors[name]}</p>}
        </fieldset>
      ))}
      <div>
        <label className="mb-2 block font-semibold" htmlFor="comment">4. 한마디 (선택)</label>
        <input id="comment" name="comment" maxLength={200} className="input" placeholder="예: 제로 음료가 있으면 좋겠어요" defaultValue={state?.values?.comment} key={`c${state?.values?.comment}`} />
      </div>
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <button className="btn w-full py-3" disabled={pending || picked.length === 0}>{pending ? "보내는 중…" : "응답 보내기"}</button>
    </form>
  );
}
