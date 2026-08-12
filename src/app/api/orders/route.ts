import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlatformFees, productSettlementRecipient } from "@/lib/settlement";


export const dynamic = "force-dynamic";

// 일반상담상품 재고 차감 실패(동시 예약으로 재고 소진) 신호용 — 트랜잭션을 롤백시키고 409 로 응답한다.
class DirectStockError extends Error {}

// 예약 목록 조회
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const role = session.user.role;
  const where: any = {};

  if (role === "CUSTOMER") {
    where.userId = session.user!.id;
  } else if (role === "CONSULTANT") {
    // 상담사: 자신의 점집(자신이 등록·판매한 상담상품)의 예약만
    const seller = await prisma.sellerProfile.findUnique({
      where: { userId: session.user!.id },
    });
    where.sellerId = seller?.id ?? "__none__";
  }
  // SUPER_ADMIN: where 비움 = 전체 예약

  const orders = await prisma.reservation.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      seller: { select: { shopName: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount),
      discountAmount: Number(o.discountAmount),
      finalAmount: Number(o.finalAmount),
      items: o.items.map((item) => ({
        ...item,
        price: Number(item.price),
        totalPrice: Number(item.totalPrice),
      })),
    })),
  });
}

// 예약 생성
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const {
    sellerId,
    campaignId,
    items,
    customerName,
    customerPhone,
    reservationDate,
    reservationTime,
    birthDate,
    birthTime,
    gender,
    consultingContent,
    snsAccounts,
    couponCode,
  } = body;

  // SNS 계정 (선택사항) — { platform, handle }[] 형태만 허용. 없으면 null 저장.
  let snsAccountsJson: string | null = null;
  if (Array.isArray(snsAccounts) && snsAccounts.length > 0) {
    const cleaned = snsAccounts
      .filter(
        (s: any) =>
          s && typeof s.platform === "string" && typeof s.handle === "string" && s.handle.trim()
      )
      .map((s: any) => ({ platform: String(s.platform), handle: String(s.handle).trim() }));
    if (cleaned.length > 0) snsAccountsJson = JSON.stringify(cleaned);
  }

  if (!sellerId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "예약 정보가 올바르지 않습니다." }, { status: 400 });
  }

  // 예약 필수 정보 — 날짜/시간/신청자
  const reservationDateValue = reservationDate ? new Date(reservationDate) : null;
  if (!reservationDateValue || Number.isNaN(reservationDateValue.getTime())) {
    return NextResponse.json({ error: "예약 날짜가 올바르지 않습니다." }, { status: 400 });
  }
  if (typeof reservationTime !== "string" || !/^\d{2}:\d{2}$/.test(reservationTime)) {
    return NextResponse.json({ error: "예약 시간이 올바르지 않습니다." }, { status: 400 });
  }
  if (typeof customerName !== "string" || !customerName.trim()) {
    return NextResponse.json({ error: "예약자 이름을 입력해 주세요." }, { status: 400 });
  }
  if (typeof customerPhone !== "string" || !customerPhone.trim()) {
    return NextResponse.json({ error: "연락처를 입력해 주세요." }, { status: 400 });
  }

  // 상담사 존재 확인 (할인/커미션 계산에도 재사용)
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
  });
  if (!seller) {
    return NextResponse.json({ error: "상담사를 찾을 수 없습니다." }, { status: 404 });
  }

  // ─── 캠페인 검증 (가격은 서버 campaignPrice 만 신뢰) ───
  // 종료/취소/예정 캠페인 차단, 기간 검증.
  let campaign: Awaited<ReturnType<typeof prisma.groupBuyCampaign.findUnique>> = null;
  if (campaignId) {
    campaign = await prisma.groupBuyCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
    }
    if (campaign.sellerId !== sellerId) {
      return NextResponse.json({ error: "캠페인 정보가 올바르지 않습니다." }, { status: 400 });
    }
    const nowTs = new Date();
    const started = campaign.startDate <= nowTs;
    const notEnded = campaign.endDate >= nowTs;
    if (campaign.status !== "ACTIVE" || !started || !notEnded) {
      return NextResponse.json({ error: "진행 중인 단체 상담이 아닙니다." }, { status: 400 });
    }
  }

  // 예약번호 생성
  const now = new Date();
  const reservationNumber = `SB${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // ─── 정산 스냅샷용 요율 (예약 시점 고정) ───
  // 상담사 개별 요율이 있으면 우선, 없으면 전역 플랫폼 요율. settlement.ts 의 판정과 동일하게 맞춘다.
  const platformFees = await getPlatformFees();
  const sellerFeeRateSnap =
    seller.commissionRate != null ? Number(seller.commissionRate) : platformFees.sellerFeeRate;

  // ─── 금액 계산: 가격·상담상품명은 전부 서버 DB 기준. 클라이언트 price/productName 무시. ───
  let totalAmount = 0;
  const orderItems: any[] = [];
  // 일반상담상품(DirectProduct) 재고 차감 대상 — 예약 생성 트랜잭션 안에서 원자적으로 차감한다.
  const directStockOps: { id: string; quantity: number }[] = [];

  for (const item of items) {
    // 수량 검증 — 양의 정수만 허용 (API 직접 호출 방어)
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 999) {
      return NextResponse.json({ error: "예약 수량이 올바르지 않습니다." }, { status: 400 });
    }
    if (!item.productId) {
      return NextResponse.json({ error: "상담상품 정보가 올바르지 않습니다." }, { status: 400 });
    }

    // ─── 상담사 일반상담상품(DirectProduct) ───
    // 카탈로그 Product 가 아닌 별도 모델이라 조회·검증·정산 스냅샷 경로가 다르다.
    // 옵션(variant)·단체 상담·공급자가 존재하지 않는다.
    if (item.itemType === "DIRECT") {
      const direct = await prisma.directProduct.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, price: true, stock: true, isActive: true, sellerId: true },
      });
      if (!direct || !direct.isActive) {
        return NextResponse.json({ error: "판매 중이 아닌 상담상품이 포함되어 있습니다." }, { status: 400 });
      }
      // 소유권 검증 — 다른 상담사의 일반상담상품을 이 상담사 예약으로 태우면 정산이 엉뚱한 상담사에게 귀속된다.
      if (direct.sellerId !== sellerId) {
        return NextResponse.json({ error: "상담상품 정보가 올바르지 않습니다." }, { status: 400 });
      }
      if (campaign) {
        return NextResponse.json({ error: "일반상담상품은 단체 상담으로 예약할 수 없습니다." }, { status: 400 });
      }
      if (direct.stock < quantity) {
        return NextResponse.json({ error: `재고가 부족합니다. (남은 수량: ${direct.stock})` }, { status: 400 });
      }

      const price = Number(direct.price); // 가격은 서버 DB 값만 신뢰 (클라이언트 price 무시)
      const itemTotal = price * quantity;
      totalAmount += itemTotal;

      // 정산 스냅샷 — 상담사가 직접 등록·판매하는 상담상품이므로 settlement.ts 의 Case 1 로 계산된다.
      // (정산액 = 판매가 × (1 - 상담사 플랫폼 수수료율 × 1.1 / 100), 공급자 몫 없음)
      orderItems.push({
        itemType: "DIRECT",
        productId: direct.id,
        variantId: null,
        productName: direct.name,
        variantName: null,
        price,
        quantity,
        totalPrice: itemTotal,
        supplyPriceSnap: null,
        priceModelSnap: "DIRECT",
        productCommissionRateSnap: null,
        sellerFeeRateSnap,
        supplierFeeRateSnap: null,
        isSellerProductSnap: true,
        recipientRole: "CONSULTANT",
        recipientId: sellerId,
      });

      directStockOps.push({ id: direct.id, quantity });


      // 공급자·브랜드가 없으므로 중간관리자 브랜드 마진 적립 대상이 아니다.
      continue;
    }

    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: {
        id: true,
        name: true,
        basePrice: true,
        isActive: true,
        maxDailySlots: true,
        // ─── 정산 스냅샷용 ───
        supplyPrice: true,
        priceModel: true,
        commissionRate: true,
        sellerId: true,
      },
    });
    if (!product || !product.isActive) {
      return NextResponse.json({ error: "판매 중이 아닌 상담상품이 포함되어 있습니다." }, { status: 400 });
    }

    // variant 검증 — 존재 + 해당 상담상품 소속 + 재고
    let variant: { id: string; name: string; price: any; isActive: boolean } | null = null;
    if (item.variantId) {
      const v = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        select: { id: true, name: true, price: true, isActive: true, productId: true },
      });
      if (!v || v.productId !== product.id || !v.isActive) {
        return NextResponse.json({ error: "선택한 옵션을 찾을 수 없습니다." }, { status: 400 });
      }
      variant = v;
    }

    // 캠페인 상담상품 정합성 — 캠페인의 productId 와 예약 상담상품이 일치해야 함
    if (campaign && campaign.productId !== product.id) {
      return NextResponse.json({ error: "단체 상담 상담상품 정보가 올바르지 않습니다." }, { status: 400 });
    }

    // 하루 예약 정원 검증 — 같은 날짜에 이미 잡힌 예약 수가 maxDailySlots 를 넘지 못한다.
    const dayStart = new Date(reservationDateValue);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const bookedCount = await prisma.reservation.count({
      where: {
        sellerId,
        reservationDate: { gte: dayStart, lt: dayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    });
    if (bookedCount + quantity > product.maxDailySlots) {
      return NextResponse.json(
        { error: `해당 날짜의 예약이 마감되었습니다. (하루 최대 ${product.maxDailySlots}건)` },
        { status: 400 },
      );
    }

    // 가격 우선순위: 캠페인가 > variant가 > 기본가 (checkout/page.tsx 와 동일, 전부 서버 값)
    const price = campaign
      ? Number(campaign.campaignPrice)
      : variant
      ? Number(variant.price)
      : Number(product.basePrice);
    const itemTotal = price * quantity;
    totalAmount += itemTotal;

    // 정산 스냅샷 — 이 시점의 요율·공급가·수취인을 고정 저장한다.
    // 이후 상담상품의 공급가/요율/소유자가 바뀌거나 상담상품이 삭제돼도 이 예약의 정산액은 불변.
    const recipient = productSettlementRecipient(product);
    orderItems.push({
      itemType: "PRODUCT",
      productId: product.id,
      variantId: variant?.id || null,
      productName: product.name,
      variantName: variant?.name || null,
      price,
      quantity,
      totalPrice: itemTotal,
      supplyPriceSnap: product.supplyPrice != null ? Number(product.supplyPrice) : null,
      priceModelSnap: String(product.priceModel),
      productCommissionRateSnap:
        product.commissionRate != null ? Number(product.commissionRate) : null,
      sellerFeeRateSnap,
      supplierFeeRateSnap: platformFees.sellerFeeRate,
      isSellerProductSnap: product.sellerId === sellerId,
      recipientRole: recipient?.role ?? null,
      recipientId: recipient?.id ?? null,
    });

  }

  // ─── 할인 계산 ───
  // 추천인/픽(채널인증) 할인은 2026-07 폐지 — 장바구니 할인(상담사 부담)만 적용한다.
  // discountAmount/discountType 변수는 쿠폰 로직과 예약 저장 형식 호환을 위해 유지.
  // (buyerProfile 은 추천인 커미션 산정에 계속 사용된다)
  let discountAmount = 0;
  let discountType: string | null = null;

  const buyerProfile = await prisma.buyerProfile.findUnique({
    where: { userId: session.user!.id },
  });

  // ─── 장바구니 할인 (상담사 부담) ───
  // 상담사별 소계(배송비 제외)가 기준금액 이상이면 % 할인.
  // 할인액은 별도 컬럼(cartDiscountAmount)에 기록해 상담사 정산에서 차감한다 (lib/settlement.ts).
  let cartDiscountAmount = 0;
  if (
    seller.cartDiscountEnabled &&
    Number(seller.cartDiscountRate) > 0 &&
    Number(seller.cartDiscountThreshold) > 0 &&
    totalAmount >= Number(seller.cartDiscountThreshold)
  ) {
    cartDiscountAmount = Math.round((totalAmount * Number(seller.cartDiscountRate)) / 100);
    if (cartDiscountAmount > 0) discountType = "cart";
  }

  // ─── 라이브 쿠폰 할인 ───
  let couponDiscountAmount = 0;
  let appliedCouponId: string | null = null;
  let existingUserCouponId: string | null = null;

  if (couponCode && typeof couponCode === "string") {
    const coupon = await prisma.liveCoupon.findUnique({
      where: { code: couponCode.trim().toUpperCase() },
      include: { liveStream: { select: { endedAt: true } } },
    });

    if (coupon) {
      // 만료 여부
      let expired = false;
      if (coupon.liveStream.endedAt) {
        const expiry = new Date(coupon.liveStream.endedAt);
        expiry.setDate(expiry.getDate() + coupon.validDays);
        if (expiry < new Date()) expired = true;
      }

      if (!expired) {
        const existingUserCoupon = await prisma.userCoupon.findUnique({
          where: { liveCouponId_userId: { liveCouponId: coupon.id, userId: session.user!.id } },
        });

        const alreadyUsed = !!existingUserCoupon?.usedAt;
        const countExceeded = !existingUserCoupon && coupon.maxCount !== null && coupon.issuedCount >= coupon.maxCount;
        const minAmountOk = !coupon.minOrderAmount || totalAmount >= Number(coupon.minOrderAmount);

        if (!alreadyUsed && !countExceeded && minAmountOk) {
          if (coupon.discountType === "PERCENT") {
            couponDiscountAmount = Math.round(totalAmount * Number(coupon.discountValue) / 100);
          } else {
            couponDiscountAmount = Math.min(Number(coupon.discountValue), totalAmount - discountAmount - cartDiscountAmount);
          }
          appliedCouponId = coupon.id;
          existingUserCouponId = existingUserCoupon?.id ?? null;
        }
      }
    }
  }

  // ─── 게임 당첨 쿠폰 할인 (라이브 쿠폰이 적용되지 않은 경우) ───
  let appliedGameCouponRowId: string | null = null;
  if (!appliedCouponId && couponCode && typeof couponCode === "string") {
    const gc = await prisma.userGameCoupon.findUnique({
      where: { code: couponCode.trim().toUpperCase() },
      include: { gameCoupon: { select: { discountType: true, discountValue: true, minOrderAmount: true } } },
    });
    if (
      gc &&
      gc.userId === session.user!.id &&
      !gc.usedAt &&
      gc.expiresAt >= new Date() &&
      gc.sellerId === sellerId // 발급 상담사 점집에서만 사용 가능
    ) {
      const minOrder = Number(gc.gameCoupon?.minOrderAmount ?? 0);
      if (!minOrder || totalAmount >= minOrder) {
        if (gc.gameCoupon?.discountType === "PERCENT") {
          couponDiscountAmount = Math.round((totalAmount * Number(gc.gameCoupon.discountValue)) / 100);
        } else {
          couponDiscountAmount = Math.min(Number(gc.gameCoupon?.discountValue ?? 0), totalAmount - discountAmount - cartDiscountAmount);
        }
        appliedGameCouponRowId = gc.id;
      }
    }
  }
  const anyCouponApplied = !!appliedCouponId || !!appliedGameCouponRowId;

  const totalDiscountAmount = discountAmount + couponDiscountAmount;
  const finalAmount = totalAmount - totalDiscountAmount - cartDiscountAmount;
  const totalQty = orderItems.reduce((acc: number, i: any) => acc + i.quantity, 0);

  // 상담사의 멘토 정보 조회 (멘토-멘티 추천인 커미션)
  let mentorCommissionData: {
    mentorId: string;
    menteeId: string;
    commissionRate: number;
    commissionAmount: number;
  } | null = null;
  try {
    const sellerUser = await (prisma as any).user.findUnique({
      where: { id: seller.userId },
      select: { mentorId: true },
    });
    if (sellerUser?.mentorId) {
      const feeRow = await (prisma as any).platformFeeSettings.findFirst({ orderBy: { id: "asc" } });
      const mentorRate = Number(feeRow?.mentorCommissionRate ?? 1);
      if (mentorRate > 0) {
        const mentorCommAmount = Math.round(finalAmount * mentorRate / 100);
        if (mentorCommAmount > 0) {
          mentorCommissionData = {
            mentorId: sellerUser.mentorId,
            menteeId: seller.userId,
            commissionRate: mentorRate,
            commissionAmount: mentorCommAmount,
          };
        }
      }
    }
  } catch (e) {
    console.error("[orders] 멘토 커미션 산정 실패:", e);
  }

  // 커미션 대상 상담사는 트랜잭션 밖에서 미리 조회 (읽기) — 쓰기만 원자적으로 묶는다.
  let commission: {
    sellerId: string;
    commRate: number;
    commAmount: number;
  } | null = null;
  if (buyerProfile?.referredBySellerId) {
    const referredSeller = await prisma.sellerProfile.findUnique({
      where: { id: buyerProfile.referredBySellerId },
      select: { id: true, referralCommissionRate: true },
    });
    if (referredSeller) {
      const commRate = Number(referredSeller.referralCommissionRate);
      const commAmount = Math.round(totalAmount * commRate / 100);
      if (commAmount > 0) {
        commission = { sellerId: referredSeller.id, commRate, commAmount };
      }
    }
  }

  // ─── 예약 생성 + 캠페인 카운터 + 커미션 + 장바구니 정리를 원자적으로 ───
  const runOrderTransaction = () => prisma.$transaction(async (tx) => {
    // 일반상담상품 재고 차감 — 조건부 update 로 경합을 막는다.
    // 재고 1개짜리 상담상품을 두 고객이 동시에 예약하면 나중 트랜잭션의 count 가 0 이 되어 롤백된다.
    // (결제를 끝내지 않고 이탈하면 /api/orders/[id]/abort 가 재고를 복원한다)
    for (const op of directStockOps) {
      const updated = await tx.directProduct.updateMany({
        where: { id: op.id, stock: { gte: op.quantity } },
        data: { stock: { decrement: op.quantity } },
      });
      if (updated.count !== 1) throw new DirectStockError();
    }

    const created = await tx.reservation.create({
      data: {
        reservationNumber,
        userId: session.user!.id,
        sellerId,
        campaignId: campaignId || null,
        totalAmount,
        // discountAmount 는 표시용 총할인(추천인/픽 + 쿠폰 + 장바구니).
        // cartDiscountAmount 는 그중 상담사 부담분만 별도 기록 — 정산 차감(lib/settlement.ts)에 사용.
        discountAmount: totalDiscountAmount + cartDiscountAmount,
        discountType: anyCouponApplied
          ? (discountType ? `${discountType}+coupon` : "coupon")
          : discountType,
        cartDiscountAmount,
        finalAmount,
        reservationDate: reservationDateValue,
        reservationTime,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        birthDate: typeof birthDate === "string" && birthDate.trim() ? birthDate.trim() : null,
        birthTime: typeof birthTime === "string" && birthTime.trim() ? birthTime.trim() : null,
        gender: typeof gender === "string" && gender.trim() ? gender.trim() : null,
        consultingContent:
          typeof consultingContent === "string" && consultingContent.trim()
            ? consultingContent.trim()
            : null,
        snsAccounts: snsAccountsJson,
        sellerFeeRateSnap,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    if (campaignId) {
      await tx.groupBuyCampaign.update({
        where: { id: campaignId },
        data: {
          participantCount: { increment: 1 },
          currentQuantity: { increment: totalQty },
          totalRevenue: { increment: finalAmount },
        },
      });
    }

    if (commission) {
      await tx.referralCommission.create({
        data: {
          sellerId: commission.sellerId,
          reservationId: created.id,
          buyerUserId: session.user!.id,
          orderAmount: totalAmount,
          commissionRate: commission.commRate,
          commissionAmount: commission.commAmount,
          source: "referral",
          status: "PENDING",
        },
      });
      await tx.sellerProfile.update({
        where: { id: commission.sellerId },
        data: { totalReferralEarnings: { increment: commission.commAmount } },
      });
    }

    // 멘토 커미션 생성 (상담사에게 멘토가 있는 경우)
    if (mentorCommissionData) {
      await (tx as any).mentorCommission.create({
        data: {
          mentorId: mentorCommissionData.mentorId,
          menteeId: mentorCommissionData.menteeId,
          orderId: created.id,
          baseAmount: finalAmount,
          commissionRate: mentorCommissionData.commissionRate / 100, // 퍼센트 → 소수점
          commissionAmount: mentorCommissionData.commissionAmount,
          status: "PENDING",
        },
      });
    }

    // 쿠폰 사용 처리
    if (appliedCouponId) {
      if (existingUserCouponId) {
        // 이미 수령한 쿠폰 → usedAt 설정
        await tx.userCoupon.update({
          where: { id: existingUserCouponId },
          data: { usedAt: new Date() },
        });
      } else {
        // 미수령 쿠폰 → 수령 + 사용 동시 처리 (issuedCount 증가)
        await tx.userCoupon.create({
          data: {
            liveCouponId: appliedCouponId,
            userId: session.user!.id,
            claimedAt: new Date(),
            usedAt: new Date(),
          },
        });
        await tx.liveCoupon.update({
          where: { id: appliedCouponId },
          data: { issuedCount: { increment: 1 } },
        });
      }
    }

    // 게임 당첨 쿠폰 사용 확정
    if (appliedGameCouponRowId) {
      await tx.userGameCoupon.update({
        where: { id: appliedGameCouponRowId },
        data: { usedAt: new Date() },
      });
    }

    await tx.cartItem.deleteMany({
      where: { userId: session.user!.id, sellerId },
    });

    return created;
  });

  // 재고 검증과 차감 사이에 다른 고객이 마지막 재고를 가져간 경우 트랜잭션이 롤백된다.
  let order: Awaited<ReturnType<typeof runOrderTransaction>>;
  try {
    order = await runOrderTransaction();
  } catch (e) {
    if (e instanceof DirectStockError) {
      return NextResponse.json(
        { error: "재고가 부족합니다. 다른 고객이 방금 결제했을 수 있습니다." },
        { status: 409 },
      );
    }
    throw e;
  }

  return NextResponse.json({
    order: {
      ...order,
      totalAmount: Number(order.totalAmount),
      discountAmount: Number(order.discountAmount),
      finalAmount: Number(order.finalAmount),
    },
  }, { status: 201 });
}
