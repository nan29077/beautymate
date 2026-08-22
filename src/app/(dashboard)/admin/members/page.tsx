import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminMembershipsClient from "@/components/admin/AdminMembershipsClient";

export const dynamic = "force-dynamic";

// 관리자 뷰티샵 회원 관리 — 전체 조회·해제
export default async function AdminMembersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/");

  return <AdminMembershipsClient />;
}
