// 상담 예약(Reservation / TimeSlot) 공통 헬퍼.
//
// ⚠️ 이 파일은 클라이언트 컴포넌트에서도 import 하므로 prisma 등 서버 전용 모듈을
//    절대 import 하지 않는다. (라벨/시간 계산 같은 순수 함수 + safeQuery 래퍼만)

/**
 * Reservation / TimeSlot 테이블은 운영 DB에 아직 없을 수 있다.
 * 모든 관련 조회를 이 래퍼로 감싸 실패 시 fallback 값으로 폴백한다.
 * (테이블 미생성 → 기존 페이지·기능은 전혀 영향 없음)
 */
export async function safeQuery<T>(fn: () => Promise<T>, fallback: T, label = "consulting"): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    // P2021: 테이블 없음 / P1001: DB 연결 실패 등 — 로그만 남기고 폴백
    console.warn(`[${label}] 상담 데이터 조회 실패 → 폴백 사용:`, e?.code || e?.message || e);
    return fallback;
  }
}

export type ReservationStatusKey = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type ConsultTypeKey = "VIDEO" | "PHONE" | "VISIT";

export const RESERVATION_STATUS_META: Record<
  ReservationStatusKey,
  { label: string; color: string; dot: string }
> = {
  PENDING: { label: "대기중", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  CONFIRMED: { label: "확정", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  COMPLETED: { label: "완료", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  CANCELLED: { label: "취소", color: "bg-gray-100 text-gray-500 border-gray-200", dot: "bg-gray-400" },
};

export const CONSULT_TYPE_META: Record<ConsultTypeKey, { label: string; icon: "video" | "phone" | "map" }> = {
  VIDEO: { label: "화상 상담", icon: "video" },
  PHONE: { label: "전화 상담", icon: "phone" },
  VISIT: { label: "방문 상담", icon: "map" },
};

export function statusMeta(status: string) {
  return RESERVATION_STATUS_META[status as ReservationStatusKey] ?? RESERVATION_STATUS_META.PENDING;
}

export function consultTypeMeta(type: string) {
  return CONSULT_TYPE_META[type as ConsultTypeKey] ?? CONSULT_TYPE_META.VIDEO;
}

/**
 * 진행 방식 추론 (폴백 경로).
 *
 * 뷰티 서비스명("[화상] 뷰티 정통풀이 60분")에서 방식을 읽어낸다.
 * 매칭되는 표현이 없으면 화상(VIDEO)으로 본다.
 *
 * ※ DirectProduct.consultType 컬럼이 채워져 있으면 그 값이 우선이다
 *   (productConsultMeta 참고). 이 함수는 컬럼이 비어 있을 때의 폴백이다.
 */
export function inferConsultType(productName: string | null | undefined): ConsultTypeKey {
  const name = productName || "";
  if (/전화|음성|보이스|phone/i.test(name)) return "PHONE";
  if (/방문|대면|오프라인|내방|visit/i.test(name)) return "VISIT";
  return "VIDEO";
}

/** 뷰티 서비스 카드에 표시할 방식 + 소요 시간 */
export type ConsultMeta = { type: ConsultTypeKey; durationMinutes: number | null };

/**
 * 뷰티 서비스의 방식·소요시간을 뽑아낸다.
 *
 * 1순위: description 이 `{"type":"VIDEO","duration":60}` 형태의 JSON 이면 그 값을 쓴다.
 * 2순위: 상품명에서 방식을 추론하고(`inferConsultType`) "60분" 같은 표기에서 시간을 읽는다.
 *
 * DirectProduct.description 은 자유 텍스트라 JSON 이 아닌 경우가 대부분이라
 * 두 경로를 모두 지원한다. (JSON 규격을 정식으로 쓰려면 스키마에 컬럼을 두는 편이 낫다)
 */
export function parseConsultMeta(
  name: string | null | undefined,
  description?: string | null,
): ConsultMeta {
  if (description) {
    try {
      const parsed = JSON.parse(description);
      if (parsed && typeof parsed === "object") {
        const t = String(parsed.type || "").toUpperCase();
        if (t === "VIDEO" || t === "PHONE" || t === "VISIT") {
          const d = Number(parsed.duration);
          return { type: t, durationMinutes: Number.isFinite(d) && d > 0 ? d : null };
        }
      }
    } catch {
      // JSON 이 아니면 아래 상품명 추론으로 넘어간다
    }
  }

  const text = name || "";
  const m = /(\d{1,3})\s*분/.exec(text);
  const minutes = m ? Number(m[1]) : null;
  return {
    type: inferConsultType(text),
    durationMinutes: minutes && minutes > 0 ? minutes : null,
  };
}

/**
 * 뷰티 서비스의 방식·소요시간 확정.
 *
 * 우선순위: DirectProduct.consultType / durationMinutes 컬럼 → 상품명·description 추론.
 * 두 컬럼은 운영 DB 반영 전까지 전부 null 이므로(docs/DDL_CONSULTING.sql ②)
 * 항상 폴백이 동작하도록 둔다.
 */
export function productConsultMeta(product: {
  name?: string | null;
  description?: string | null;
  consultType?: string | null;
  durationMinutes?: number | null;
}): ConsultMeta {
  const rawType = String(product.consultType || "").toUpperCase();
  const hasType = rawType === "VIDEO" || rawType === "PHONE" || rawType === "VISIT";

  const rawDuration = Number(product.durationMinutes);
  const hasDuration = Number.isFinite(rawDuration) && rawDuration > 0;

  if (hasType && hasDuration) {
    return { type: rawType as ConsultTypeKey, durationMinutes: rawDuration };
  }

  const inferred = parseConsultMeta(product.name, product.description);
  return {
    type: hasType ? (rawType as ConsultTypeKey) : inferred.type,
    durationMinutes: hasDuration ? rawDuration : inferred.durationMinutes,
  };
}

/** 상품 카드 배지 문구 — "영상 60분" / "전화 30분" / "방문 상담" */
export function consultBadgeLabel(meta: ConsultMeta): string {
  const short = meta.type === "PHONE" ? "전화" : meta.type === "VISIT" ? "방문" : "영상";
  if (meta.type === "VISIT") return meta.durationMinutes ? `방문 ${meta.durationMinutes}분` : "방문 상담";
  return meta.durationMinutes ? `${short} ${meta.durationMinutes}분` : `${short} 상담`;
}

// ─────────────────────────────────────────────────────────────
// 상담 가능 시간(TimeSlot) · 예약 슬롯 계산
// ─────────────────────────────────────────────────────────────

/** 상담 단위 시간 선택지 (분) */
export const SLOT_MINUTE_OPTIONS = [30, 60, 90, 120] as const;
export type SlotMinutes = (typeof SLOT_MINUTE_OPTIONS)[number];

/** 0=일 ~ 6=토 */
export const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 뷰티 전문가 요일별 가능 시간 1행 */
export type TimeSlotRule = {
  dayOfWeek: number; // 0=일 ~ 6=토
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  slotMinutes: number;
  isActive: boolean;
};

/** 고객에게 내려보내는 예약 슬롯 */
export type AvailableSlot = {
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  available: boolean;
};

/** 요일별 기본 규칙 (월~금 09:00~18:00 60분, 주말 휴무) */
export function defaultTimeSlotRules(): TimeSlotRule[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startHour: 9,
    startMinute: 0,
    endHour: 18,
    endMinute: 0,
    slotMinutes: 60,
    isActive: dayOfWeek >= 1 && dayOfWeek <= 5,
  }));
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 분(0시 기준) → "HH:MM" */
export function minutesToHHMM(total: number): string {
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

/** "HH:MM" → 분(0시 기준). 형식이 틀리면 null */
export function hhmmToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** "YYYY-MM-DD" 문자열 검증 후 로컬 자정 Date 반환 (형식 오류면 null) */
export function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  // 2026-02-31 같은 값이 3월로 넘어가는 것을 걸러낸다
  if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
  return d;
}

/** Date → "YYYY-MM-DD" (로컬 기준) */
export function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 이미 잡힌 예약이 점유하는 구간 (분 단위, 0시 기준 · 끝은 열린 구간) */
export type TakenInterval = { startMinute: number; endMinute: number };

/**
 * 예약 목록 → 점유 구간 목록.
 *
 * 예약에는 종료 시각이 없으므로 소요 시간으로 끝을 계산한다.
 * 우선순위: 그 예약의 상담 소요 시간(durationMinutes) → 뷰티 전문가의 단위 시간(slotMinutes).
 *
 * @param reservations scheduledAt(+선택적 durationMinutes)을 가진 예약들
 * @param defaultMinutes durationMinutes 가 없을 때 쓸 기본 소요 시간 (보통 rule.slotMinutes)
 */
export function toTakenIntervals(
  reservations: { scheduledAt: Date | string | null; durationMinutes?: number | null }[],
  defaultMinutes: number,
): TakenInterval[] {
  const fallback = Math.max(10, Math.floor(defaultMinutes || 60));
  const out: TakenInterval[] = [];

  for (const r of reservations) {
    if (!r.scheduledAt) continue;
    const d = new Date(r.scheduledAt);
    if (Number.isNaN(d.getTime())) continue;

    const startMinute = d.getHours() * 60 + d.getMinutes();
    const raw = Number(r.durationMinutes);
    const duration = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
    out.push({ startMinute, endMinute: startMinute + duration });
  }
  return out;
}

/**
 * 하루치 예약 슬롯 계산.
 *
 * @param rule       그 요일의 상담 가능 시간 (없거나 isActive=false 면 빈 배열)
 * @param taken      이미 잡힌 예약의 점유 구간 (toTakenIntervals 로 만든다)
 * @param minStartMinute 이 시각 이전 슬롯은 available=false (오늘 날짜의 지난 시간 처리용)
 *
 * 종료 시각을 넘기는 마지막 조각은 슬롯으로 만들지 않는다.
 * (예: 09:00~18:00 / 90분 → 16:30~18:00 까지만, 18:00~19:30 은 생성 안 함)
 *
 * 겹침 판정은 **시작 시각 일치가 아니라 구간 겹침**으로 한다.
 *   기존예약시작 < 슬롯종료  AND  기존예약종료 > 슬롯시작
 * 시작 시각만 비교하면 뷰티 전문가가 단위 시간을 30분에서 60분으로 바꾼 뒤
 * 14:00(60분) 예약이 있는데도 14:30 슬롯이 예약 가능으로 열리는 문제가 생긴다.
 */
export function buildDaySlots(
  rule: TimeSlotRule | null | undefined,
  taken: TakenInterval[] = [],
  minStartMinute: number | null = null,
): AvailableSlot[] {
  if (!rule || !rule.isActive) return [];

  const step = Math.max(10, Math.floor(rule.slotMinutes || 60));
  const start = rule.startHour * 60 + rule.startMinute;
  const end = rule.endHour * 60 + rule.endMinute;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

  const slots: AvailableSlot[] = [];
  // 하루(1440분)를 넘지 않도록 상한을 둬 무한 루프를 막는다
  for (let t = start; t + step <= end && t < 24 * 60; t += step) {
    const slotEnd = t + step;
    const isPast = minStartMinute !== null && t < minStartMinute;
    const overlapped = taken.some((iv) => iv.startMinute < slotEnd && iv.endMinute > t);
    slots.push({
      startTime: minutesToHHMM(t),
      endTime: minutesToHHMM(slotEnd),
      available: !overlapped && !isPast,
    });
  }
  return slots;
}

/** 상담방 입장 가능 시각: 예약 시각 10분 전부터 */
export const ENTER_BEFORE_MS = 10 * 60 * 1000;
/** 상담방 유효 종료: 예약 시각 + 3시간 (Daily 방 만료와 동일) */
export const ROOM_OPEN_AFTER_MS = 3 * 60 * 60 * 1000;

/**
 * 입장 가능 여부.
 * - scheduledAt 이 없으면(일시 미정) 확정 상태에서는 그냥 허용
 * - 예약 10분 전 ~ 예약 3시간 후까지 허용
 */
export function canEnterSession(scheduledAt: string | Date | null | undefined, now: number = Date.now()): boolean {
  if (!scheduledAt) return true;
  const t = new Date(scheduledAt).getTime();
  if (Number.isNaN(t)) return true;
  return now >= t - ENTER_BEFORE_MS && now <= t + ROOM_OPEN_AFTER_MS;
}

/** 입장까지 남은 시간(ms). 이미 입장 가능하거나 시간이 없으면 0 */
export function msUntilEnter(scheduledAt: string | Date | null | undefined, now: number = Date.now()): number {
  if (!scheduledAt) return 0;
  const t = new Date(scheduledAt).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, t - ENTER_BEFORE_MS - now);
}

/** 남은 시간 사람이 읽는 문자열 */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return "곧 입장 가능";
  const totalMin = Math.ceil(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}일 ${hours}시간 후 입장 가능`;
  if (hours > 0) return `${hours}시간 ${mins}분 후 입장 가능`;
  return `${mins}분 후 입장 가능`;
}

/** 예약 일시 표기 (2026년 8월 13일 (목) 오후 2:00) */
export function formatSchedule(value: string | Date | null | undefined): string {
  if (!value) return "일시 미정";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "일시 미정";
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const h = d.getHours();
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]}) ${ampm} ${h12}:${mm}`;
}

/** 짧은 날짜 표기 (2026.08.13) */
export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/**
 * Daily.co iframe URL 조립.
 * - 토큰(`t`)을 붙여 private 방에 입장
 * - PHONE 타입은 카메라 꺼진 상태로 시작
 */
export function buildDailyUrl(
  roomUrl: string | null | undefined,
  token: string | null | undefined,
  consultType: string,
): string | null {
  if (!roomUrl) return null;
  const params: string[] = [];
  if (token) params.push(`t=${encodeURIComponent(token)}`);
  if (consultType === "PHONE") params.push("start_video_off=1");
  if (params.length === 0) return roomUrl;
  return `${roomUrl}${roomUrl.includes("?") ? "&" : "?"}${params.join("&")}`;
}

/** 클라이언트로 넘길 예약 데이터 (Decimal/Date 직렬화 완료본) */
export type SerializedReservation = {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  status: string;
  consultType: string;
  scheduledAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  dailyRoomName: string | null;
  dailyRoomUrl: string | null;
  dailySellerToken: string | null;
  dailyBuyerToken: string | null;
  price: number;
  memo: string | null;
  aiSummary: string | null;
  createdAt: string;
};

/** Prisma Reservation → 직렬화 (토큰은 필요한 쪽만 선택해서 넘긴다) */
export function serializeReservation(r: any): SerializedReservation {
  const iso = (v: any) => (v ? new Date(v).toISOString() : null);
  return {
    id: r.id,
    buyerId: r.buyerId,
    sellerId: r.sellerId,
    productId: r.productId,
    status: String(r.status),
    consultType: String(r.consultType),
    scheduledAt: iso(r.scheduledAt),
    confirmedAt: iso(r.confirmedAt),
    completedAt: iso(r.completedAt),
    cancelledAt: iso(r.cancelledAt),
    dailyRoomName: r.dailyRoomName ?? null,
    dailyRoomUrl: r.dailyRoomUrl ?? null,
    dailySellerToken: r.dailySellerToken ?? null,
    dailyBuyerToken: r.dailyBuyerToken ?? null,
    price: Number(r.price ?? 0),
    memo: r.memo ?? null,
    aiSummary: r.aiSummary ?? null,
    createdAt: new Date(r.createdAt).toISOString(),
  };
}
