// 메인페이지 편집 가능한 콘텐츠(숫자/성공스토리/혜택) — 서버 전용.
// Setting 테이블에 JSON 문자열로 저장하고, 값이 없으면 코드 기본값을 사용한다.
// (관리자 "사이트 관리 > 메인페이지 관리"에서 수정)

import { getSettingsMap, setSettings } from "@/lib/settings";

// ⚠️ 키를 v2 로 올린 이유 (2026-08-12)
// 운영 DB Setting 테이블에 사주나라 시절 값이 남아 코드 기본값을 덮어쓰고 있었다.
//   home.stats    → "30억+ 누적 거래액", "50+ 활동 라이브 셀러", "98% 배송 만족도"
//   home.benefits → "68% 단골 재구매율", "3.2x 라이브 평균 체류", "정산·배송 걱정 없이"
// DB 값이 코드 기본값보다 우선하는 구조라 기본값만 고쳐서는 화면이 바뀌지 않는다.
// 키를 바꿔 구 행을 아예 읽지 않게 한다. (배너 FOUC 와 동일한 DB 드리프트 유형)
// 구 행(LEGACY_*)은 노출되지 않지만 DB 에는 남아 있다 — 관리자 화면에서 정리 권장.
export const HOME_STATS_KEY = "home.stats.v2";
export const HOME_STORIES_KEY = "home.stories";
export const HOME_BENEFITS_KEY = "home.benefits.v2";

// 더 이상 읽지 않는 구 키 (정리용 참조)
export const LEGACY_HOME_STATS_KEY = "home.stats";
export const LEGACY_HOME_BENEFITS_KEY = "home.benefits";

export type HomeStat = { value: string; label: string };
export type HomeStory = { name: string; quote: string; metric: string; avatar: string };
export type HomeBenefitStat = { value: string; label: string; sub: string };
export type HomeBenefitItem = { iconType: string; title: string; desc: string };
export type HomeBenefits = { stats: HomeBenefitStat[]; items: HomeBenefitItem[] };

// "숫자로 보는 사주나라" 기본값
export const DEFAULT_HOME_STATS: HomeStat[] = [
  { value: "24시간", label: "온라인 예약 접수" },
  { value: "1분", label: "남은 시간 확인" },
  { value: "한 번에", label: "예약과 결제" },
  { value: "LIVE", label: "방송 연동 상담" },
];

// "사주나라로 성공한 상담사" 기본값
export const DEFAULT_HOME_STORIES: HomeStory[] = [
  { name: "월령 · 사주명리 상담사", quote: "방송 설명란에 예약 링크만 연결했는데 입금 확인과 시간 조율이 한 번에 정리됐어요. 이제 상담 자체에 더 집중합니다.", metric: "예약·결제 자동화", avatar: "/avatars/saju/saju-avatar-01.png" },
  { name: "연화 · 타로 상담사", quote: "라이브 중 남은 상담 시간이 바로 보여서 시청자도 편하게 예약해요. 방송이 끝난 뒤 따로 메시지를 정리할 일이 줄었습니다.", metric: "라이브 예약 연결", avatar: "/avatars/saju/saju-avatar-14.png" },
  { name: "해월 · 재물운 상담사", quote: "단골 고객에게 방송 소식을 전하고 지난 상담 기록을 확인할 수 있어 재상담 관리가 훨씬 수월해졌어요.", metric: "단골 상담 관리", avatar: "/avatars/saju/saju-avatar-08.png" },
  { name: "청아 · 궁합 상담사", quote: "유튜브 채팅과 예약 화면이 이어지니 시청자가 방송을 보다가 자연스럽게 원하는 시간을 선택합니다.", metric: "유튜브 LIVE 연동", avatar: "/avatars/saju/saju-avatar-25.png" },
];

// "상담사가 사주나라를 선택하는 이유" 기본값 — 상담사 관점
//
// ⚠️ 수치 표기 원칙: 여기 값은 "플랫폼이 제공하는 것"을 나타내는 기능형 수치다.
// 재구매율·전환율 같은 성과 지표는 실측 데이터 없이 쓰지 않는다. (사주나라 시절
// "68% 단골 재구매율", "3.2x 라이브 평균 체류" 는 근거 없는 수치였다.)
// 실제 성과 수치가 필요하면 Reservation 집계로 계산해 주입할 것 — docs 참고.
export const DEFAULT_HOME_BENEFITS: HomeBenefits = {
  stats: [
    { value: "24시간", label: "쉬는 동안에도 예약", sub: "방송이 끝난 뒤에도" },
    { value: "LIVE", label: "방송 중 실시간 예약", sub: "유튜브·SNS 연동" },
    { value: "단골", label: "다시 찾는 단골 고객", sub: "재상담 이력까지" },
    { value: "0건", label: "입금 확인 수작업", sub: "예약·정산 자동화" },
  ],
  items: [
    { iconType: "radio", title: "방송하는 동안 예약이 쌓입니다", desc: "시청자가 채팅으로 묻고 기다릴 필요 없이, 남은 상담 시간을 보고 그 자리에서 예약합니다." },
    { iconType: "heart", title: "한 번 만난 분이 다시 찾아옵니다", desc: "나를 단골로 등록한 고객에게 방송 소식을 전하고, 지난 상담 기록을 보며 이어서 상담합니다." },
    { iconType: "shield", title: "상담에만 집중하시면 됩니다", desc: "예약 접수와 시간 조율, 입금 확인과 정산까지 플랫폼이 대신 처리합니다." },
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
