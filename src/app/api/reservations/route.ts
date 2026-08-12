import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeQuery, isMissingSchemaError } from "@/lib/safeDb";
import { generateOrderNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET /api/reservations — 예약 목록 조회
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const consultantId = url.searchParams.get("consultantId");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  const role = session.user.role;
  const where: Record<string, unknown> = {};

  if (role === "CUSTOMER") {
    where.userId = session.user.id;
  } else if (role === "CONSULTANT") {
    const seller = await prisma.sellerProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!seller) return NextResponse.json({ reservations: [] });
    where.sellerId = seller.id;
  }
  // SUPER_ADMIN: 필터만 적용

  if (status && status !== "ALL") where.status = status;
  if (consultantId && role === "SUPER_ADMIN") where.sellerId = consultantId;
  if (dateFrom || dateTo) {
    where.reservationDate = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
    };
  }

  const [reservations, total] = await safeQuery("reservations list", () => Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        seller: { select: { id: true, shopName: true, slug: true, user: { select: { name: true, avatar: true } } } },
        items: {
          include: { variant: { select: { name: true } } },
        },
        timeSlot: { select: { id: true, startTime: true, endTime: true } },
      },
      orderBy: { reservationDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ]), [[], 0]);

  return NextResponse.json({
    reservations: reservations.map((r) => ({
      ...r,
      totalAmount: Number(r.totalAmount),
      discountAmount: Number(r.discountAmount),
      finalAmount: Number(r.finalAmount),
      items: r.items.map((i) => ({
        ...i,
        price: Number(i.price),
        totalPrice: Number(i.totalPrice),
      })),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/reservations — 예약 생성
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const {
    sellerId,
    productId,
    timeSlotId,
    reservationDate,
    reservationTime,
    customerName,
    customerPhone,
    birthDate,
    birthTime,
    gender,
    consultingContent,
  } = body;

  if (!sellerId || !productId || !timeSlotId || !reservationDate || !reservationTime || !customerName || !customerPhone) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 슬롯 가용 여부 확인 (비관적 잠금 대신 트랜잭션 내 재확인)
      const slot = await tx.timeSlot.findUnique({
        where: { id: timeSlotId },
      });
      if (!slot) throw new Error("존재하지 않는 시간 슬롯입니다.");
      if (!slot.isAvailable || slot.reservationId) {
        throw new Error("SLOT_TAKEN");
      }

      // 상품 정보 조회
      const product = await tx.product.findUnique({
        where: { id: productId },
      });
      if (!product || !product.isActive) throw new Error("상담 상품을 찾을 수 없습니다.");

      const amount = Number(product.basePrice);
      const reservationNumber = generateOrderNumber();

      // 예약 생성
      const reservation = await tx.reservation.create({
        data: {
          reservationNumber,
          userId: session.user.id,
          sellerId,
          status: "PENDING",
          paymentStatus: "PENDING",
          totalAmount: amount,
          discountAmount: 0,
          finalAmount: amount,
          reservationDate: new Date(reservationDate),
          reservationTime,
          customerName,
          customerPhone,
          birthDate: birthDate || null,
          birthTime: birthTime || null,
          gender: gender || null,
          consultingContent: consultingContent || null,
          items: {
            create: {
              itemType: "PRODUCT",
              productId,
              productName: product.name,
              price: amount,
              quantity: 1,
              totalPrice: amount,
            },
          },
        },
      });

      // 슬롯 예약 연결 및 비활성화
      await tx.timeSlot.update({
        where: { id: timeSlotId },
        data: {
          isAvailable: false,
          reservationId: reservation.id,
        },
      });

      return reservation;
    });

    return NextResponse.json({ reservation: result }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "예약 생성에 실패했습니다.";
    if (msg === "SLOT_TAKEN") {
      return NextResponse.json({ error: "이미 예약된 시간입니다. 다른 시간을 선택해 주세요." }, { status: 409 });
    }
    if (isMissingSchemaError(err)) {
      return NextResponse.json(
        { error: "예약 저장소가 아직 준비되지 않았습니다. 관리자에게 문의해 주세요." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
