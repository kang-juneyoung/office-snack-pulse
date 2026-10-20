"use client";
import Link from "next/link";
import { trackAction } from "@/app/actions";

export default function CtaLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn" onClick={() => { trackAction("cta_click").catch(() => {}); }}>
      {children}
    </Link>
  );
}
