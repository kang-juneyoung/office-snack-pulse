import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { loginAction } from "@/app/actions";

export default function Login() {
  return (
    <div className="mx-auto max-w-md card">
      <h1 className="mb-6 text-2xl font-bold">로그인</h1>
      <AuthForm
        action={loginAction}
        submit="로그인"
        fields={[
          { name: "email", label: "이메일", type: "email", autoComplete: "email" },
          { name: "password", label: "비밀번호", type: "password", autoComplete: "current-password" },
        ]}
      />
      <p className="mt-4 text-center text-sm text-stone-500">처음이신가요? <Link href="/signup" className="text-brand-600">가입하기</Link></p>
    </div>
  );
}
