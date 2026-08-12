import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminSessionsClient from "@/components/admin/AdminSessionsClient";

export const dynamic = "force-dynamic";

// 관리자 영상 세션 관리 — 목록·실시간 모니터링·강제 종료
export default async function AdminSessionsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/");

  return <AdminSessionsClient />;
}
