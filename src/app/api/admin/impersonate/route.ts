import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signImpersonationToken } from "@/lib/impersonation";

export const dynamic = "force-dynamic";

// 최고관리자 전용: 대상 회원 계정으로 임시 로그인하기 위한 단기 토큰 발급.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { userId } = await req.json().catch(() => ({}));
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "대상 회원이 올바르지 않습니다." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true, role: true },
  });
  if (!target || !target.isActive) {
    return NextResponse.json({ error: "대상 회원을 찾을 수 없거나 비활성 상태입니다." }, { status: 404 });
  }

  const token = signImpersonationToken(target.id);
  if (!token) {
    // AUTH_SECRET 미설정 — 서명 없이 토큰을 내보내면 위조가 가능하므로 기능을 막는다.
    return NextResponse.json(
      { error: "임시 로그인이 비활성화되어 있습니다. (서버 서명 키 미설정)" },
      { status: 503 },
    );
  }
  return NextResponse.json({ token, role: target.role });
}
