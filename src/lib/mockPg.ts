// 개발용 Mock PG — 실제 PG 없이 결제 성공/실패를 시뮬레이션한다.
// 운영 환경에서는 MOCK_PG_ENABLED="true" 를 명시하지 않는 한 완전히 비활성화된다.
import { createHmac, timingSafeEqual } from "crypto";

/** Mock PG 활성 여부 — 개발 환경이거나 명시적으로 켠 경우만 */
export function isMockPgEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.MOCK_PG_ENABLED === "true"
  );
}

function mockPgSecret(): string {
  // 전용 시크릿이 없으면 AUTH_SECRET 재사용 (서버 전용 값)
  return process.env.MOCK_PG_SECRET || process.env.AUTH_SECRET || "mock-pg-dev-secret";
}

export interface MockWebhookPayload {
  reservationId: string;
  result: "success" | "fail";
  timestamp: number;
}

/** 웹훅 시그니처 생성 — PG사 서버 서명을 흉내낸다 */
export function signMockWebhook(payload: MockWebhookPayload): string {
  return createHmac("sha256", mockPgSecret())
    .update(`${payload.reservationId}.${payload.result}.${payload.timestamp}`)
    .digest("hex");
}

/** 웹훅 시그니처 검증 (타이밍 공격 방지 비교 + 5분 유효시간) */
export function verifyMockWebhook(
  payload: MockWebhookPayload,
  signature: string,
): { ok: boolean; reason?: string } {
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
