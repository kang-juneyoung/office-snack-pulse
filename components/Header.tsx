import Link from "next/link";
import { getSession } from "@/lib/session";
import { logoutAction } from "@/app/actions";

export default async function Header() {
  const u = await getSession();
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-extrabold tracking-tight">
          <span className="text-brand-500">●</span> 스낵펄스
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {u ? (
            <>
              {u.role === "staff" && <Link href="/admin" className="font-medium hover:text-brand-600">검증 대시보드</Link>}
              <Link href="/dashboard" className="font-medium hover:text-brand-600">내 조사</Link>
              <span className="hidden text-stone-500 sm:inline">{u.company} · {u.name}</span>
              <form action={logoutAction}><button className="text-stone-500 hover:text-stone-900">로그아웃</button></form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-brand-600">로그인</Link>
              <Link href="/signup" className="btn py-1.5">무료로 시작</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
