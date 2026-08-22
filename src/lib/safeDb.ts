// 스키마 드리프트 안전망 — Phase 2 모델(Reservation, TimeSlot 등)은 스키마에 선언돼
// 있지만 운영 DB 반영(db push)은 별도 절차로 진행된다. 테이블/컬럼이 아직 없는 환경에서
// 페이지·API 전체가 죽지 않도록, 조회 실패 시 fallback 값으로 대체한다.
// (getConsultantMemos 의 기존 패턴을 일반화한 것)

/** Prisma P2021(테이블 없음)/P2022(컬럼 없음) 여부 */
export function isMissingSchemaError(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  return code === "P2021" || code === "P2022";
}

/**
 * DB 조회를 안전하게 실행한다. 실패 시 fallback 반환.
 * 테이블/컬럼 미반영(P2021/P2022)은 경고만 남기고, 그 외 오류는 error 로 로깅한다.
 */
export async function safeQuery<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
  timeoutMs = 8000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} DB 조회 시간 초과 (${timeoutMs}ms)`)), timeoutMs);
      }),
    ]);
  } catch (e) {
    if (isMissingSchemaError(e)) {
      console.warn(`[safeQuery] ${label} — 테이블/컬럼 미반영으로 fallback 사용 (DB 스키마 드리프트)`);
    } else {
      console.error(`[safeQuery] ${label} 실패 (fallback 사용):`, e);
    }
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
