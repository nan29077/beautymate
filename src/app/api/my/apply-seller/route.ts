import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 고객이 "뷰티 전문가로 입점 신청" — 현재 계정에 승인 대기(SellerProfile.isApproved=false) 뷰티 전문가 신청을 생성.
// 최고관리자 뷰티 전문가 관리에서 승인하면 role 이 CONSULTANT 로 전환된다.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "CUSTOMER") {
    return NextResponse.json({ error: "시청자 회원만 뷰티 전문가 입점 신청이 가능합니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, sellerProfile: { select: { id: true, isApproved: true } } },
  });
  if (!user) return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });

  if (user.sellerProfile) {
    return NextResponse.json(
      { alreadyApplied: true, approved: user.sellerProfile.isApproved,
        error: user.sellerProfile.isApproved ? "이미 승인된 뷰티 전문가입니다." : "이미 뷰티 전문가 입점 신청이 접수되어 승인 대기 중입니다." },
      { status: 400 },
    );
  }

  // 고유 slug 생성
  const base = (user.email?.split("@")[0] || "seller").toLowerCase().replace(/[^a-z0-9]/g, "-") || "seller";
  let slug = base;
  let n = 1;
  while (await prisma.sellerProfile.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }

  await prisma.sellerProfile.create({
    data: {
      userId: user.id,
      slug,
      shopName: `${user.name}의 뷰티샵`,
      isApproved: false, // 최고관리자 승인 대기
    },
  });

  return NextResponse.json({ success: true, message: "뷰티 전문가 입점 신청이 접수되었습니다. 관리자 승인 후 뷰티 전문가 기능을 이용할 수 있습니다." });
}
