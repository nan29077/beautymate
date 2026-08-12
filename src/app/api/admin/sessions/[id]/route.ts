import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError } from "@/lib/safeDb";
import { getRoomInfo } from "@/lib/daily";
import { completeConsultingSession } from "@/lib/consultingSession";

export const dynamic = "force-dynamic";

// GET /api/admin/sessions/[id] — 세션 상세 + Daily 룸 실시간 참여자 수 (관리자 전용)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
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
            reservationDate: true,
            reservationTime: true,
            customerName: true,
            customerPhone: true,
            status: true,
            seller: {
              select: { shopName: true, user: { select: { name: true } } },
            },
            items: { select: { productName: true } },
          },
        },
      },
    });
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return NextResponse.json(
        { error: "영상 상담 기능이 아직 준비 중입니다." },
        { status: 503 },
      );
    }
    throw e;
  }

  if (!cs) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  }

  // 진행 중 세션이면 Daily 룸 참여자 수 조회
  const roomInfo =
    cs.status === "ACTIVE" || cs.status === "WAITING"
      ? await getRoomInfo(cs.roomName)
      : null;

  return NextResponse.json({
    session: {
      id: cs.id,
      status: cs.status,
      roomName: cs.roomName,
      startedAt: cs.startedAt,
      endedAt: cs.endedAt,
      duration: cs.duration,
      createdAt: cs.createdAt,
      participantCount: roomInfo?.participantCount ?? null,
      reservation: {
        id: cs.reservation.id,
        reservationNumber: cs.reservation.reservationNumber,
        reservationDate: cs.reservation.reservationDate,
        reservationTime: cs.reservation.reservationTime,
        customerName: cs.reservation.customerName,
        customerPhone: cs.reservation.customerPhone,
        status: cs.reservation.status,
        shopName: cs.reservation.seller.shopName,
        consultantName: cs.reservation.seller.user.name,
        productName: cs.reservation.items[0]?.productName ?? null,
      },
    },
  });
}

// POST /api/admin/sessions/[id] — 세션 강제 종료 (관리자 전용)
// body: { action: "force-end", cancelled?: boolean }
//   cancelled=true 면 예약 상태는 건드리지 않고 세션만 CANCELLED 처리
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);

  let body: { action?: string; cancelled?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // body 없는 호출 허용
  }

  if (body.action !== "force-end") {
    return NextResponse.json({ error: "지원하지 않는 action 입니다." }, { status: 400 });
  }

  try {
    const updated = await completeConsultingSession(id, {
      cancelled: body.cancelled === true,
    });
    if (!updated) {
      return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({
      session: {
        id: updated.id,
        status: updated.status,
        endedAt: updated.endedAt,
        duration: updated.duration,
      },
    });
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return NextResponse.json(
        { error: "영상 상담 기능이 아직 준비 중입니다." },
        { status: 503 },
      );
    }
    throw e;
  }
}
