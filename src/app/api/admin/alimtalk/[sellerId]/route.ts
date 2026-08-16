import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { sellerId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const account = await prisma.alimtalkAccount.findUnique({
    where: { sellerId: params.sellerId },
    include: {
      seller: { include: { user: { select: { name: true, email: true } } } },
      charges: { orderBy: { createdAt: "desc" } },
      logs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  return NextResponse.json({ account });
}

// PATCH: 충전 요청 승인/거절 (SUPER_ADMIN 전용)
// body: { chargeId: string, action: "approve" | "reject" }
// 승인 시 payStatus=PAID + 크레딧 적립, 거절 시 payStatus=FAILED.
export async function PATCH(request: Request, { params }: { params: { sellerId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const chargeId = String(body?.chargeId || "");
  const action = body?.action === "reject" ? "reject" : body?.action === "approve" ? "approve" : null;
  if (!chargeId || !action) {
    return NextResponse.json({ error: "chargeId, action(approve|reject)이 필요합니다." }, { status: 400 });
  }

  const charge = await prisma.alimtalkCharge.findUnique({
    where: { id: chargeId },
    include: { account: { select: { id: true, sellerId: true } } },
  });
  if (!charge || charge.account.sellerId !== params.sellerId) {
    return NextResponse.json({ error: "충전 요청을 찾을 수 없습니다." }, { status: 404 });
  }
  if (charge.payStatus !== "PENDING") {
    return NextResponse.json({ error: "대기(PENDING) 상태의 충전 요청만 처리할 수 있습니다." }, { status: 400 });
  }

  if (action === "approve") {
    await prisma.$transaction([
      prisma.alimtalkCharge.update({
        where: { id: charge.id },
        data: { payStatus: "PAID", pgTid: charge.pgTid ?? `ADMIN_${Date.now()}` },
      }),
      prisma.alimtalkAccount.update({
        where: { id: charge.account.id },
        data: { balance: { increment: charge.credits } },
      }),
    ]);
    return NextResponse.json({ success: true, payStatus: "PAID", credits: charge.credits });
  }

  await prisma.alimtalkCharge.update({
    where: { id: charge.id },
    data: { payStatus: "FAILED" },
  });
  return NextResponse.json({ success: true, payStatus: "FAILED" });
}
