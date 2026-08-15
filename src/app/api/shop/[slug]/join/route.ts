import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { linkReferralForNewBuyer } from "@/lib/referral";
import { randomAvatar } from "@/lib/defaults";
import { notifySignupWelcome } from "@/lib/alimtalkTriggers";
import { ensureShopMembership } from "@/lib/shopMembership";

export const dynamic = "force-dynamic";

// POST /api/shop/[slug]/join — 점집 독립 회원 가입
// 두 가지 모드:
//  1) 로그인 상태(고객): 현재 계정을 이 점집 회원으로 연결 (body 불필요)
//  2) 비로그인: {name, email, password, phone?} 로 신규 계정 생성 + 멤버십 + 귀속
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> | { slug: string } },
) {
  const { slug } = await Promise.resolve(params);

  const shop = await prisma.sellerProfile.findUnique({
    where: { slug },
    select: { id: true, shopName: true, isApproved: true, userId: true },
  });
  if (!shop || !shop.isApproved) {
    return NextResponse.json({ error: "점집을 찾을 수 없습니다." }, { status: 404 });
  }

  const session = await auth();

  // ── 모드 1: 로그인된 고객을 점집 회원으로 연결 ──
  if (session?.user) {
    if (session.user.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "고객 계정만 점집 회원으로 가입할 수 있습니다." },
        { status: 400 },
      );
    }
    const membership = await ensureShopMembership(shop.id, session.user.id, shop.userId);
    return NextResponse.json({
      success: true,
      mode: "linked",
      membership: membership
        ? { id: membership.id, joinedAt: membership.joinedAt }
        : null,
      message: membership
        ? `${shop.shopName} 회원이 되었습니다.`
        : "회원 연결이 접수되었습니다.",
    });
  }

  // ── 모드 2: 신규 계정 생성 + 멤버십 ──
  let body: { name?: string; email?: string; password?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const phone =
    typeof body.phone === "string" && body.phone.trim()
      ? body.phone.replace(/[^0-9]/g, "")
      : null;

  if (!name) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "올바른 이메일을 입력해주세요." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json(
      {
        error: "이미 가입된 이메일입니다. 점집 로그인 후 회원 연결을 진행해주세요.",
        alreadyExists: true,
      },
      { status: 409 },
    );
  }

  const hashed = await bcrypt.hash(password, 12);
  // 운영 DB 스키마 드리프트 대응:
  //  - role 은 레거시 enum 값 BUYER 로 생성(운영 DB에 CUSTOMER enum 이 미반영일 수 있음).
  //    normalizeRole 이 세션 레이어에서 BUYER → CUSTOMER 로 변환하므로 동작은 동일.
  //  - select: { id: true } 로 미반영 컬럼 전체 조회를 피한다(없으면 create 가 500 을 낸다).
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: "BUYER",
      isActive: true,
      phone,
      gender: Math.random() < 0.5 ? "male" : "female",
      avatar: randomAvatar(Math.random() < 0.5 ? "male" : "female"),
    },
    select: { id: true },
  });

  // 점집 귀속(레퍼럴) — 기존 1단계 체계와 병행 유지
  await linkReferralForNewBuyer(prisma, {
    userId: user.id,
    sellerRef: slug,
    referralCode: null,
  }).catch((e) => console.error("[shop/join] 귀속 처리 오류:", e));

  // 점집 독립 멤버십 (테이블 미반영 시 null — 가입은 그대로 진행)
  const membership = await ensureShopMembership(shop.id, user.id, shop.userId);

  // 환영 알림톡 (실패 무시)
  await notifySignupWelcome({ name, phone, sellerRef: slug }).catch((e) =>
    console.error("[shop/join] 환영 알림톡 오류:", e),
  );

  return NextResponse.json({
    success: true,
    mode: "created",
    userId: user.id,
    membership: membership
      ? { id: membership.id, joinedAt: membership.joinedAt }
      : null,
    message: `${shop.shopName} 회원가입이 완료되었습니다.`,
  });
}

// GET /api/shop/[slug]/join — 현재 로그인 사용자의 이 점집 멤버십 여부
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> | { slug: string } },
) {
  const { slug } = await Promise.resolve(params);
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ member: false, loggedIn: false });
  }

  const shop = await prisma.sellerProfile.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!shop) {
    return NextResponse.json({ error: "점집을 찾을 수 없습니다." }, { status: 404 });
  }

  const { isShopMember } = await import("@/lib/shopMembership");
  const member = await isShopMember(shop.id, session.user.id);
  return NextResponse.json({ member, loggedIn: true });
}
