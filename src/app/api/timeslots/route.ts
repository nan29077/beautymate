import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeQuery, isMissingSchemaError } from "@/lib/safeDb";

export const dynamic = "force-dynamic";

// GET /api/timeslots?consultantId=&date=YYYY-MM-DD — 가용 슬롯 조회 (공개)
// 단, all=true(예약자 정보 포함 전체 슬롯)는 해당 뷰티 전문가 본인·관리자만 허용
export async function GET(request: Request) {
  const url = new URL(request.url);
  const consultantId = url.searchParams.get("consultantId"); // User.id
  const date = url.searchParams.get("date"); // YYYY-MM-DD
  const month = url.searchParams.get("month"); // YYYY-MM (월별 유무 확인용)
  const allSlots = url.searchParams.get("all") === "true"; // 뷰티 전문가 관리용: 전체 슬롯

  if (!consultantId) {
    return NextResponse.json({ error: "consultantId가 필요합니다." }, { status: 400 });
  }

  // all=true 응답에는 예약 고객명이 포함되므로 본인(뷰티 전문가)·관리자 외에는 거부
  if (allSlots) {
    const session = await auth();
    const role = session?.user?.role;
    const isOwner = !!session?.user && session.user.id === consultantId && role === "CONSULTANT";
    if (!isOwner && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
  }

  if (month) {
    // 해당 월의 슬롯 있는 날짜 목록
    const [year, mon] = month.split("-").map(Number);
    if (!Number.isInteger(year) || !Number.isInteger(mon) || mon < 1 || mon > 12) {
      return NextResponse.json({ error: "month 형식이 올바르지 않습니다. (YYYY-MM)" }, { status: 400 });
    }
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59);

    const slots = await safeQuery("timeslots month list", () =>
      prisma.timeSlot.findMany({
        where: {
          consultantId,
          date: { gte: start, lte: end },
          ...(allSlots ? {} : { isAvailable: true }),
        },
        select: { date: true, isAvailable: true, reservationId: true },
      }), []);

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

    const slots = await safeQuery("timeslots day list", () =>
      prisma.timeSlot.findMany({
        where: {
          consultantId,
          date: { gte: start, lte: end },
          ...(allSlots ? {} : { isAvailable: true }),
        },
        orderBy: { startTime: "asc" },
        include: allSlots
          ? { reservation: { select: { id: true, customerName: true, status: true } } }
          : undefined,
      }), []);

    return NextResponse.json({
      slots: slots.map((s) => ({
        ...s,
        date: s.date.toISOString(),
      })),
    });
  }

  return NextResponse.json({ error: "date 또는 month 파라미터가 필요합니다." }, { status: 400 });
}

// POST /api/timeslots — 슬롯 생성 (뷰티 전문가 본인만)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "뷰티 전문가만 예약 시간을 등록할 수 있습니다." }, { status: 403 });
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
      return NextResponse.json({ error: "이미 해당 시간이 등록되어 있습니다." }, { status: 409 });
    }
    if (isMissingSchemaError(err)) {
      return NextResponse.json(
        { error: "예약 시간 저장소가 아직 준비되지 않았습니다. 관리자에게 문의해 주세요." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "예약 시간 등록에 실패했습니다." }, { status: 500 });
  }
}
