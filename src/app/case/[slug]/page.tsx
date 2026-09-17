import { notFound } from "next/navigation";
import { getCaseData } from "@/actions/get-case-action";
import { CaseDetailClient } from "@/components/case/CaseDetailClient";


interface CasePageProps {
  params: Promise<{ slug: string }>;
}

export default async function CaseDetailPage({ params }: CasePageProps) {
  const { slug } = await params;
  const caseData = await getCaseData(slug);

  if (!caseData) {
    notFound();
  }

  return <CaseDetailClient caseId={slug} initialCase={caseData} />;
}
