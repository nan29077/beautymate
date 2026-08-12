import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SellerMembersClient from "@/components/seller/SellerMembersClient";

export const dynamic = "force-dynamic";

// 상담사 점집 회원 목록 — 자기 점집 회원만 조회 (권한 검증은 API에서도 수행)
export default async function SellerMembersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") redirect("/");

  return <SellerMembersClient />;
}
