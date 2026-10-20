import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "스낵펄스 — 우리 사무실 간식 취향 조사",
  description: "직원 간식 취향을 3분 만에 모아 보는 무료 조사 도구 (가설 검증용 MVP)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-stone-400">
          지원 포트폴리오용 MVP · 데이터는 모두 가상입니다 · 강준영
        </footer>
      </body>
    </html>
  );
}
