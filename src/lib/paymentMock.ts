// 결제(가상계좌 입금 · 상품권 결제) 목업 — 데이터와 순수 로직.
//
// ⚠️ 목업 전용. 실제 PG·DB 와 연결되지 않는다.
//   - 가상계좌 발급, 상품권 구매·PIN 검증, 잔액 반영은 모두 화면상 시뮬레이션이다.
//   - 실제 연동 시 이 파일의 함수 시그니처를 유지한 채 내부만 API 호출로 교체하면 된다.
//
// 서버 전용 의존성(prisma 등)을 import 하지 않는다 — 클라이언트 컴포넌트와 서버 페이지가 함께 쓴다.

/** 회원 잔액(목업). 잔액 기능이 실제로 연동되기 전까지 0원으로 고정 — 실서버 고객에게 허위 잔액을 보여주지 않기 위함. */
export const MOCK_WALLET_BALANCE = 0;

/** 결제창 상단에 표시되는 지점 정보 */
export const MOCK_BRANCH = {
  brand: "BEAUTY MATE",
  name: "뷰티메이트 지점",
} as const;

export type MockService = {
  id: string;
  name: string;
  desc: string;
  /** 원 단위 고정가. null 이면 '별도 견적'(선택 불가) */
  price: number | null;
  /** 가격 옆 단위 표기 */
  unit: string;
};

/** ① 서비스 선택 목록 — 뷰티메이트 지점 메뉴(예시) */
export const MOCK_SERVICES: MockService[] = [
  { id: "personal-color", name: "퍼스널 컬러 진단", desc: "4계절 톤 분석 · 맞춤 컬러 팔레트 제공", price: 55000, unit: "60분" },
  { id: "makeup-consult", name: "1:1 메이크업 상담", desc: "얼굴형·피부톤에 맞춘 데일리 메이크업 코칭", price: 35000, unit: "40분" },
  { id: "skincare-routine", name: "스킨케어 루틴 컨설팅", desc: "피부 타입 진단 · 제품 루틴 설계", price: 30000, unit: "30분" },
  { id: "hair-styling", name: "헤어 스타일링 상담", desc: "얼굴형 맞춤 헤어 스타일 · 홈 스타일링 팁", price: 30000, unit: "30분" },
  { id: "live-class", name: "라이브 그룹 클래스", desc: "실시간 라이브 메이크업 클래스 1회 참여", price: 15000, unit: "1회" },
  { id: "wedding-total", name: "웨딩·행사 토탈 컨설팅", desc: "행사 일정에 맞춘 메이크업·헤어 종합 상담", price: null, unit: "별도 견적" },
];

export const VOUCHER_TYPES = [
  { id: "lotte", label: "롯데상품권" },
  { id: "emart", label: "이마트상품권" },
  { id: "partner", label: "기타 제휴 상품권" },
] as const;
export type VoucherTypeId = (typeof VOUCHER_TYPES)[number]["id"];

/** 금액 버튼 — 누를 때마다 합산된다(두 번 누르면 두 번 합산) */
export const AMOUNT_PRESETS = [50000, 100000, 300000, 500000] as const;

/** 상품권 1회 구매 한도(목업). 실제 한도는 PG·발행사 정책으로 교체 */
export const VOUCHER_PURCHASE_MAX = 2_000_000;

/** PIN 자릿수(구분자 제외) */
export const PIN_LENGTH = 16;

// ─────────────────────────────────────────────
// 순수 함수
// ─────────────────────────────────────────────

/**
 * 1,234,567원 형식. toLocaleString 은 서버(Node)·브라우저 ICU 차이로
 * 하이드레이션 불일치가 날 수 있어 정규식으로 직접 포맷한다.
 */
export function formatWon(amount: number): string {
  const n = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

/** 선택된 서비스 합계. 별도 견적(price=null)·알 수 없는 id 는 무시 */
export function sumSelectedServices(selectedIds: readonly string[], services: readonly MockService[] = MOCK_SERVICES): number {
  const picked = new Set(selectedIds);
  return services.reduce((sum, s) => (picked.has(s.id) && typeof s.price === "number" ? sum + s.price : sum), 0);
}

/** 서비스 선택 토글 — 별도 견적 항목은 선택되지 않는다 */
export function toggleService(selectedIds: readonly string[], id: string, services: readonly MockService[] = MOCK_SERVICES): string[] {
  const svc = services.find((s) => s.id === id);
  if (!svc || svc.price === null) return [...selectedIds];
  return selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
}

/**
 * 금액 버튼 합산. 한도를 넘으면 더하지 않고 기존 값을 유지한다.
 * @returns [다음 금액, 한도 초과로 거부되었는지]
 */
export function addAmount(current: number, add: number, max: number = VOUCHER_PURCHASE_MAX): [number, boolean] {
  const next = current + add;
  if (next > max) return [current, true];
  return [next, false];
}

/**
 * PIN 입력 정규화 — 영문·숫자만 남기고 대문자화, 4자리마다 하이픈.
 * 대소문자를 구분하지 않는다(안내 문구와 일치).
 */
export function formatPin(raw: string): string {
  const cleaned = raw.replace(/[^0-9a-zA-Z]/g, "").toUpperCase().slice(0, PIN_LENGTH);
  return cleaned.replace(/(.{4})(?=.)/g, "$1-");
}

export function isPinComplete(pin: string): boolean {
  return pin.replace(/-/g, "").length === PIN_LENGTH;
}

/** 내역 표시용 PIN 마스킹: 1234-XXXX-XXXX-5678 */
export function maskPin(pin: string): string {
  const raw = pin.replace(/-/g, "");
  if (raw.length < 8) return "XXXX";
  return `${raw.slice(0, 4)}-XXXX-XXXX-${raw.slice(-4)}`;
}

/** KST 기준 'YYYY-MM-DD HH:mm' */
export function formatKst(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${kst.getUTCFullYear()}-${p(kst.getUTCMonth() + 1)}-${p(kst.getUTCDate())} ${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())}`;
}

export type MockVirtualAccount = {
  bank: string;
  accountNumber: string;
  holder: string;
  amount: number;
  dueAt: string;
};

/**
 * 목업 가상계좌 표시값.
 * 실서버의 실제 고객이 보는 화면이므로 실제 은행명·실제 계좌 형식·실제 법인명을 쓰지 않는다.
 * (실존 은행 + 무작위 번호를 보여주면 고객이 그 번호로 송금해 타인 계좌로 돈이 갈 위험이 있다)
 */
export const MOCK_VBANK = {
  bank: "예시은행",
  accountNumber: "000-000000-000",
  holder: "예시 예금주",
} as const;

/** 가상계좌 발급(목업) — 항상 명백한 예시 계좌를 돌려준다. 입금 기한은 발급 후 24시간(KST). */
export function createMockVirtualAccount(amount: number, now: Date = new Date()): MockVirtualAccount {
  const due = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return { ...MOCK_VBANK, amount, dueAt: formatKst(due) };
}

// ─────────────────────────────────────────────
// 내역 (예시 데이터)
// ─────────────────────────────────────────────

export type PaymentStatus = "PENDING" | "PAID" | "EXPIRED";
export type VoucherStatus = "REGISTERED" | "PURCHASED";

export type PaymentHistoryRow = {
  id: string;
  at: string;
  method: "VBANK" | "VOUCHER";
  item: string;
  amount: number;
  status: PaymentStatus;
  note: string;
  sample?: boolean;
};

export type VoucherHistoryRow = {
  id: string;
  at: string;
  voucher: string;
  pinMasked: string;
  amount: number;
  status: VoucherStatus;
  sample?: boolean;
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "입금 대기",
  PAID: "결제 완료",
  EXPIRED: "기한 만료",
};

export const VOUCHER_STATUS_LABEL: Record<VoucherStatus, string> = {
  REGISTERED: "사용 완료",
  PURCHASED: "구매 완료",
};

export const SAMPLE_PAYMENT_HISTORY: PaymentHistoryRow[] = [
  { id: "s1", at: "2026-10-08 14:32", method: "VBANK", item: "퍼스널 컬러 진단", amount: 55000, status: "PAID", note: "-", sample: true },
  { id: "s2", at: "2026-10-05 10:15", method: "VOUCHER", item: "1:1 메이크업 상담", amount: 35000, status: "PAID", note: "롯데상품권 (PIN 1234-XXXX-XXXX-5678)", sample: true },
  { id: "s3", at: "2026-09-28 18:07", method: "VBANK", item: "스킨케어 루틴 컨설팅", amount: 30000, status: "EXPIRED", note: "입금 기한 경과", sample: true },
  { id: "s4", at: "2026-09-21 11:25", method: "VBANK", item: "라이브 그룹 클래스", amount: 15000, status: "PAID", note: "-", sample: true },
];

export const SAMPLE_VOUCHER_HISTORY: VoucherHistoryRow[] = [
  { id: "v1", at: "2026-10-05 10:14", voucher: "롯데상품권", pinMasked: "1234-XXXX-XXXX-5678", amount: 50000, status: "REGISTERED", sample: true },
  { id: "v2", at: "2026-09-30 09:02", voucher: "이마트상품권", pinMasked: "-", amount: 100000, status: "PURCHASED", sample: true },
];

/** 선택 서비스 요약 문구: "퍼스널 컬러 진단 외 1건" */
export function summarizeServices(selectedIds: readonly string[], services: readonly MockService[] = MOCK_SERVICES): string {
  const names = services.filter((s) => selectedIds.includes(s.id) && s.price !== null).map((s) => s.name);
  if (names.length === 0) return "-";
  return names.length === 1 ? names[0] : `${names[0]} 외 ${names.length - 1}건`;
}
