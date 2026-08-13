import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AI_OPENAI_KEY, getOpenAiKey, maskApiKey, setSettings } from "@/lib/settings";

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

// GET: 저장된 OpenAI 키 상태 (원문은 절대 반환하지 않고 마스킹만)
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const key = await getOpenAiKey();
  return NextResponse.json({ hasKey: Boolean(key), maskedKey: maskApiKey(key) });
}

// PUT: OpenAI 키 저장 (빈 문자열이면 삭제와 동일)
export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await req.json().catch(() => ({}) as any);
    const raw = typeof body?.openaiKey === "string" ? body.openaiKey.trim() : "";

    if (raw && !/^sk-[A-Za-z0-9_\-]{10,}$/.test(raw)) {
      return NextResponse.json({ error: "OpenAI 키 형식이 올바르지 않습니다 (sk- 로 시작)" }, { status: 400 });
    }

    await setSettings({ [AI_OPENAI_KEY]: raw });

    return NextResponse.json({
      ok: true,
      hasKey: Boolean(raw),
      maskedKey: maskApiKey(raw),
    });
  } catch (error: any) {
    console.error("[admin/ai-settings] 저장 실패:", error?.message || error);
    return NextResponse.json({ error: "AI 설정 저장에 실패했습니다" }, { status: 500 });
  }
}

// POST: 연결 테스트 (body.openaiKey 가 있으면 그 키로, 없으면 저장된 키로)
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await req.json().catch(() => ({}) as any);
    const provided = typeof body?.openaiKey === "string" ? body.openaiKey.trim() : "";
    const key = provided || (await getOpenAiKey());

    if (!key) {
      return NextResponse.json({ error: "먼저 OpenAI 키를 입력하거나 저장해주세요" }, { status: 400 });
    }

    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const message =
        res.status === 401
          ? "키가 올바르지 않습니다 (401)"
          : res.status === 429
            ? "요청 한도를 초과했습니다 (429)"
            : `OpenAI 응답 오류 (${res.status})`;
      return NextResponse.json({ ok: false, error: message }, { status: 200 });
    }

    const data = await res.json().catch(() => null);
    const hasGpt4o = Array.isArray(data?.data) && data.data.some((m: any) => String(m?.id).startsWith("gpt-4o"));

    return NextResponse.json({
      ok: true,
      message: hasGpt4o ? "연결 성공 — gpt-4o 사용 가능" : "연결 성공 (gpt-4o 접근 권한은 확인 필요)",
    });
  } catch (error: any) {
    console.error("[admin/ai-settings] 연결 테스트 실패:", error?.message || error);
    return NextResponse.json({ ok: false, error: "OpenAI 에 연결할 수 없습니다" }, { status: 200 });
  }
}
