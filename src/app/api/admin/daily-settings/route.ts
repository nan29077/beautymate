import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DAILY_API_KEY_SETTING, getDailyApiKey, maskApiKey, setSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 }) };
  if (session.user.role !== "SUPER_ADMIN") {
    return { error: NextResponse.json({ error: "권한이 없습니다" }, { status: 403 }) };
  }
  return { error: null };
}

// GET: 저장된 Daily.co 키 상태 (원문 미반환, 마스킹만)
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const key = await getDailyApiKey();
  return NextResponse.json({ hasKey: Boolean(key), maskedKey: maskApiKey(key) });
}

// PUT: Daily.co 키 저장 (빈 문자열이면 삭제)
export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await req.json().catch(() => ({}) as any);
    const raw = typeof body?.dailyApiKey === "string" ? body.dailyApiKey.trim() : "";

    await setSettings({ [DAILY_API_KEY_SETTING]: raw });

    return NextResponse.json({
      ok: true,
      hasKey: Boolean(raw),
      maskedKey: maskApiKey(raw),
    });
  } catch (error: any) {
    console.error("[admin/daily-settings] 저장 실패:", error?.message || error);
    return NextResponse.json({ error: "Daily.co 설정 저장에 실패했습니다" }, { status: 500 });
  }
}

// POST: Daily.co 키 유효성 테스트 (/v1/rooms GET 호출)
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await req.json().catch(() => ({}) as any);
    const provided = typeof body?.dailyApiKey === "string" ? body.dailyApiKey.trim() : "";
    const key = provided || (await getDailyApiKey());

    if (!key) {
      return NextResponse.json({ error: "먼저 Daily.co API 키를 입력하거나 저장해주세요" }, { status: 400 });
    }

    const res = await fetch("https://api.daily.co/v1/rooms", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const message =
        res.status === 401
          ? "키가 올바르지 않습니다 (401 Unauthorized)"
          : res.status === 403
            ? "접근 권한이 없습니다 (403 Forbidden)"
            : `Daily.co 응답 오류 (${res.status})`;
      return NextResponse.json({ ok: false, error: message }, { status: 200 });
    }

    const data = await res.json().catch(() => null);
    const roomCount = Array.isArray(data?.data) ? data.data.length : 0;

    return NextResponse.json({
      ok: true,
      message: `연결 성공 — 현재 방 ${roomCount}개`,
    });
  } catch (error: any) {
    console.error("[admin/daily-settings] 연결 테스트 실패:", error?.message || error);
    return NextResponse.json({ ok: false, error: "Daily.co 에 연결할 수 없습니다" }, { status: 200 });
  }
}
