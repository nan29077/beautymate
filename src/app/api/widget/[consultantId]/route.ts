import { NextResponse } from "next/server";
import { getWidgetData } from "@/lib/widget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
// GET /api/widget/[consultantId]?date=YYYY-MM-DD
// 프리즘/OBS 라이브 위젯용 공개 API (인증 불필요).
// consultantId 는 User.id 를 우선으로 하되, SellerProfile.id / slug 로도 조회된다.
// ─────────────────────────────────────────────

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ consultantId: string }> | { consultantId: string } }
) {
  try {
    const { consultantId } = await Promise.resolve(params);
    const date = new URL(request.url).searchParams.get("date");

    const data = await getWidgetData(consultantId, date);
    if (!data) {
      return NextResponse.json(
        { error: "상담사를 찾을 수 없습니다." },
        { status: 404, headers: NO_STORE }
      );
    }

    return NextResponse.json(data, { headers: NO_STORE });
  } catch (e) {
    console.error("Widget API error:", e);
    return NextResponse.json(
      { error: "위젯 정보를 불러오지 못했습니다." },
      { status: 500, headers: NO_STORE }
    );
  }
}
