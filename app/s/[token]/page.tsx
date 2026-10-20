import { notFound } from "next/navigation";
import { getPublicSurvey } from "@/lib/services";
import ResponseForm from "@/components/ResponseForm";
import Track from "@/components/Track";

export const dynamic = "force-dynamic";

export default async function PublicSurvey({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(token)) notFound();
  const s = await getPublicSurvey(token);
  if (!s) notFound();
  return (
    <div className="mx-auto max-w-lg card">
      <Track name="survey_view" surveyId={s.id} />
      <p className="text-sm font-semibold text-brand-600">{s.company}</p>
      <h1 className="mb-1 mt-1 text-2xl font-bold">{s.title}</h1>
      <p className="mb-6 text-sm text-stone-500">30초면 끝나요. 이름은 묻지 않습니다.</p>
      <ResponseForm token={token} />
    </div>
  );
}
