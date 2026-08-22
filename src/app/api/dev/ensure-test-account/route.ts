import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureSellerProfile } from "@/lib/sellerProfile";

/**
 * 개발 전용 — 로그인 화면의 "테스트 로그인" 버튼이 호출한다.
 *
 * scripts/create-test-accounts.ts 는 INSERT 전용(이미 있으면 건너뜀)이라
 *   ① 스크립트를 안 돌린 새 로컬 DB
 *   ② 예전에 다른 비밀번호로 만들어진 계정
 *   ③ SellerProfile 이 없거나 isApproved=false 라 authorize() 가 막는 뷰티 전문가 계정
 * 세 경우 모두 버튼 로그인이 실패했다. 이 라우트는 로그인 직전에 계정 상태를
 * 항상 "로그인 가능"하게 맞춰준다(비밀번호 재설정 포함).
 *
 * 운영에서는 절대 동작하지 않는다(NODE_ENV !== "development" → 404).
 */

const TEST_ACCOUNTS = {
  admin: {
    email: "test-admin@beautymate.com",
    name: "테스트 관리자",
    password: "TestAdmin123!",
    // DB enum 에 존재하는 첫 값을 사용한다.
    rolePreference: ["SUPER_ADMIN"],
  },
  consultant: {
    email: "test-consultant@beautymate.com",
    name: "테스트 뷰티 전문가",
    password: "TestConsult123!",
    // CONSULTANT 가 없는 레거시 DB 는 SELLER 로 저장 → normalizeRole 이 CONSULTANT 로 매핑
    rolePreference: ["CONSULTANT", "SELLER"],
  },
  customer: {
    email: "test-customer@beautymate.com",
    name: "테스트 고객",
    password: "TestCustomer123!",
    rolePreference: ["CUSTOMER", "BUYER"],
  },
} as const;

type TestAccountKey = keyof typeof TEST_ACCOUNTS;

/** users.role 컬럼이 실제로 허용하는 enum 값 목록 (조회 실패 시 빈 배열). */
async function readRoleEnum(): Promise<string[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ COLUMN_TYPE: string }[]>(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`,
    );
    if (!rows.length) return [];
    // "enum('SUPER_ADMIN','SELLER',...)" → ["SUPER_ADMIN","SELLER",...]
    return Array.from(rows[0].COLUMN_TYPE.matchAll(/'([^']+)'/g)).map((m) => m[1]);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let key: string | undefined;
  try {
    const body = await request.json();
    key = body?.key;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const account = TEST_ACCOUNTS[key as TestAccountKey];
  if (!account) {
    return NextResponse.json(
      { error: `알 수 없는 테스트 계정 키: ${String(key)}` },
      { status: 400 },
    );
  }

  try {
    const allowed = await readRoleEnum();
    const role =
      account.rolePreference.find((r) => allowed.includes(r)) ?? account.rolePreference[0];

    const hashedPassword = await bcrypt.hash(account.password, 10);

    // select: { id: true } — 스키마 드리프트(미반영 컬럼) 대비, 전체 컬럼 SELECT 회피
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        password: hashedPassword,
        role: role as any,
        isActive: true,
        mustResetPassword: false,
      },
      create: {
        email: account.email,
        name: account.name,
        password: hashedPassword,
        role: role as any,
        isActive: true,
      },
      select: { id: true, email: true, name: true },
    });

    // 뷰티 전문가 계정은 SellerProfile 이 있어야 하고 승인 상태여야 authorize() 를 통과한다.
    if (key === "consultant") {
      const profile = await prisma.sellerProfile.findUnique({
        where: { userId: user.id },
        select: { id: true, isApproved: true },
      });
      if (!profile) {
        await ensureSellerProfile(user); // isApproved: true 로 생성
      } else if (!profile.isApproved) {
        await prisma.sellerProfile.update({
          where: { id: profile.id },
          data: { isApproved: true },
          select: { id: true },
        });
      }
    }

    return NextResponse.json({ ok: true, email: account.email, role });
  } catch (error) {
    console.error("[dev/ensure-test-account] 실패:", error);
    const message = error instanceof Error ? error.message : String(error);

    // DB 자체가 안 붙는 경우가 가장 흔하다 — 계정 문제로 오해하지 않도록 따로 안내한다.
    const isDbDown =
      message.includes("Unknown authentication plugin") ||
      message.includes("auth_gssapi_client") ||
      message.includes("Access denied") ||
      message.includes("Unknown database") ||
      message.includes("Can't reach database server") ||
      message.includes("ECONNREFUSED");
    if (isDbDown) {
      return NextResponse.json(
        {
          error:
            "DB 연결에 실패했습니다. 터미널에서 `npx tsx scripts/check-db.ts` 를 실행하면 원인과 해결용 SQL 이 출력됩니다.",
          detail: message.split("\n").slice(0, 3).join(" ").trim(),
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
