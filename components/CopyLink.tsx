"use client";
import { useState } from "react";
import { trackAction } from "@/app/actions";

export default function CopyLink({ path, surveyId }: { path: string; surveyId: number }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  return (
    <div className="flex gap-2">
      <input className="input font-mono text-sm" readOnly value={url} aria-label="직원 공유 링크" />
      <button
        type="button"
        className="btn shrink-0"
        onClick={async () => {
          await navigator.clipboard?.writeText(url).catch(() => {});
          setCopied(true);
          trackAction("share_link_copied", surveyId).catch(() => {});
        }}
      >
        {copied ? "복사됨" : "링크 복사"}
      </button>
    </div>
  );
}
