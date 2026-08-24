// ONGI(온기) 간편 계좌결제 연동.
// 결제창 URL은 해시 라우터(/#/qr/{QR}) + ?checkout=pg 형식.
// 결제 완료 후 서버 통지(callback_url)는 JSON POST 로 전달되고,
// ONGI 자체 HMAC 서명이 없으므로 우리가 callback_url 에 심어 보내는
// HMAC 토큰(buildOngiCallbackToken) + payment_code 멱등 처리 + 금액 교차 검증을 사용한다.

import crypto from "crypto";

const MID = process.env.ONGI_MID || "";
const API_KEY = process.env.ONGI_API_KEY || "";
const QR_CODE = process.env.ONGI_QR_CODE || "";
const PAY_URL = (process.env.ONGI_PAY_URL || "https://pay.ongi.site").replace(/\/$/, "");
const API_BASE = (process.env.ONGI_API_BASE || "https://www.ongi.site/api").replace(/\/$/, "");

export const ongiConfig = {
  mid: MID,
  apiKey: API_KEY,
  qrCode: QR_CODE,
  payUrl: PAY_URL,
  apiBase: API_BASE,
};

export function ensureOngiConfigured() {
  if (!QR_CODE) {
    throw new Error("ONGI 환경변수가 설정되지 않았습니다. (ONGI_QR_CODE)");
  }
}

// ── 콜백 위조 방지 토큰 ─────────────────────────────
// ONGI 통지에는 자체 서명이 없어, 예약 id 만 알면 가짜 성공 통지를 보낼 수 있다.
// prepare 단계에서 callback_url 에 HMAC(orderId) 토큰을 심어 보내고,
// callback 단계에서 동일 토큰인지 검증한다. 시크릿은 서버에만 존재한다.
// ⚠️ 하드코딩 폴백 금지. 폴백 시크릿은 소스에 남아 위조 토큰을 만들 수 있게 되고,
//    시크릿이 없다고 검증을 건너뛰면(fail-open) 예약 id 만 알면 가짜 입금 통지로
//    미결제 예약을 결제완료로 바꿀 수 있다. 시크릿이 없으면 검증을 실패시킨다(fail-closed).
function ongiCallbackSecret(): string | null {
  const secret =
    process.env.ONGI_CALLBACK_SECRET ||
    process.env.ONGI_API_KEY ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "";
  return secret ? secret : null;
}

/** 콜백 서명 검증 가능 여부 (시크릿 설정 여부) */
export function isOngiCallbackSigningConfigured(): boolean {
  return ongiCallbackSecret() !== null;
}

export function buildOngiCallbackToken(orderId: string): string {
  const secret = ongiCallbackSecret();
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(orderId, "utf8").digest("hex");
}

export function verifyOngiCallbackToken(orderId: string, token: string | null): boolean {
  const expected = buildOngiCallbackToken(orderId);
  if (!expected) {
    // 시크릿 미설정 환경 — 검증이 불가능하므로 통지를 거부한다.
    console.error("[ongi] 콜백 토큰 시크릿 미설정 — 서명 검증 불가로 통지를 거부합니다.");
    return false;
  }
  if (!token || token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

export interface OngiCheckoutParams {
  amount: number;
  name: string;
  phone: string;
  callbackUrl: string;
  returnUrl?: string;
}

// pay.ongi.site 는 해시 라우터를 쓰므로 # 뒤에 path/query 를 붙인다.
// 예: https://pay.ongi.site/#/qr/{QR}?checkout=pg&name=...&phone=...&amount=...
export function buildOngiCheckoutUrl(params: OngiCheckoutParams): string {
  ensureOngiConfigured();
  const phone = params.phone.replace(/[^0-9]/g, "");
  const query = new URLSearchParams({
    checkout: "pg",
    name: params.name,
    phone,
    amount: String(Math.round(params.amount)),
    callback_url: params.callbackUrl,
  });
  if (params.returnUrl) query.set("return_url", params.returnUrl);
  return `${PAY_URL}/#/qr/${encodeURIComponent(QR_CODE)}?${query.toString()}`;
}

// 콜백 본문 — 이메일 가이드의 JSON 예시.
// 결제수단·예약 여부에 따라 일부 필드는 null 일 수 있음.
export interface OngiCallbackPayload {
  event: string;          // "payment.completed"
  payment_code: string;   // "ONGI_…" — 외부 식별자 (멱등 키)
  order_code: string | null;
  organization_pk: number;
  state: string;          // "완료"
  division: string;       // "one_time" 등
  payment_amt: number;
  pay_price: number;
  discnt_price: number;
  payment_method: string; // "계좌결제"
  payment_type: string;   // "일반송금" 등
  auth_no?: string;
  tr_no?: string;
  tr_day?: string;        // "YYYYMMDD"
  tr_time?: string;       // "HHmmss"
  result_cd: string;      // "0" 이 성공
  result_msg?: string;
  member_name?: string;
  phone?: string;
  [k: string]: unknown;
}

export function isOngiCallbackSuccess(payload: OngiCallbackPayload): boolean {
  return (
    payload.event === "payment.completed" &&
    payload.state === "완료" &&
    payload.result_cd === "0"
  );
}
