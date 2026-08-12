// 메인페이지 편집 가능한 콘텐츠(숫자/성공스토리/혜택) — 서버 전용.
// Setting 테이블에 JSON 문자열로 저장하고, 값이 없으면 코드 기본값을 사용한다.
// (관리자 "사이트 관리 > 메인페이지 관리"에서 수정)

import { getSettingsMap, setSettings } from "@/lib/settings";

export const HOME_STATS_KEY = "home.stats";
export const HOME_STORIES_KEY = "home.stories";
export const HOME_BENEFITS_KEY = "home.benefits";

export type HomeStat = { value: string; label: string };
export type HomeStory = { name: string; quote: string; metric: string; avatar: string };
export type HomeBenefitStat = { value: string; label: string; sub: string };
export type HomeBenefitItem = { iconType: string; title: string; desc: string };
export type HomeBenefits = { stats: HomeBenefitStat[]; items: HomeBenefitItem[] };

// "숫자로 보는 사주메이트" 기본값
export const DEFAULT_HOME_STATS: HomeStat[] = [
  { value: "24시간", label: "온라인 예약 접수" },
  { value: "1분", label: "남은 시간 확인" },
  { value: "한 번에", label: "예약과 결제" },
  { value: "LIVE", label: "방송 연동 상담" },
];

// "사주메이트로 성공한 상담사" 기본값
export const DEFAULT_HOME_STORIES: HomeStory[] = [
  { name: "월령 · 사주명리 상담사", quote: "방송 설명란에 예약 링크만 연결했는데 입금 확인과 시간 조율이 한 번에 정리됐어요. 이제 상담 자체에 더 집중합니다.", metric: "예약·결제 자동화", avatar: "/avatars/saju/saju-avatar-01.png" },
  { name: "연화 · 타로 상담사", quote: "라이브 중 남은 상담 시간이 바로 보여서 시청자도 편하게 예약해요. 방송이 끝난 뒤 따로 메시지를 정리할 일이 줄었습니다.", metric: "라이브 예약 연결", avatar: "/avatars/saju/saju-avatar-14.png" },
  { name: "해월 · 재물운 상담사", quote: "PICK 고객에게 방송 소식을 전하고 지난 상담 기록을 확인할 수 있어 재상담 관리가 훨씬 수월해졌어요.", metric: "단골 상담 관리", avatar: "/avatars/saju/saju-avatar-08.png" },
  { name: "청아 · 궁합 상담사", quote: "유튜브 채팅과 예약 화면이 이어지니 시청자가 방송을 보다가 자연스럽게 원하는 시간을 선택합니다.", metric: "유튜브 LIVE 연동", avatar: "/avatars/saju/saju-avatar-25.png" },
];

// "사주메이트로 얻는 것" 기본값
export const DEFAULT_HOME_BENEFITS: HomeBenefits = {
  stats: [
    { value: "LIVE", label: "방송 연동", sub: "유튜브·SNS" },
    { value: "24H", label: "예약 접수", sub: "방송 후에도" },
    { value: "PICK", label: "단골 관리", sub: "알림과 재상담" },
    { value: "ONE", label: "예약·결제", sub: "한 흐름으로" },
  ],
  items: [
    { iconType: "heart", title: "PICK으로 이어지는 단골 상담", desc: "한 번 만난 상담사와 다시 연결되는 관계 중심의 상담 경험." },
    { iconType: "radio", title: "라이브에서 바로 예약", desc: "방송 중 남은 상담 시간을 확인하고 예약과 결제를 한 번에." },
    { iconType: "shield", title: "입금 확인과 일정 조율을 간편하게", desc: "복잡한 운영은 플랫폼이 맡고 상담사는 상담과 방송에 집중." },
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
