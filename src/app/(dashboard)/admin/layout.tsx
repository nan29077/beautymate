import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// /admin/* 전 구간 역할 가드.
// 개별 페이지마다 role 검사를 넣어 왔는데 일부 페이지(문의·고객지원 설정·라이브 뷰티
// 서비스 관리 등)에 검사가 빠져 있어, CONSULTANT 계정이 URL 을 직접 입력하면
// 관리자 전용 화면(회원 목록·정산 등)이 그대로 열렸다. 레이아웃에서 한 번에 막는다.
export default async function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = (session.user as any).role || "CUSTOMER";
  if (role !== "SUPER_ADMIN") {
    // 뷰티 전문가는 본인 대시보드로, 그 외에는 홈으로 돌려보낸다.
    redirect(role === "CONSULTANT" ? "/seller" : "/");
  }

  return <>{children}</>;
}
