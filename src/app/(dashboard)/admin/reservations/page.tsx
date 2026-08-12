import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminReservationsClient from "@/components/admin/AdminReservationsClient";
import { safeQuery } from "@/lib/safeDb";

export const dynamic = "force-dynamic";

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; consultantId?: string; dateFrom?: string; dateTo?: string }> | { status?: string; consultantId?: string; dateFrom?: string; dateTo?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/admin");

  const { status, consultantId, dateFrom, dateTo } = await Promise.resolve(searchParams);

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (consultantId) where.sellerId = consultantId;
  if (dateFrom || dateTo) {
    where.reservationDate = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
    };
  }

  const [reservations, sellers] = await Promise.all([
    safeQuery("admin reservations list", () =>
      prisma.reservation.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          seller: {
            select: {
              id: true,
              shopName: true,
              slug: true,
              user: { select: { name: true } },
            },
          },
          items: true,
          timeSlot: { select: { startTime: true, endTime: true } },
        },
        orderBy: { reservationDate: "desc" },
        take: 300,
      }), []),
    prisma.sellerProfile.findMany({
      select: { id: true, shopName: true },
      orderBy: { shopName: "asc" },
    }),
  ]);

  const serialized = reservations.map((r) => ({
    id: r.id,
    reservationNumber: r.reservationNumber,
    status: r.status,
    reservationDate: r.reservationDate.toISOString(),
    reservationTime: r.reservationTime,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    finalAmount: Number(r.finalAmount),
    user: r.user,
    seller: r.seller,
    items: r.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
    timeSlot: r.timeSlot,
  }));

  return (
    <AdminReservationsClient
      reservations={serialized}
      sellers={sellers}
      initialFilters={{ status: status || "ALL", consultantId: consultantId || "", dateFrom: dateFrom || "", dateTo: dateTo || "" }}
    />
  );
}
