// 개발용 Mock PG — 실제 PG 없이 결제 성공/실패를 시뮬레이션한다.
// 운영 환경에서는 MOCK_PG_ENABLED="true" 를 명시하지 않는 한 완전히 비활성화된다.
import { createHmac, timingSafeEqual } from "crypto";

// ⚠️ 시그니처 시크릿에 하드코딩 폴백을 두지 않는다. 폴백 값은 소스에 그대로 남으므로
//    누구나 "결제 성공" 웹훅을 위조해 미결제 예약을 결제완료로 바꿀 수 있다.
//    시크릿이 없으면 Mock PG 자체를 비활성화한다.
function mockPgSecret(): string | null {
  // 전용 시크릿이 없으면 AUTH_SECRET 재사용 (서버 전용 값)
  const secret = process.env.MOCK_PG_SECRET || process.env.AUTH_SECRET || "";
  return secret ? secret : null;
}

/** Mock PG 활성 여부 — 개발 환경이거나 명시적으로 켠 경우 + 서명 시크릿이 있을 때만 */
export function isMockPgEnabled(): boolean {
  const turnedOn =
    process.env.NODE_ENV === "development" ||
    process.env.MOCK_PG_ENABLED === "true";
  if (!turnedOn) return false;
  if (!mockPgSecret()) {
    console.error("[mockPg] MOCK_PG_SECRET/AUTH_SECRET 미설정 — Mock PG 를 비활성화합니다.");
    return false;
  }
  return true;
}

export interface MockWebhookPayload {
  reservationId: string;
  result: "success" | "fail";
  timestamp: number;
}

/** 웹훅 시그니처 생성 — PG사 서버 서명을 흉내낸다. 시크릿이 없으면 빈 문자열. */
export function signMockWebhook(payload: MockWebhookPayload): string {
  const secret = mockPgSecret();
  if (!secret) return "";
  return createHmac("sha256", secret)
    .update(`${payload.reservationId}.${payload.result}.${payload.timestamp}`)
    .digest("hex");
}

/** 웹훅 시그니처 검증 (타이밍 공격 방지 비교 + 5분 유효시간) */
export function verifyMockWebhook(
  payload: MockWebhookPayload,
  signature: string,
): { ok: boolean; reason?: string } {
  if (!mockPgSecret()) {
    return { ok: false, reason: "Mock PG 서명 키가 설정되지 않았습니다" };
  }
  if (Math.abs(Date.now() - payload.timestamp) > 5 * 60 * 1000) {
    return { ok: false, reason: "시그니처 유효시간 만료" };
  }
  const expected = signMockWebhook(payload);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature || "", "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "시그니처 불일치" };
  }
  return { ok: true };
}
