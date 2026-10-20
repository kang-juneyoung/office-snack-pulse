"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";

type Field = { name: string; label: string; type?: string; autoComplete?: string };

export default function AuthForm({ action, fields, submit }: { action: (s: FormState, fd: FormData) => Promise<FormState>; fields: Field[]; submit: string }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name}>
          <label className="label" htmlFor={f.name}>{f.label}</label>
          <input id={f.name} name={f.name} type={f.type ?? "text"} autoComplete={f.autoComplete} className="input" required defaultValue={f.type === "password" ? undefined : state?.values?.[f.name]} key={state?.values?.[f.name] ?? ""} />
          {state?.fieldErrors?.[f.name] && <p className="err">{state.fieldErrors[f.name]}</p>}
        </div>
      ))}
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "처리 중…" : submit}</button>
    </form>
  );
}
