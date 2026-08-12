import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import VideoSessionRoom from "@/components/sessions/VideoSessionRoom";

export const dynamic = "force-dynamic";

// 고객용 1:1 영상 상담실 — 본인 예약 검증은 /api/sessions/[id] 에서 수행
export default async function MySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }> | { sessionId: string };
}) {
  const session = await auth();
  const { sessionId } = await Promise.resolve(params);
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/my/sessions/${sessionId}`)}`);
  }

  return (
    <VideoSessionRoom
      sessionId={sessionId}
      backHref="/my/reservations"
      backLabel="예약 내역으로 돌아가기"
    />
  );
}
