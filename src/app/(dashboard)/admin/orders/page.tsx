import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cleanupStalePendingOrders, VISIBLE_ORDER_FILTER } from "@/lib/orderCleanup";
import { parseSnsAccounts } from "@/lib/utils";
import { buildOrderFeeInfoMap } from "@/lib/orderFee";
import { safeQuery } from "@/lib/safeDb";
import OrderManagementClient from "@/components/shared/OrderManagementClient";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/");

  // 방치된 미결제 예약 정리 (이탈 PENDING 이 목록·DB 에 남지 않도록)
  await cleanupStalePendingOrders().catch(() => {});

  const orders = await safeQuery("admin orders list", () =>
    prisma.reservation.findMany({
      // 미결제 PENDING + 결제 전 이탈한 CANCELLED(pgTid 없음) 제외
      where: { ...VISIBLE_ORDER_FILTER },
      include: {
        user: { select: { name: true, email: true } },
        seller: { select: { id: true, shopName: true } },
        items: {
          include: {
            variant: { select: { name: true } },
          },
        },
        campaign: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }), []);

  // Get product → brand mapping
  const productIds = [...new Set(orders.flatMap(o => o.items.map(i => i.productId)))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true, thumbnail: true,
    },
  });
  const productThumbMap = Object.fromEntries(products.map(p => [p.id, p.thumbnail]));
  // 패키지 예약과 연결된 orderId 목록
  const packageOrderItems = await prisma.packageOrderItem.findMany({
    select: { orderId: true },
  });
  const packageOrderIdSet = new Set(packageOrderItems.map((p) => p.orderId).filter(Boolean));

  // Get all sellers and brands for filters
  const allSellers = await prisma.sellerProfile.findMany({ select: { id: true, shopName: true }, orderBy: { shopName: "asc" } });

  // 예약별 정산 수수료 안내(최고관리자 관점) 계산 — 전체 수익 구조
  const feeMap = await buildOrderFeeInfoMap({
    viewpoint: "ADMIN",
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      paymentStatus: o.paymentStatus,
      items: o.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        totalPrice: Number(i.totalPrice),
        productName: i.productName,
        variantName: i.variantName || i.variant?.name || null,
      })),
    })),
  });

  const serialized = orders.map((o) => {
    return {
      id: o.id,
      reservationNumber: o.reservationNumber,
      userName: o.user.name || "",
      userEmail: o.user.email,
      sellerName: o.seller.shopName,
      sellerId: o.seller.id,
      finalAmount: Number(o.finalAmount),
      totalAmount: Number(o.totalAmount),
      discountAmount: Number(o.discountAmount),
      discountType: o.discountType,
      status: o.status,
      paymentMethod: o.paymentMethod,
      campaignId: o.campaignId,
      campaignTitle: o.campaign?.title || null,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      snsAccounts: parseSnsAccounts((o as any).snsAccounts),
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() || null,
      confirmedAt: o.confirmedAt?.toISOString() || null,
      completedAt: o.completedAt?.toISOString() || null,
      thumbnail: o.items.length ? productThumbMap[o.items[0].productId] || null : null,
      items: o.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        variantName: i.variantName || i.variant?.name || null,
        price: Number(i.price),
        quantity: i.quantity,
        totalPrice: Number(i.totalPrice),
        thumbnail: productThumbMap[i.productId] || null,
      })),
      feeInfo: feeMap[o.id] ?? null,
      canViewDetail: true,
      isPackageOrder: packageOrderIdSet.has(o.id),
      reservationDate: o.reservationDate.toISOString(),
      reservationTime: o.reservationTime,
      birthDate: o.birthDate,
      birthTime: o.birthTime,
      gender: o.gender,
      consultingContent: o.consultingContent,
      paymentStatus: o.paymentStatus,
      cancelStatus: (o as any).cancelStatus || null,
      cancelType: (o as any).cancelType || null,
      cancelAmount: (o as any).cancelAmount != null ? Number((o as any).cancelAmount) : null,
      cancelFromSettlement: (o as any).cancelFromSettlement ?? false,
    };
  });

  const serializedSellers = allSellers.map((s) => ({ id: s.id, name: s.shopName }));

  return (
    <div className="animate-fade-in">
      <OrderManagementClient
        orders={serialized}
        sellers={serializedSellers}
        role="SUPER_ADMIN"
        canManageStatus={true}
      />
    </div>
  );
}
