import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { sellerProfile: true },
  });
  if (!user?.sellerProfile) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

  const { amount, payMethod } = await request.json();

  if (!amount || amount < 50000) {
    return NextResponse.json({ error: "최소 충전 금액은 50,000원입니다." }, { status: 400 });
  }

  const vat = Math.round(amount * 0.1);
  const totalAmount = amount + vat;
  const credits = Math.floor(amount / 15);

  let account = await prisma.alimtalkAccount.findUnique({
    where: { sellerId: user.sellerProfile.id },
  });

  if (!account) {
    account = await prisma.alimtalkAccount.create({
      data: { sellerId: user.sellerProfile.id },
    });
  }

  // 결제(PG) 연동 전까지는 충전 요청을 PENDING 으로만 생성한다.
  // 실제 크레딧 적립은 결제 확인 후 관리자 승인(PATCH /api/admin/alimtalk/[sellerId])을 통해서만 이뤄진다.
  // (기존에는 요청 즉시 PAID 처리 + 잔액 증가 — 결제 없이 무한 충전 가능하던 구멍을 막는다)
  const charge = await prisma.alimtalkCharge.create({
    data: {
      accountId: account.id,
      amount,
      vat,
      totalAmount,
      credits,
      payMethod: payMethod || "card",
      payStatus: "PENDING",
    },
  });

  return NextResponse.json({
    chargeId: charge.id,
    credits,
    balance: account.balance,
    pending: true,
    message: `충전 요청이 접수되었습니다. 결제(입금) 확인 후 ${credits.toLocaleString()}건이 적립됩니다.`,
  });
}
