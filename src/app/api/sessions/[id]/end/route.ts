import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError } from "@/lib/safeDb";
import { completeConsultingSession } from "@/lib/consultingSession";

export const dynamic = "force-dynamic";

// POST /api/sessions/[id]/end — 상담 종료 (뷰티 전문가·관리자 전용)
// body: { memo?: string } — 뷰티 전문가가 종료 시 남기는 고객 메모 (Reservation.consultantMemo 저장)
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
  const isAdmin = session.user.role === "SUPER_ADMIN";
  if (!isHost && !isAdmin) {
    return NextResponse.json({ error: "상담 종료 권한이 없습니다." }, { status: 403 });
  }

  let memo: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.memo === "string") memo = body.memo;
  } catch {
    // body 없는 호출 허용
  }

  const updated = await completeConsultingSession(id, { memo });
  if (!updated) {
    return NextResponse.json({ error: "세션 종료에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    session: {
      id: updated.id,
      status: updated.status,
      endedAt: updated.endedAt,
      duration: updated.duration,
    },
  });
}
