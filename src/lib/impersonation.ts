import crypto from "crypto";

// 최고관리자 "임시 로그인" 용 단기 서명 토큰.
// - 관리자 전용 API(/api/admin/impersonate)에서만 발급되며,
//   NextAuth 의 "impersonate" credentials provider 가 서명/만료를 검증해 해당 유저로 로그인시킨다.
//
// ⚠️ 시크릿에 하드코딩 폴백을 두면 안 된다. 폴백 값은 소스에 그대로 남으므로,
//    AUTH_SECRET 이 비어 있는 환경에서는 누구나 임의 userId 로 토큰을 위조해
//    최고관리자 계정으로 로그인할 수 있다. 시크릿이 없으면 기능 자체를 끈다.
const DEFAULT_TTL_MS = 120_000; // 120초 (새 탭에서 로그인 완료까지 여유)

function impersonationSecret(): string | null {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
  return secret ? secret : null;
}

/** 임시 로그인 기능 사용 가능 여부 (서명 시크릿이 설정된 경우에만 true) */
export function isImpersonationEnabled(): boolean {
  return impersonationSecret() !== null;
}

/** 서명 토큰 발급. 시크릿 미설정 시 null → 호출부는 기능을 비활성화 처리한다. */
export function signImpersonationToken(
  userId: string,
  ttlMs: number = DEFAULT_TTL_MS,
): string | null {
  const secret = impersonationSecret();
  if (!secret) {
    console.error("[impersonation] AUTH_SECRET 미설정 — 임시 로그인 기능을 비활성화합니다.");
    return null;
  }
  const exp = Date.now() + ttlMs;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyImpersonationToken(token: string): string | null {
  const secret = impersonationSecret();
  if (!secret) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return null;
    const [userId, expStr, sig] = parts;
    const payload = `${userId}.${expStr}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    if (Date.now() > Number(expStr)) return null;
    return userId;
  } catch {
    return null;
  }
}
