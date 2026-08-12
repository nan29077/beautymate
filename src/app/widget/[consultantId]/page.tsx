import { notFound } from "next/navigation";
import { getWidgetData } from "@/lib/widget";
import LiveWidgetClient from "@/components/widget/LiveWidgetClient";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
// /widget/[consultantId]?date=YYYY-MM-DD
// 프리즘 라이브 스튜디오 / OBS 브라우저 소스로 붙여넣는 예약 현황 위젯.
// 인증 불필요(공개). 권장 크기: 너비 300 × 높이 400.
// ─────────────────────────────────────────────

export default async function LiveWidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ consultantId: string }> | { consultantId: string };
  searchParams?: Promise<{ date?: string }> | { date?: string };
}) {
  const { consultantId } = await Promise.resolve(params);
  const sp = (await Promise.resolve(searchParams)) ?? {};

  const data = await getWidgetData(consultantId, sp.date);
  if (!data) notFound();

  return <LiveWidgetClient initial={data} widgetKey={consultantId} />;
}
