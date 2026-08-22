// 메인페이지 편집 가능한 콘텐츠(숫자/성공스토리/혜택) — 서버 전용.
// Setting 테이블에 JSON 문자열로 저장하고, 값이 없으면 코드 기본값을 사용한다.
// (관리자 "사이트 관리 > 메인페이지 관리"에서 수정)

import { getSettingsMap, setSettings } from "@/lib/settings";

// ⚠️ 키를 v2 로 올린 이유 (2026-08-12)
// 운영 DB Setting 테이블에 뷰티메이트 시절 값이 남아 코드 기본값을 덮어쓰고 있었다.
//   home.stats    → "30억+ 누적 거래액", "50+ 활동 라이브 셀러", "98% 배송 만족도"
//   home.benefits → "68% 단골 재구매율", "3.2x 라이브 평균 체류", "정산·배송 걱정 없이"
// DB 값이 코드 기본값보다 우선하는 구조라 기본값만 고쳐서는 화면이 바뀌지 않는다.
// 키를 바꿔 구 행을 아예 읽지 않게 한다. (배너 FOUC 와 동일한 DB 드리프트 유형)
// 구 행(LEGACY_*)은 노출되지 않지만 DB 에는 남아 있다 — 관리자 화면에서 정리 권장.
export const HOME_STATS_KEY = "home.stats.beautymate.v1";
export const HOME_STORIES_KEY = "home.stories.beautymate.v1";
export const HOME_BENEFITS_KEY = "home.benefits.beautymate.v1";

// 더 이상 읽지 않는 구 키 (정리용 참조)
export const LEGACY_HOME_STATS_KEY = "home.stats";
export const LEGACY_HOME_BENEFITS_KEY = "home.benefits";

export type HomeStat = { value: string; label: string };
export type HomeStory = { name: string; quote: string; metric: string; avatar: string };
export type HomeBenefitStat = { value: string; label: string; sub: string };
export type HomeBenefitItem = { iconType: string; title: string; desc: string };
export type HomeBenefits = { stats: HomeBenefitStat[]; items: HomeBenefitItem[] };

// "숫자로 보는 뷰티메이트" 기본값
export const DEFAULT_HOME_STATS: HomeStat[] = [
  { value: "24시간", label: "간편한 온라인 예약" },
  { value: "1:1", label: "나에게 맞춘 뷰티" },
  { value: "한 번에", label: "예약과 결제" },
  { value: "LIVE", label: "전문가와 실시간 소통" },
];

// "뷰티메이트로 성공한 뷰티 전문가" 기본값
export const DEFAULT_HOME_STORIES: HomeStory[] = [
  { name: "서연 · 스킨케어 전문가", quote: "라이브에서 피부 고민을 나눈 고객이 바로 예약할 수 있어 상담과 관리가 자연스럽게 이어져요.", metric: "라이브 예약 연결", avatar: "/banners/beautymate/hero-live-v3.png" },
  { name: "민지 · 퍼스널 컬러 전문가", quote: "가능한 시간을 고객이 직접 고르니 메시지로 일정을 맞추는 시간이 크게 줄었어요.", metric: "예약·결제 자동화", avatar: "/banners/beautymate/hero-color-v3.png" },
  { name: "하린 · 헤어 디자이너", quote: "지난 방문 기록과 요청사항을 한곳에서 확인할 수 있어 더 세심하게 고객을 맞이할 수 있어요.", metric: "고객 이력 관리", avatar: "/banners/beautymate/hero-salon-v3.png" },
];

// "뷰티 전문가가 뷰티메이트를 선택하는 이유" 기본값 — 뷰티 전문가 관점
//
// ⚠️ 수치 표기 원칙: 여기 값은 "플랫폼이 제공하는 것"을 나타내는 기능형 수치다.
// 재구매율·전환율 같은 성과 지표는 실측 데이터 없이 쓰지 않는다. (뷰티메이트 시절
// "68% 단골 재구매율", "3.2x 라이브 평균 체류" 는 근거 없는 수치였다.)
// 실제 성과 수치가 필요하면 Reservation 집계로 계산해 주입할 것 — docs 참고.
export const DEFAULT_HOME_BENEFITS: HomeBenefits = {
  stats: [
    { value: "24시간", label: "쉬는 동안에도 예약", sub: "언제 어디서나" },
    { value: "LIVE", label: "콘텐츠에서 바로 예약", sub: "유튜브·SNS 연동" },
    { value: "단골", label: "다시 찾는 고객", sub: "서비스 이력까지" },
    { value: "0건", label: "입금 확인 수작업", sub: "예약·정산 자동화" },
  ],
  items: [
    { iconType: "radio", title: "콘텐츠가 자연스럽게 예약으로 이어집니다", desc: "고객은 전문가의 노하우를 확인하고 남은 시간을 골라 바로 예약할 수 있습니다." },
    { iconType: "heart", title: "한 번 만난 고객과 오래 연결됩니다", desc: "단골 고객에게 새 소식을 전하고 지난 서비스 기록을 보며 더 세심하게 관리합니다." },
    { iconType: "shield", title: "뷰티 서비스에만 집중하세요", desc: "예약 접수와 일정 조율, 결제 확인과 정산까지 뷰티메이트가 간편하게 연결합니다." },
  ],
};

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return v !== null && typeof v === "object" ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function parseJsonArray<T>(raw: string | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export async function getHomeStats(): Promise<HomeStat[]> {
  const map = await getSettingsMap();
  const stats = parseJsonArray<HomeStat>(map[HOME_STATS_KEY], DEFAULT_HOME_STATS);
  return stats.length ? stats : DEFAULT_HOME_STATS;
}

export async function getHomeStories(): Promise<HomeStory[]> {
  const map = await getSettingsMap();
  return parseJsonArray<HomeStory>(map[HOME_STORIES_KEY], DEFAULT_HOME_STORIES);
}

export async function getHomeBenefits(): Promise<HomeBenefits> {
  const map = await getSettingsMap();
  const raw = parseJson<HomeBenefits>(map[HOME_BENEFITS_KEY], DEFAULT_HOME_BENEFITS);
  return {
    stats: Array.isArray(raw.stats) && raw.stats.length ? raw.stats : DEFAULT_HOME_BENEFITS.stats,
    items: Array.isArray(raw.items) && raw.items.length ? raw.items : DEFAULT_HOME_BENEFITS.items,
  };
}

// 개별 저장
export async function saveHomeStats(stats: HomeStat[]): Promise<void> {
  await setSettings({ [HOME_STATS_KEY]: JSON.stringify(stats) });
}

export async function saveHomeStories(stories: HomeStory[]): Promise<void> {
  await setSettings({ [HOME_STORIES_KEY]: JSON.stringify(stories) });
}

export async function saveHomeBenefits(benefits: HomeBenefits): Promise<void> {
  await setSettings({ [HOME_BENEFITS_KEY]: JSON.stringify(benefits) });
}

// 호환성 유지 (기존 saveHomeContent 호출부 있을 경우)
export async function saveHomeContent(stats: HomeStat[], stories: HomeStory[]): Promise<void> {
  await setSettings({
    [HOME_STATS_KEY]: JSON.stringify(stats),
    [HOME_STORIES_KEY]: JSON.stringify(stories),
  });
}
