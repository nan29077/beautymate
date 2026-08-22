import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSellerLive, sellerProfileImage } from "@/lib/sellerLive";
import { safeQuery } from "@/lib/safeDb";

export const dynamic = "force-dynamic";

// 로그인한 구매자가 찜(픽)한 뷰티 전문가 중 현재 라이브 중인 뷰티 전문가 목록 반환
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ sellers: [] });
  }

  const buyer = await safeQuery("단골 라이브 구매자", () => prisma.buyerProfile.findUnique({
    where: { userId: session.user.id },
  }), null, 3500);
  if (!buyer) {
    return NextResponse.json({ sellers: [] });
  }

  const follows = await safeQuery("단골 라이브 목록", () => prisma.sellerFollower.findMany({
    where: { buyerId: buyer.id },
    select: {
      seller: {
        select: {
          id: true,
          slug: true,
          shopName: true,
          shopLogo: true,
          mood: true,
          isManualLive: true,
          liveLink: true,
          user: { select: { avatar: true, name: true } },
          liveStreams: { where: { status: "LIVE" }, select: { id: true, shareCode: true }, take: 1 },
        },
      },
    },
  }), [], 3500);

  const liveSellers = follows
    .map(f => f.seller)
    .filter(s => isSellerLive(s))
    .map(s => ({
      id: s.id,
      slug: s.slug,
      shopName: s.shopName,
      name: s.user?.name || null,
      profileImage: sellerProfileImage(s),
      mood: s.mood,
      isLive: true,
      liveShareCode: s.liveStreams[0]?.shareCode || null,
      liveLink: s.liveLink || null,
    }));

  return NextResponse.json({ sellers: liveSellers });
}
