import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// /seller/* 전 구간 역할 가드.
// 뷰티 전문가 전용 화면(정산·고객 CRM 등)이므로 고객 계정은 접근할 수 없다.
// 최고관리자는 임시 로그인 없이도 화면을 확인할 수 있도록 기존 동작을 유지한다.
export default async function SellerSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = (session.user as any).role || "CUSTOMER";
  if (role !== "CONSULTANT" && role !== "SUPER_ADMIN" && role !== "SELLER") {
    redirect("/");
  }

  return <>{children}</>;
}
