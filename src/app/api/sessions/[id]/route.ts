import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError } from "@/lib/safeDb";
import { isDailyConfigured } from "@/lib/daily";

export const dynamic = "force-dynamic";

const schemaDriftResponse = () =>
  NextResponse.json(
    { error: "영상 상담 기능이 아직 준비 중입니다. 잠시 후 다시 시도해 주세요." },
    { status: 503 },
  );

// GET /api/sessions/[id] — 세션 상세 + 역할별 입장 토큰
// 상담사(host)는 hostToken, 고객(guest)은 guestToken 만 받는다.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await Promise.resolve(params);

  let cs;
  try {
    cs = await prisma.consultingSession.findUnique({
      where: { id },
      include: {
        reservation: {
          select: {
            id: true,
            reservationNumber: true,
            userId: true,
            sellerId: true,
            status: true,
            reservationDate: true,
            reservationTime: true,
            customerName: true,
            customerPhone: true,
            birthDate: true,
            birthTime: true,
            gender: true,
            consultingContent: true,
            consultantMemo: true,
            seller: {
              select: {
                shopName: true,
                slug: true,
                user: { select: { id: true, name: true, avatar: true } },
              },
            },
            items: { select: { productName: true, productId: true, itemType: true } },
          },
        },
      },
    });
  } catch (e) {
    if (isMissingSchemaError(e)) return schemaDriftResponse();
    throw e;
  }

  if (!cs) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  }

  const role = session.user.role;
  const isHost = cs.reservation.seller.user.id === session.user.id;
  const isGuest = cs.reservation.userId === session.user.id;
  const isAdmin = role === "SUPER_ADMIN";

  if (!isHost && !isGuest && !isAdmin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  // 예약 시간(분) 조회 — 화면 타이머용
  let durationMinutes = 30;
  try {
    const item = cs.reservation.items[0];
    if (item?.itemType === "PRODUCT") {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { durationMinutes: true },
      });
      if (product?.durationMinutes) durationMinutes = product.durationMinutes;
    }
  } catch (e) {
    if (!isMissingSchemaError(e)) throw e;
  }

  const viewerRole = isHost ? "host" : isGuest ? "guest" : "admin";

  return NextResponse.json({
    session: {
      id: cs.id,
      status: cs.status,
      roomUrl: cs.roomUrl,
      roomName: cs.roomName,
      startedAt: cs.startedAt,
      endedAt: cs.endedAt,
      duration: cs.duration,
      createdAt: cs.createdAt,
      // 본인 역할의 토큰만 노출 (admin 은 host 권한으로 참관)
      token: isGuest && !isHost ? cs.guestToken : cs.hostToken,
      isDemo: !isDailyConfigured(),
      viewerRole,
      durationMinutes,
      reservation: {
        id: cs.reservation.id,
        reservationNumber: cs.reservation.reservationNumber,
        status: cs.reservation.status,
        reservationDate: cs.reservation.reservationDate,
        reservationTime: cs.reservation.reservationTime,
        customerName: cs.reservation.customerName,
        // 고객 개인정보(연락처·사주 정보)는 상담사/관리자에게만
        ...(isHost || isAdmin
          ? {
              customerPhone: cs.reservation.customerPhone,
              birthDate: cs.reservation.birthDate,
              birthTime: cs.reservation.birthTime,
              gender: cs.reservation.gender,
              consultingContent: cs.reservation.consultingContent,
              consultantMemo: cs.reservation.consultantMemo,
            }
          : {}),
        productName: cs.reservation.items[0]?.productName ?? null,
        shopName: cs.reservation.seller.shopName,
        shopSlug: cs.reservation.seller.slug,
        consultantName: cs.reservation.seller.user.name,
        consultantAvatar: cs.reservation.seller.user.avatar,
      },
    },
  });
}
