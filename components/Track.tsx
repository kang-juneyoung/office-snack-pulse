"use client";
import { useEffect, useRef } from "react";
import { trackAction } from "@/app/actions";

// 화면 조회 이벤트를 한 번만 기록한다.
export default function Track({ name, surveyId }: { name: string; surveyId?: number }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackAction(name, surveyId).catch(() => {});
  }, [name, surveyId]);
  return null;
}
