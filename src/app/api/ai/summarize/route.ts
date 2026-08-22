import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOpenAiKey } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/summarize — 고객 메모를 고객 친화적인 요약으로 변환 (뷰티 전문가 전용).
 *
 * body: { memo: string, consultType: string, duration: number }
 * res : { summary: string }
 *
 * OpenAI 키는 관리자 설정(settings.'ai.openai_key')에서 읽는다.
 * SDK 없이 fetch 로 chat/completions 를 직접 호출한다.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }
    if (session.user.role !== "CONSULTANT" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}) as any);
    const memo = typeof body?.memo === "string" ? body.memo.trim() : "";
    const consultType = typeof body?.consultType === "string" ? body.consultType : "VIDEO";
    const duration = Number.isFinite(Number(body?.duration)) ? Number(body.duration) : 0;

    if (!memo) {
      return NextResponse.json({ error: "요약할 고객 메모를 입력해주세요" }, { status: 400 });
    }

    const apiKey = await getOpenAiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "관리자 설정에서 OpenAI 키를 등록해주세요" },
        { status: 400 },
      );
    }

    const typeLabel =
      consultType === "PHONE" ? "전화 상담" : consultType === "VISIT" ? "방문 상담" : "화상 상담";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.4,
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content:
              "당신은 뷰티·뷰티 트렌드 요청사항을 고객에게 전달할 요약문으로 정리하는 어시스턴트입니다. " +
              "뷰티 전문가가 적은 메모를 바탕으로, 고객이 읽기 편한 따뜻하고 정중한 존댓말로 요약하세요. " +
              "규칙: (1) 3~5개의 불릿(•)만 출력, (2) 각 불릿은 한 문장, " +
              "(3) 메모에 없는 내용을 지어내지 말 것, (4) 단정적 예언·의학/법률 조언은 피하고 조언 형태로 표현, " +
              "(5) 머리말·맺음말 없이 불릿만 출력.",
          },
          {
            role: "user",
            content:
              `상담 유형: ${typeLabel}\n` +
              `소요 시간: ${duration > 0 ? `${duration}분` : "미기재"}\n\n` +
              `뷰티 전문가 메모:\n${memo}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[ai/summarize] OpenAI 오류:", res.status, errText.slice(0, 500));
      const message =
        res.status === 401
          ? "OpenAI 키가 올바르지 않습니다. 관리자 설정에서 확인해주세요"
          : res.status === 429
            ? "OpenAI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요"
            : "AI 요약 생성에 실패했습니다";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const data = await res.json();
    const summary: string = data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!summary) {
      return NextResponse.json({ error: "AI 요약 결과가 비어 있습니다" }, { status: 502 });
    }

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("[ai/summarize] 오류:", error?.message || error);
    return NextResponse.json({ error: "AI 요약 생성에 실패했습니다" }, { status: 500 });
  }
}
