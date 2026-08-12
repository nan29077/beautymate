import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError } from "@/lib/safeDb";

export const dynamic = "force-dynamic";

// POST /api/sessions/[id]/start — 상담 시작 (WAITING → ACTIVE)
// 상담사·고객 중 먼저 입장해 통화가 시작될 때 호출한다. 멱등.
export async function POST(
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
            userId: true,
            seller: { select: { user: { select: { id: true } } } },
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

  const isHost = cs.reservation.seller.user.id === session.user.id;
  const isGuest = cs.reservation.userId === session.user.id;
  if (!isHost && !isGuest && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  if (cs.status === "COMPLETED" || cs.status === "CANCELLED") {
    return NextResponse.json({ error: "이미 종료된 상담입니다." }, { status: 400 });
  }

  if (cs.status === "ACTIVE") {
    return NextResponse.json({ session: { id: cs.id, status: cs.status, startedAt: cs.startedAt } });
  }

  const updated = await prisma.consultingSession.update({
    where: { id },
    data: { status: "ACTIVE", startedAt: cs.startedAt ?? new Date() },
  });

  return NextResponse.json({
    session: { id: updated.id, status: updated.status, startedAt: updated.startedAt },
  });
}
