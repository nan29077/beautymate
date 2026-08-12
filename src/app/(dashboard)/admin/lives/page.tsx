import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminLivesClient from "@/components/admin/AdminLivesClient";

export const dynamic = "force-dynamic";

// 관리자 라이브 관리 — 전체 라이브 목록·방송별 예약 현황
export default async function AdminLivesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/");

  return <AdminLivesClient />;
}
