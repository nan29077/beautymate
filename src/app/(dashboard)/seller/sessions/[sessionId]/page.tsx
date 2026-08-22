import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import VideoSessionRoom from "@/components/sessions/VideoSessionRoom";

export const dynamic = "force-dynamic";

// 뷰티 전문가용 1:1 영상 상담실 — 권한·소유권 검증은 /api/sessions/[id] 에서 수행
export default async function SellerSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }> | { sessionId: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") redirect("/");

  const { sessionId } = await Promise.resolve(params);

  return (
    <VideoSessionRoom
      sessionId={sessionId}
      backHref="/seller/reservations"
      backLabel="예약 관리로 돌아가기"
    />
  );
}
