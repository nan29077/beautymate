// 상담사 정산 집계 서버 유틸.
// - 예약(Order) 데이터에서 "영업일 기준 N일 후" 규칙으로 정산일을 계산해
//   '정산 가능 금액'(정산일 도래)과 '정산 예정 금액'(정산일 전)을 집계한다.
// - N은 최고관리자 권한설정(settlementBusinessDays, 기본 5)을 읽어 사용한다.
// - 출금 요청(PayoutRequest) 중 반려(REJECTED)를 제외한 전 상태(요청/승인/지급완료)를
//   가용 금액에서 차감한다. 진행 중 금액을 차감하지 않으면 지급 처리 전에
//   같은 금액을 중복 신청할 수 있어 이중 지급 사고로 이어진다. (docs/SETTLEMENT_ISSUES.md #1)
// prisma 를 사용하므로 서버 컴포넌트 / route handler 에서만 사용하세요.

import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safeDb";
import { getSettlementBusinessDays } from "@/lib/settings";
import { getSettlementDate, startOfDay, toYmd } from "@/lib/businessDays";
import { withVatRate } from "@/lib/utils";

// ───── 정산 수취인 판정 ─────
// A. 상담사 본인 등록 (sellerId 有) → 상담사
// B. 최고관리자 등록 (sellerId 無)  → 플랫폼(수취인 없음)
export type SettlementRole = "CONSULTANT" | "SUPER_ADMIN";
export type SettlementRecipient = { role: SettlementRole; id: string } | null;

export function productSettlementRecipient(p: {
  sellerId?: string | null;
}): SettlementRecipient {
  if (p.sellerId) return { role: "CONSULTANT", id: p.sellerId };
  return null;
}

// 정산 대상 예약 1건의 계산 결과
export interface SettlementOrder {
  orderId: string;
  reservationNumber: string;
  saleDate: string; // 판매(결제완료) 기준일 ISO
  settlementDate: string; // 정산 가능 전환일 ISO (영업일+N)
  settlementYmd: string; // 정산일 YYYY-MM-DD
  saleYmd: string; // 판매일 YYYY-MM-DD
  grossAmount: number; // 결제 금액(정산 기준 매출)
  supplyAmount: number; // 공급가 합계 (B타입 상담상품만, 브랜드 정산액)
  effectiveAmount: number; // 실효 매출 = grossAmount - supplyAmount (수수료 산정 기준)
  commissionRate: number; // 적용 수수료율(%)
  commissionAmount: number; // 수수료
  settlementAmount: number; // 정산액(세전) = effectiveAmount - 수수료 - 장바구니 할인(상담사 부담)
  cartDiscountAmount: number; // 장바구니 할인액(상담사 부담분, 정산에서 차감됨)
  available: boolean; // 정산일 도래 여부
  campaignTitle: string | null;
  type: "groupbuy" | "normal"; // 캠페인 예약 / 일반 예약
  productType: "seller" | "supply" | "mixed"; // A타입(상담사등록), B타입(공급), 혼합
  productNames?: string[]; // 예약에 포함된 상담상품명(상세내역 표시용)
}

export interface PayoutSummary {
  id: string;
  amount: number;
  netAmount: number;
  reservationCount: number;
  status: string;
  isBusiness: boolean;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  note: string | null;
  requestedAt: string;
  processedAt: string | null;
}

export interface SellerSettlementSummary {
  businessDays: number;
  commissionRate: number;
  orders: SettlementOrder[];
  availableTotal: number; // 정산일 도래분 정산액 합계(세전)
  scheduledTotal: number; // 정산일 전(예정)분 정산액 합계(세전)
  totalGrossAmount: number; // 총 판매금액 합계
  totalSupplyAmount: number; // 총 공급가 합계 (브랜드 정산액)
  totalCommissionAmount: number; // 총 플랫폼 수수료 합계
  reservedAmount: number; // 지급완료(PAID)된 출금 금액(세전) — 가용금액 차감용
  inProgressAmount: number; // "출금 진행중"(요청/승인, 지급완료·반려 제외) — 가용금액 차감용
  withdrawableAmount: number; // 실제 출금 신청 가능 금액 = availableTotal - reservedAmount - inProgressAmount
  payouts: PayoutSummary[];
}

// 정산 기준이 되는 "확정 매출" 예약만 집계:
// 결제완료(paymentStatus=COMPLETED) & 취소/환불이 아닌 예약.
function isSettleableOrder(paymentStatus: string, status: string): boolean {
  if (paymentStatus !== "COMPLETED") return false;
  if (["CANCELLED", "NO_SHOW"].includes(status)) return false;
  return true;
}

const round = (n: number) => Math.round(n);

// ───── 역할별 플랫폼 수수료율 ─────
// PlatformFeeSettings(단일 레코드)에서 상담사 수수료율(%)을 읽어 정산 계산에 사용한다.
export interface PlatformFees {
  sellerFeeRate: number; // % 단위 (예: 5.0)
}

export const DEFAULT_PLATFORM_FEES: PlatformFees = {
  sellerFeeRate: 5,
};

// PlatformFeeSettings 조회 (없거나 오류 시 기본값 5)
export async function getPlatformFees(): Promise<PlatformFees> {
  try {
    const row = await (prisma as any).platformFeeSettings.findFirst({ orderBy: { id: "asc" } });
    if (!row) return { ...DEFAULT_PLATFORM_FEES };
    return { sellerFeeRate: Number(row.sellerFeeRate) };
  } catch {
    return { ...DEFAULT_PLATFORM_FEES };
  }
}

// 수수료율(%) → 정산 잔여 비율. 부가세 포함 실효율(rate × 1.1)을 차감한 비율.
// 예: 5% → 1 - 5×1.1/100 = 0.945
export const feeMultiplier = (rate: number) => 1 - (rate * 1.1) / 100;

export async function getSellerSettlementSummary(
  sellerId: string,
  fees: PlatformFees,
): Promise<SellerSettlementSummary> {
  const businessDays = await getSettlementBusinessDays();
  const today = startOfDay(new Date());
  // 상담사 개별 수수료율(SellerProfile.commissionRate, 관리자 상담사관리에서 설정)을 우선 적용하고,
  // 값이 없으면 전역 플랫폼 수수료율(sellerFeeRate)로 폴백한다. 표시는 실효율(rate × 1.1) 기준.
  const profile = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: { commissionRate: true },
  });
  const sellerRate =
    profile?.commissionRate != null ? Number(profile.commissionRate) : fees.sellerFeeRate;
  const vatCommissionRate = withVatRate(sellerRate);
  const sellerFeeMul = feeMultiplier(sellerRate);

  const [rawOrders, payoutRows] = await Promise.all([
    safeQuery("settlement rawOrders", () =>
    prisma.reservation.findMany({
      where: {
        sellerId,
        paymentStatus: "COMPLETED",
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      select: {
        id: true,
        reservationNumber: true,
        finalAmount: true,
        cartDiscountAmount: true,
        paidAt: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        cancelStatus: true,
        sellerFeeRateSnap: true,
        campaign: { select: { title: true } },
        campaignId: true,
        items: {
          select: {
            productId: true,
            productName: true,
            quantity: true,
            totalPrice: true,
            // 정산 스냅샷 (예약 시점 고정값). 있으면 Product 현재값 대신 이걸 쓴다.
            supplyPriceSnap: true,
            priceModelSnap: true,
            productCommissionRateSnap: true,
            sellerFeeRateSnap: true,
            isSellerProductSnap: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }), []),
    prisma.payoutRequest.findMany({
      where: { sellerId },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  // 예약 아이템에서 상담상품 ID 수집 → 공급가/등록자 정보 일괄 조회
  const allProductIds = [...new Set(rawOrders.flatMap((o) => o.items.map((i) => i.productId)))];
  const productInfoMap = new Map<
    string,
    {
      supplyPrice: number | null;
      isSellerProduct: boolean;
      name: string;
      priceModel: string;
      commissionRate: number | null; // 수수료(COMMISSION) 제공 시 상담사 수수료율(%)
    }
  >();
  if (allProductIds.length > 0) {
    const prods = await prisma.product.findMany({
      where: { id: { in: allProductIds } },
      select: { id: true, supplyPrice: true, sellerId: true, name: true, priceModel: true, commissionRate: true },
    });
    for (const p of prods) {
      productInfoMap.set(p.id, {
        supplyPrice: p.supplyPrice != null ? Number(p.supplyPrice) : null,
        // A타입: 이 상담사가 직접 등록한 상담상품, B타입: 그 외(브랜드/관리자/중간관리자 등록)
        isSellerProduct: p.sellerId === sellerId,
        name: p.name,
        priceModel: String(p.priceModel),
        commissionRate: p.commissionRate != null ? Number(p.commissionRate) : null,
      });
    }
  }

  const orders: SettlementOrder[] = [];
  let availableTotal = 0;
  let scheduledTotal = 0;
  let totalGrossAmount = 0;
  let totalSupplyAmount = 0;
  let totalCommissionAmount = 0;

  for (const o of rawOrders) {
    if (!isSettleableOrder(o.paymentStatus, o.status)) continue;

    // 아이템별 정산 계산 — 상담상품 유형(Case 1/2A/2B)에 따라 상담사 정산액을 산정한다.
    let supplyAmount = 0; // 공급자 몫(상담사 정산에서 빠지는 금액, 표시용)
    let effBase = 0; // 상담사 정산 기준액(플랫폼 수수료 차감 전)
    let sellerSettle = 0; // 상담사 정산액(플랫폼 수수료 차감 후)
    let hasSellerProduct = false;
    let hasSupplyProduct = false;
    const productNames: string[] = [];
    for (const item of o.items) {
      const live = productInfoMap.get(item.productId);

      // 예약 시점 스냅샷이 있으면 그것만으로 계산한다(요율 변경·상담상품 삭제에 영향받지 않음).
      // 스냅샷 도입(2026-07-12) 이전 예약만 live 값으로 폴백한다.
      const hasSnap = item.sellerFeeRateSnap != null && item.isSellerProductSnap != null;
      const info = hasSnap
        ? {
            supplyPrice: item.supplyPriceSnap != null ? Number(item.supplyPriceSnap) : null,
            isSellerProduct: item.isSellerProductSnap === true,
            priceModel: item.priceModelSnap ?? "SUPPLY",
            commissionRate:
              item.productCommissionRateSnap != null
                ? Number(item.productCommissionRateSnap)
                : null,
            // 상담사 일반상담상품(DirectProduct)은 Product 조회가 빗나가므로 예약 시점 상담상품명을 쓴다.
            name: live?.name ?? item.productName ?? "",
          }
        : live;
      if (!info) continue; // 스냅샷도 없고 상담상품도 삭제된 예약 — 기존 동작 유지(0원)

      // 수수료율도 스냅샷 우선. 예약마다 다를 수 있으므로 아이템 단위로 적용한다.
      const itemFeeMul = hasSnap
        ? feeMultiplier(Number(item.sellerFeeRateSnap))
        : sellerFeeMul;

      if (info.name && !productNames.includes(info.name)) productNames.push(info.name);
      const itemSale = Number(item.totalPrice); // 판매가 × 수량

      if (info.isSellerProduct) {
        // Case 1 — 상담사 직접 등록 상담상품: 판매가 × (1 - sellerFeeRate × 1.1 / 100)
        hasSellerProduct = true;
        effBase += itemSale;
        sellerSettle += itemSale * itemFeeMul;
      } else if (info.priceModel === "COMMISSION" && info.commissionRate != null) {
        // Case 2B — 수수료(COMMISSION) 기반 상담사 신청 상담상품
        hasSupplyProduct = true;
        const sellerPortion = itemSale * (info.commissionRate / 100);
        effBase += sellerPortion;
        sellerSettle += sellerPortion * itemFeeMul;
        supplyAmount += itemSale - sellerPortion; // 공급자 몫(수수료 전)
      } else {
        // Case 2A — 공급가(SUPPLY) 기반 상담사 신청 상담상품
        hasSupplyProduct = true;
        const supply = (info.supplyPrice ?? 0) * item.quantity;
        const margin = Math.max(0, itemSale - supply);
        effBase += margin;
        sellerSettle += margin * itemFeeMul;
        supplyAmount += supply;
      }
    }

    // 아이템이 없는 예약(소셜 예약서 등 상담상품 매핑 없이 결제된 수기 예약)은
    // 공급가/커미션 산정이 불가능하므로 예약 결제액 전액을 상담사 정산 기준으로 삼는다.
    // (상담사 직접 등록 상담상품과 동일하게 플랫폼 수수료만 차감)
    // 요율은 예약 단위 스냅샷(Order.sellerFeeRateSnap) 우선 — 아이템이 없어 아이템 단위
    // 스냅샷을 쓸 수 없으므로, 이게 없으면 요율 변경 시 정산액이 소급 변동한다.
    if (o.items.length === 0) {
      hasSellerProduct = true;
      effBase = Number(o.finalAmount);
      const orderFeeMul =
        o.sellerFeeRateSnap != null ? feeMultiplier(Number(o.sellerFeeRateSnap)) : sellerFeeMul;
      sellerSettle = effBase * orderFeeMul;
    }

    const productType: SettlementOrder["productType"] =
      hasSellerProduct && hasSupplyProduct ? "mixed" : hasSellerProduct ? "seller" : "supply";

    const saleDate = o.paidAt ?? o.createdAt;
    const settlementDate = getSettlementDate(saleDate, businessDays);
    const gross = Number(o.finalAmount); // 표시용 판매금액(예약 결제액)
    const effectiveAmount = round(effBase); // 수수료 산정 기준(상담사 몫)
    // 장바구니 할인(상담사 부담) — 플랫폼 수수료는 할인 전 기준으로 계산하고,
    // 수수료 차감 후 정산액에서 할인액을 그대로 뺀다 (마진 초과 시 0원 하한).
    const cartDiscountAmount = Number((o as any).cartDiscountAmount ?? 0);
    const settlementBeforeCartDiscount = round(sellerSettle);
    const commissionAmount = Math.max(0, effectiveAmount - settlementBeforeCartDiscount);
    const settlementAmount = Math.max(0, settlementBeforeCartDiscount - round(cartDiscountAmount));
    // 결제취소 진행 중(요청/입금확인/승인 전) 예약은 취소가 확정되면 정산에서 빠지므로
    // 정산일이 도래했어도 출금 가능 금액에 포함하지 않는다. (docs/SETTLEMENT_ISSUES.md #5)
    // 취소 요청이 철회되면 cancelStatus 가 초기화되어 자동으로 다시 포함된다.
    const cancelPending = ["REQUESTED", "DEPOSIT_CONFIRMED", "APPROVED"].includes(
      o.cancelStatus ?? "",
    );
    const available = !cancelPending && settlementDate.getTime() <= today.getTime();

    if (available) availableTotal += settlementAmount;
    else scheduledTotal += settlementAmount;

    totalGrossAmount += gross;
    totalSupplyAmount += supplyAmount;
    totalCommissionAmount += commissionAmount;

    orders.push({
      orderId: o.id,
      reservationNumber: o.reservationNumber,
      saleDate: saleDate.toISOString(),
      settlementDate: settlementDate.toISOString(),
      settlementYmd: toYmd(settlementDate),
      saleYmd: toYmd(startOfDay(saleDate)),
      grossAmount: gross,
      supplyAmount,
      effectiveAmount,
      commissionRate: vatCommissionRate,
      commissionAmount,
      settlementAmount,
      cartDiscountAmount,
      available,
      campaignTitle: o.campaign?.title ?? null,
      type: o.campaignId ? "groupbuy" : "normal",
      productType,
      productNames,
    });
  }

  // 지급완료(PAID)된 출금 금액 — 이미 나간 돈
  const reservedAmount = payoutRows
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // "출금 진행중"(요청/승인, 지급완료·반려 제외) 금액 — 아직 나가지 않았지만 예약된 돈.
  // 반려(REJECTED)되면 자동으로 다시 출금 가능 금액에 포함된다.
  const inProgressAmount = payoutRows
    .filter((p) => p.status === "REQUESTED" || p.status === "APPROVED")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // 출금 신청 가능 금액 = 정산 도래분 - 지급완료 - 진행중(이중 신청 방지)
  const withdrawableAmount = Math.max(0, availableTotal - reservedAmount - inProgressAmount);

  const payouts: PayoutSummary[] = payoutRows.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    netAmount: Number(p.netAmount),
    // reservationCount 컬럼은 운영 DB 미반영 — 전역 omit 으로 기본 조회에서 빠진다 (없으면 0)
    reservationCount: (p as { reservationCount?: number }).reservationCount ?? 0,
    status: p.status,
    isBusiness: p.isBusiness,
    bankName: p.bankName,
    accountNumber: p.accountNumber,
    accountHolder: p.accountHolder,
    note: p.note,
    requestedAt: p.requestedAt.toISOString(),
    processedAt: p.processedAt ? p.processedAt.toISOString() : null,
  }));

  return {
    businessDays,
    commissionRate: vatCommissionRate,
    orders,
    availableTotal,
    scheduledTotal,
    totalGrossAmount,
    totalSupplyAmount,
    totalCommissionAmount,
    reservedAmount,
    inProgressAmount,
    withdrawableAmount,
    payouts,
  };
}

