import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listMySurveys } from "@/lib/services";
import { DECISION } from "@/lib/options";
import SurveyCreateForm from "@/components/SurveyCreateForm";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser();
  const list = await listMySurveys(user);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{user.company}의 간식 조사</h1>
        <p className="text-sm text-stone-500">조사를 만들고 링크를 직원 단톡방에 올려 주세요.</p>
      </div>
      <div className="card"><SurveyCreateForm /></div>
      <div className="card">
        <h2 className="mb-4 font-bold">내 조사</h2>
        {list.length === 0 ? (
          <p className="text-sm text-stone-500">아직 만든 조사가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {list.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <Link href={`/dashboard/surveys/${s.id}`} className="font-medium hover:text-brand-600">{s.title}</Link>
                  <p className="text-sm text-stone-500">
                    응답 {s.responseCount} / {s.headcount}명 · {new Date(s.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.quoted ? "bg-emerald-100 text-emerald-700" : s.responseCount >= DECISION.minResponses ? "bg-brand-100 text-brand-700" : "bg-stone-100 text-stone-500"}`}>
                  {s.quoted ? "견적 요청함" : s.responseCount >= DECISION.minResponses ? "결과 확인 가능" : "응답 모으는 중"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
