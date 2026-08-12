import { notFound } from "next/navigation";
import { getWidgetData } from "@/lib/widget";
import WidgetAlertClient from "@/components/widget/WidgetAlertClient";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
// /widget/[consultantId]/alert?date=YYYY-MM-DD
// 새 예약이 들어올 때만 잠깐 뜨는 알림 오버레이.
// 메인 위젯과 별도의 브라우저 소스로 추가해 상단 중앙에 배치한다.
// ─────────────────────────────────────────────

export default async function WidgetAlertPage({
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

  return <WidgetAlertClient initial={data} widgetKey={consultantId} />;
}
