import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/timeslots?consultantId=&date=YYYY-MM-DD — 가용 슬롯 조회 (공개)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const consultantId = url.searchParams.get("consultantId"); // User.id
  const date = url.searchParams.get("date"); // YYYY-MM-DD
  const month = url.searchParams.get("month"); // YYYY-MM (월별 유무 확인용)
  const allSlots = url.searchParams.get("all") === "true"; // 상담사 관리용: 전체 슬롯

  if (!consultantId) {
    return NextResponse.json({ error: "consultantId가 필요합니다." }, { status: 400 });
  }

  if (month) {
    // 해당 월의 슬롯 있는 날짜 목록
    const [year, mon] = month.split("-").map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59);

    const slots = await prisma.timeSlot.findMany({
      where: {
        consultantId,
        date: { gte: start, lte: end },
        ...(allSlots ? {} : { isAvailable: true }),
      },
      select: { date: true, isAvailable: true, reservationId: true },
    });

    // 날짜별 슬롯 통계
    const dateMap: Record<string, { total: number; available: number }> = {};
    for (const s of slots) {
      const key = s.date.toISOString().slice(0, 10);
      if (!dateMap[key]) dateMap[key] = { total: 0, available: 0 };
      dateMap[key].total++;
      if (s.isAvailable) dateMap[key].available++;
    }
    return NextResponse.json({ dateMap });
  }

  if (date) {
    const start = new Date(date + "T00:00:00.000Z");
    const end = new Date(date + "T23:59:59.999Z");

    const slots = await prisma.timeSlot.findMany({
      where: {
        consultantId,
        date: { gte: start, lte: end },
        ...(allSlots ? {} : { isAvailable: true }),
      },
      orderBy: { startTime: "asc" },
      include: allSlots
        ? { reservation: { select: { id: true, customerName: true, status: true } } }
        : undefined,
    });

    return NextResponse.json({
      slots: slots.map((s) => ({
        ...s,
        date: s.date.toISOString(),
      })),
    });
  }

  return NextResponse.json({ error: "date 또는 month 파라미터가 필요합니다." }, { status: 400 });
}

// POST /api/timeslots — 슬롯 생성 (상담사 본인만)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "상담사만 슬롯을 생성할 수 있습니다." }, { status: 403 });
  }

  const body = await request.json();
  const { date, startTime, endTime } = body;

  if (!date || !startTime || !endTime) {
    return NextResponse.json({ error: "date, startTime, endTime이 필요합니다." }, { status: 400 });
  }

  try {
    const slot = await prisma.timeSlot.create({
      data: {
        consultantId: session.user.id,
        date: new Date(date + "T00:00:00.000Z"),
        startTime,
        endTime,
        isAvailable: true,
      },
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "";
    if (errMsg.includes("Unique constraint")) {
      return NextResponse.json({ error: "이미 해당 시간에 슬롯이 존재합니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "슬롯 생성에 실패했습니다." }, { status: 500 });
  }
}
