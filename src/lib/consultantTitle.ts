// 뷰티 전문가 호칭(직함) — 이름 뒤에 붙는 전문 분야별 직함.
//
// 호칭 결정 순서
//   1) DB 지정값: settings 테이블 `consultant.titles` (JSON: { "<sellerProfileId>": "테라피스트" })
//      → 서버에서 getConsultantTitleMap()(lib/settings.ts)으로 읽어 title 로 넘긴다.
//   2) 미지정이면 뷰티 전문가 id 해시로 고정 선택 — 같은 뷰티 전문가는 언제나 같은 호칭이 나오고,
//      SSR/CSR 결과가 동일해 하이드레이션 불일치가 없다. (lib/defaults 의 아바타 선택과 동일한 방식)
//
// ⚠️ 클라이언트 컴포넌트에서도 import 하므로 prisma 등 서버 전용 모듈을 넣지 않는다.

export const CONSULTANT_TITLES = ["원장", "디자이너", "아티스트", "테라피스트", "컨설턴트"] as const;
export type ConsultantTitle = (typeof CONSULTANT_TITLES)[number];

const MALE_TITLES: readonly ConsultantTitle[] = CONSULTANT_TITLES;
const FEMALE_TITLES: readonly ConsultantTitle[] = CONSULTANT_TITLES;

// seed 가 비어 있어도(select 누락 등) 화면이 죽지 않도록 방어 — 고정 호칭으로 폴백.
function computeHash(seed: string): number {
  if (!seed) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}

/** 뷰티 전문가 id(+성별)로 항상 같은 호칭을 고른다 */
export function pickConsultantTitle(seed: string, gender?: string | null): ConsultantTitle {
  const pool =
    gender === "male" ? MALE_TITLES : gender === "female" ? FEMALE_TITLES : CONSULTANT_TITLES;
  return pool[computeHash(seed) % pool.length];
}

/** 이름이 이미 호칭으로 끝나는지 확인한다. */
export function hasConsultantTitle(name: string): boolean {
  const trimmed = (name || "").trim();
  return CONSULTANT_TITLES.some((t) => trimmed.endsWith(t));
}

/**
 * "홍길동" → "홍길동 디자이너"
 *
 * @param name  뷰티 전문가 표시 이름 (shopName 등)
 * @param seed  호칭 고정용 시드 (뷰티 전문가 id — 없으면 이름으로 폴백)
 * @param opts.title  DB 지정 호칭 (있으면 최우선)
 * @param opts.gender 뷰티 전문가 성별("male" | "female" | null)
 */
export function formatConsultantName(
  name: string | null | undefined,
  seed?: string | null,
  opts?: { title?: string | null; gender?: string | null },
): string {
  const base = (name || "").trim();
  if (!base) return "";
  if (hasConsultantTitle(base)) return base;

  const explicit = opts?.title?.trim();
  const title = explicit || pickConsultantTitle(seed || base, opts?.gender);
  return `${base} ${title}`;
}
