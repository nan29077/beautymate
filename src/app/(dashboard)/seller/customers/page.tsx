import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SellerCustomersClient, { type CustomerRow } from "@/components/seller/SellerCustomersClient";
import { safeQuery } from "@/lib/safeDb";

export const dynamic = "force-dynamic";

export default async function SellerCustomersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") redirect("/");

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!seller) redirect("/");

  const reservations = await safeQuery("seller customers reservations", () =>
    prisma.reservation.findMany({
      where: { sellerId: seller.id },
      select: {
        userId: true,
        status: true,
        paymentStatus: true,
        finalAmount: true,
        reservationDate: true,
        createdAt: true,
        customerName: true,
        customerPhone: true,
        birthDate: true,
        gender: true,
        user: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { reservationDate: "desc" },
    }), []);

  // 고객(User) 단위로 집계. 이름·연락처는 가장 최근 예약 기준.
  const map = new Map<string, CustomerRow>();
  for (const r of reservations) {
    const key = r.userId;
    let row = map.get(key);
    if (!row) {
      row = {
        customerId: key,
        name: r.customerName || r.user?.name || "-",
        phone: r.customerPhone || r.user?.phone || "-",
        birthDate: r.birthDate,
        gender: r.gender,
        totalReservations: 0,
        completedCount: 0,
        totalPaid: 0,
        lastReservationDate: null,
        firstReservationDate: null,
      };
      map.set(key, row);
    }

    row.totalReservations++;
    if (r.status === "COMPLETED") row.completedCount++;

    // 결제완료 + 취소되지 않은 건만 매출로 집계 (환불은 paymentStatus 로 걸러진다)
    if (r.paymentStatus === "COMPLETED" && r.status !== "CANCELLED") {
      row.totalPaid += Number(r.finalAmount);
    }

    const dateIso = r.reservationDate.toISOString();
    if (!row.lastReservationDate || dateIso > row.lastReservationDate) {
      row.lastReservationDate = dateIso;
    }
    if (!row.firstReservationDate || dateIso < row.firstReservationDate) {
      row.firstReservationDate = dateIso;
    }
    // 생년월일/성별은 값이 있는 예약에서 채운다.
    if (!row.birthDate && r.birthDate) row.birthDate = r.birthDate;
    if (!row.gender && r.gender) row.gender = r.gender;
  }

  // 이 점집으로 가입 귀속된 고객 (예약 이력이 없어도 목록에 노출)
  const referred = await safeQuery("seller referred customers", () =>
    prisma.buyerProfile.findMany({
      where: { referredBySellerId: seller.id },
      select: {
        userId: true,
        createdAt: true,
        user: { select: { id: true, name: true, phone: true } },
      },
    }), []);
  const referredIds = new Set(referred.map((b) => b.userId));
  for (const b of referred) {
    const row = map.get(b.userId);
    if (row) continue; // 예약 이력이 있으면 집계 행 유지
    map.set(b.userId, {
      customerId: b.userId,
      name: b.user?.name || "-",
      phone: b.user?.phone || "-",
      birthDate: null,
      gender: null,
      totalReservations: 0,
      completedCount: 0,
      totalPaid: 0,
      lastReservationDate: null,
      firstReservationDate: null,
      isReferred: true,
    });
  }

  const customers = Array.from(map.values())
    .map((c) => ({ ...c, isReferred: referredIds.has(c.customerId) }))
    .sort((a, b) =>
      (b.lastReservationDate ?? "").localeCompare(a.lastReservationDate ?? "")
    );

  return <SellerCustomersClient customers={customers} />;
}
