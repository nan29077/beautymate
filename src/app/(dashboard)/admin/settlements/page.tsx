import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettlementBusinessDays } from "@/lib/settings";
import { getSellerSettlementSummary, getPlatformFees } from "@/lib/settlement";
import { getPlatformRevenue } from "@/lib/revenue";
import { safeQuery } from "@/lib/safeDb";
import AdminPayoutSettlement from "@/components/admin/AdminPayoutSettlement";
import AdminFinanceNav from "@/components/admin/AdminFinanceNav";

export const dynamic = "force-dynamic";

export default async function AdminSettlementsPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/");

  const businessDays = await getSettlementBusinessDays();

  // 총 매출(gross)은 예약관리 판매금액과 일치하도록 결제완료 예약 합계로 산출
  const orders = await safeQuery("admin settlements orders", () =>
    prisma.reservation.findMany({
      where: {
        paymentStatus: "COMPLETED",
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      select: { finalAmount: true },
    }), []);
  const totalSales = orders.reduce((sum, o) => sum + Number(o.finalAmount), 0);

  // 정산 대기/가능액은 각 상담사가 보는 정산액과 정확히 일치해야 하므로,
  // 상담사 정산과 동일한 로직(getSellerSettlementSummary)으로 상담사별 합산한다.
  // (공급가·플랫폼 수수료 차감 후 세전 정산액 기준)
  const sellers = await prisma.sellerProfile.findMany({
    select: { id: true },
  });
  const fees = await getPlatformFees();
  let availableTotal = 0;
  let pendingTotal = 0;
  await Promise.all(
    sellers.map(async (s) => {
      const summary = await getSellerSettlementSummary(s.id, fees);
      availableTotal += summary.availableTotal;
      pendingTotal += summary.scheduledTotal;
    }),
  );

  // 사주나라 수익 — /admin/revenue 와 동일한 계산(lib/revenue.ts)을 사용한다.
  // 두 화면이 각자 다른 공식을 쓰면 같은 지표가 서로 다른 숫자를 내므로 하나로 모은다.
  const revenue = await getPlatformRevenue({ fees });
  const platformRevenue = revenue.netRevenue;

  // 상담사 출금요청 목록
  const rows = await prisma.payoutRequest.findMany({
    include: { seller: { select: { shopName: true } } },
    orderBy: { requestedAt: "desc" },
  });

  const payouts = rows.map((p) => ({
    id: p.id,
    sellerName: p.seller?.shopName || "상담사",
    amount: Number(p.amount),
    netAmount: Number(p.netAmount),
    // reservationCount 컬럼은 운영 DB 미반영 — 전역 omit 으로 기본 조회에서 빠진다 (없으면 0)
    reservationCount: (p as { reservationCount?: number }).reservationCount ?? 0,
    status: p.status,
    isBusiness: p.isBusiness,
    bizNumber: p.bizNumber,
    companyName: p.companyName,
    bankName: p.bankName,
    accountNumber: p.accountNumber,
    accountHolder: p.accountHolder,
    requestedAt: p.requestedAt.toISOString(),
    note: p.note,
  }));

  const requestedTotal = payouts
    .filter((p) => p.status === "REQUESTED")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="animate-fade-in min-w-0">
      <AdminFinanceNav />
      <AdminPayoutSettlement
        totals={{ totalSales, pendingTotal, availableTotal, requestedTotal, platformRevenue, businessDays }}
        payouts={payouts}
      />
    </div>
  );
}
