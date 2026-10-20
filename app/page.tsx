import Link from "next/link";
import Track from "@/components/Track";
import CtaLink from "@/components/CtaLink";

export default function Landing() {
  return (
    <div className="space-y-12">
      <Track name="landing_view" />
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <p className="mb-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">총무·인사 담당자용 · 무료</p>
          <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">
            간식 계약 전에,<br />직원들이 뭘 원하는지 먼저 알아보세요
          </h1>
          <p className="mt-4 text-stone-600">
            링크 하나만 단톡방에 올리면 직원들이 30초 만에 답합니다. 선호 간식·예산·배송 주기를 자동으로 집계해 드려요.
          </p>
          <div className="mt-6 flex gap-3">
            <CtaLink href="/signup">조사 만들기 (3분)</CtaLink>
            <Link href="/login" className="btn-ghost">로그인</Link>
          </div>
        </div>
        <div className="card">
          <p className="mb-4 text-sm font-semibold text-stone-500">예시 결과 · 직원 24명 중 19명 응답</p>
          {[
            ["음료·커피", 79],
            ["과자·쿠키", 63],
            ["견과·건강 간식", 47],
            ["아침 대용(빵·시리얼)", 37],
          ].map(([k, v]) => (
            <div key={k} className="mb-3">
              <div className="mb-1 flex justify-between text-sm"><span>{k}</span><span className="text-stone-500">{v}%</span></div>
              <div className="h-2.5 rounded-full bg-stone-100"><div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${v}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["1. 조사 만들기", "회사 인원만 입력하면 직원용 링크가 생깁니다."],
          ["2. 링크 공유", "로그인 없이 익명으로 답해요. 이름·연락처는 받지 않습니다."],
          ["3. 결과 보고 견적", "응답이 모이면 결과를 보고, 원하면 바로 견적을 받아 보세요."],
        ].map(([t, d]) => (
          <div key={t} className="card"><h3 className="font-bold">{t}</h3><p className="mt-2 text-sm text-stone-600">{d}</p></div>
        ))}
      </section>
    </div>
  );
}
