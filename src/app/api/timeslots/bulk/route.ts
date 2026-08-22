import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError } from "@/lib/safeDb";

export const dynamic = "force-dynamic";

// POST /api/timeslots/bulk — 일괄 생성
// body: { dates: string[], startHour: number, endHour: number, intervalMinutes: number, durationMinutes: number }
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "뷰티 전문가만 예약 시간을 등록할 수 있습니다." }, { status: 403 });
  }

  const body = await request.json();
  const {
    dates,
    startHour = 9,
    endHour = 18,
    intervalMinutes = 60,
    durationMinutes = 60,
  }: {
    dates: string[];
    startHour: number;
    endHour: number;
    intervalMinutes: number;
    durationMinutes: number;
  } = body;

  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: "dates 배열이 필요합니다." }, { status: 400 });
  }
  if (dates.length > 31) {
    return NextResponse.json({ error: "최대 31일까지 일괄 생성 가능합니다." }, { status: 400 });
  }
  // 시간 파라미터 검증 — 0/음수 간격은 무한 루프, 과대 범위는 대량 행 생성으로 이어짐
  if (
    !Number.isInteger(startHour) || !Number.isInteger(endHour) ||
    !Number.isInteger(intervalMinutes) || !Number.isInteger(durationMinutes) ||
    startHour < 0 || startHour > 23 || endHour < 1 || endHour > 24 || startHour >= endHour ||
    intervalMinutes < 5 || intervalMinutes > 24 * 60 ||
    durationMinutes < 5 || durationMinutes > 24 * 60
  ) {
    return NextResponse.json({ error: "시간 설정 값이 올바르지 않습니다." }, { status: 400 });
  }

  const slotData: {
    consultantId: string;
    date: Date;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[] = [];

  for (const dateStr of dates) {
    const date = new Date(dateStr + "T00:00:00.000Z");
    let current = startHour * 60; // 분 단위

    while (current + durationMinutes <= endHour * 60) {
      const startH = Math.floor(current / 60).toString().padStart(2, "0");
      const startM = (current % 60).toString().padStart(2, "0");
      const endMin = current + durationMinutes;
      const endH = Math.floor(endMin / 60).toString().padStart(2, "0");
      const endMStr = (endMin % 60).toString().padStart(2, "0");

      slotData.push({
        consultantId: session.user.id,
        date,
        startTime: `${startH}:${startM}`,
        endTime: `${endH}:${endMStr}`,
        isAvailable: true,
      });

      current += intervalMinutes;
    }
  }

  // createMany + skipDuplicates
  try {
    const result = await prisma.timeSlot.createMany({
      data: slotData,
      skipDuplicates: true,
    });
    return NextResponse.json({ created: result.count }, { status: 201 });
  } catch (err) {
    if (isMissingSchemaError(err)) {
      return NextResponse.json(
        { error: "예약 시간 저장소가 아직 준비되지 않았습니다. 관리자에게 문의해 주세요." },
        { status: 503 },
      );
    }
    throw err;
  }
}
