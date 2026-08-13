import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// DELETE /api/timeslots/[id] — 슬롯 삭제 (예약 없는 경우만)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "상담사만 예약 시간을 삭제할 수 있습니다." }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);

  const slot = await prisma.timeSlot.findUnique({ where: { id } });
  if (!slot) {
    return NextResponse.json({ error: "예약 시간을 찾을 수 없습니다." }, { status: 404 });
  }
  if (slot.consultantId !== session.user.id) {
    return NextResponse.json({ error: "본인이 등록한 시간만 삭제할 수 있습니다." }, { status: 403 });
  }
  if (slot.reservationId) {
    return NextResponse.json({ error: "이미 예약이 잡힌 시간은 삭제할 수 없습니다." }, { status: 400 });
  }

  await prisma.timeSlot.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// PATCH /api/timeslots/[id] — 슬롯 활성화/비활성화
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "상담사만 예약 시간을 수정할 수 있습니다." }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
  const body = await request.json();

  const slot = await prisma.timeSlot.findUnique({ where: { id } });
  if (!slot) {
    return NextResponse.json({ error: "예약 시간을 찾을 수 없습니다." }, { status: 404 });
  }
  if (slot.consultantId !== session.user.id) {
    return NextResponse.json({ error: "본인이 등록한 시간만 수정할 수 있습니다." }, { status: 403 });
  }
  if (slot.reservationId) {
    return NextResponse.json({ error: "예약이 잡힌 시간은 수정할 수 없습니다." }, { status: 400 });
  }

  const updated = await prisma.timeSlot.update({
    where: { id },
    data: { isAvailable: body.isAvailable ?? slot.isAvailable },
  });

  return NextResponse.json({ slot: updated });
}
