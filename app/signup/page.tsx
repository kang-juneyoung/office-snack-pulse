import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { signupAction } from "@/app/actions";

export default function Signup() {
  return (
    <div className="mx-auto max-w-md card">
      <h1 className="mb-1 text-2xl font-bold">총무 담당자 가입</h1>
      <p className="mb-6 text-sm text-stone-500">조사를 만들고 결과를 보는 분만 가입합니다. 직원은 가입 없이 답해요.</p>
      <AuthForm
        action={signupAction}
        submit="가입하고 조사 만들기"
        fields={[
          { name: "company", label: "회사명" },
          { name: "name", label: "이름" },
          { name: "email", label: "회사 이메일", type: "email", autoComplete: "email" },
          { name: "password", label: "비밀번호 (8자 이상)", type: "password", autoComplete: "new-password" },
        ]}
      />
      <p className="mt-4 text-center text-sm text-stone-500">이미 계정이 있나요? <Link href="/login" className="text-brand-600">로그인</Link></p>
    </div>
  );
}
