import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SellerWidgetClient from "@/components/seller/SellerWidgetClient";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
// /seller/widget — 뷰티 전문가가 프리즘/OBS 위젯 URL·예약 URL·QR 을 확인하고 복사하는 페이지.
// ─────────────────────────────────────────────

export default async function SellerWidgetPage() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "CONSULTANT") redirect("/");

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { slug: true, shopName: true },
  });
  if (!seller) redirect("/");

  // 뷰티 전문가에게 안내할 절대 URL 의 기준 도메인. 클라이언트에서 현재 origin 으로 보정한다.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://beautymate.co.kr";

  return (
    <SellerWidgetClient
      consultantId={session.user.id}
      slug={seller.slug}
      shopName={seller.shopName}
      baseUrl={baseUrl}
    />
  );
}
