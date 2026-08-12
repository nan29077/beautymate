import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminLiveDetailClient from "@/components/admin/AdminLiveDetailClient";

export const dynamic = "force-dynamic";

// 관리자 라이브 상세 — 방송 정보 + 방송 유래 예약 목록·상태별 집계
export default async function AdminLiveDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/");

  return <AdminLiveDetailClient liveId={params.id} />;
}
