import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminCustomersClient from "@/components/admin/AdminCustomersClient";

export const dynamic = "force-dynamic";

// 관리자 고객 귀속 관리 — 전체 고객의 귀속 상담사 조회/수정
export default async function AdminCustomersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/");

  return <AdminCustomersClient />;
}
