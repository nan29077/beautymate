import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// 개발 전용 — 테스트 고객 계정이 없으면 자동 생성 (idempotent)
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "개발 환경에서만 사용 가능합니다." }, { status: 403 });
  }

  const email = "customer1@example.com";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: true, created: false });
  }

  const hashedPassword = await bcrypt.hash("password123", 10);
  await prisma.user.create({
    data: {
      email,
      name: "테스트고객",
      password: hashedPassword,
      role: "CUSTOMER",
    },
  });

  return NextResponse.json({ ok: true, created: true });
}
