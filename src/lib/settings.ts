// 전역 설정(Setting) 서버 전용 액세스 레이어.
// - 기능 토글(FeatureFlags) 과 정산일 설정 등을 DB(Setting) 에서 읽고 씁니다.
// - DB 값이 있으면 코드 기본값(featureFlags.ts) 보다 우선합니다.
// 이 모듈은 prisma 를 import 하므로 서버 컴포넌트 / route handler 에서만 사용하세요.

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safeDb";
import { COMPANY } from "@/lib/companyInfo";
import {
  FEATURE_DEFAULTS,
  FEATURE_SETTING_KEYS,
  type FeatureFlags,
  type SocialLinks,
} from "@/lib/featureFlags";
import {
  REGISTER_FIELDS_SETTING_KEY,
  normalizeRegisterFieldSettings,
  type RegisterFieldSettings,
} from "@/lib/registerFields";

export const SETTLEMENT_BUSINESS_DAYS_KEY = "settlementBusinessDays";
export const DEFAULT_SETTLEMENT_BUSINESS_DAYS = 5;

// 소셜 링크 설정 키
export const SOCIAL_INSTAGRAM_ENABLED_KEY = "social.instagramEnabled";
export const SOCIAL_INSTAGRAM_URL_KEY = "social.instagramUrl";
export const SOCIAL_YOUTUBE_ENABLED_KEY = "social.youtubeEnabled";
export const SOCIAL_YOUTUBE_URL_KEY = "social.youtubeUrl";
export const SOCIAL_EMAIL_ENABLED_KEY = "social.emailEnabled";
export const SOCIAL_EMAIL_URL_KEY = "social.emailUrl";

// 푸터 회사 정보 설정 키
// ⚠️ 키를 v2 로 올린 이유 (2026-08-22)
// 운영/로컬 DB Setting 테이블에 이전 브랜드 시절의 사업자 정보가 남아 있어 코드 기본값을
// 덮어쓰는 사고가 반복됐다. 키를 새로 파서 (주)제이투핀 정보가 항상 먼저 보이게 한다.
// 관리자 화면에서 저장하면 v2 키에 기록되므로 이후 수정은 정상 동작한다.
export const FOOTER_COMPANY_NAME_KEY = "footer.v2.companyName";
export const FOOTER_CEO_NAME_KEY = "footer.v2.ceoName";
export const FOOTER_BIZ_NUM_KEY = "footer.v2.bizNum";
export const FOOTER_MAIL_ORDER_NUM_KEY = "footer.v2.mailOrderNum";
export const FOOTER_PHONE_KEY = "footer.v2.phone";
export const FOOTER_EMAIL_KEY = "footer.v2.email";
export const FOOTER_ADDRESS_KEY = "footer.v2.address";
export const FOOTER_COPYRIGHT_KEY = "footer.v2.copyright";

export type FooterSettings = {
  companyName: string;
  ceoName: string;
  bizNum: string;
  /** 미노출 항목 (푸터에는 표시하지 않음, 값 보존용) */
  mailOrderNum: string;
  phone: string;
  email: string;
  /** 미노출 항목 (푸터에는 표시하지 않음, 값 보존용) */
  address: string;
  copyright: string;
};

// 푸터에 실제로 노출하는 항목은 법인명·사업자등록·대표자·메일·고객센터 5가지뿐이다.
// (mailOrderNum / address 는 관리자 설정값 호환을 위해 타입만 남겨두고 화면에는 쓰지 않는다)
export const FOOTER_DEFAULTS: FooterSettings = {
  companyName: COMPANY.name,
  ceoName: COMPANY.ceo,
  bizNum: COMPANY.bizNum,
  mailOrderNum: "",
  phone: COMPANY.phone,
  email: COMPANY.email,
  address: "",
  copyright: `2026 ${COMPANY.serviceName}. All rights reserved.`,
};


// SocialLinks 타입은 featureFlags.ts에 정의됨 (클라이언트 공용)
export type { SocialLinks };

// 뷰티 전문가 출금 수수료율(%) — 최고관리자 설정값, 없으면 0
export const PAYOUT_FEE_RATE_KEY = "payoutFeeRate";
export const DEFAULT_PAYOUT_FEE_RATE = 0;

// 역할별 정산 주기(영업일 기준 N일 후) — 뷰티 전문가 외 중간관리자/브랜드사
export const MIDDLE_SETTLE_DAYS_KEY = "middleSettleDays";
export const BRAND_SETTLE_DAYS_KEY = "brandSettleDays";
export const DEFAULT_MIDDLE_SETTLE_DAYS = 5;
export const DEFAULT_BRAND_SETTLE_DAYS = 5;

// 한 번의 요청 안에서 Setting 조회를 1회로 묶음(React cache).
export const getSettingsMap = cache(async (): Promise<Record<string, string>> => {
  const rows = await safeQuery("공통 사이트 설정", () => prisma.setting.findMany(), [], 2500);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
});

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

// 기능 토글 값 (DB 우선, 없으면 코드 기본값)
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const map = await getSettingsMap();
  return {
    groupBuy: parseBool(map[FEATURE_SETTING_KEYS.groupBuy], FEATURE_DEFAULTS.groupBuy),
    liveCommerce: parseBool(map[FEATURE_SETTING_KEYS.liveCommerce], FEATURE_DEFAULTS.liveCommerce),
    seller: parseBool(map[FEATURE_SETTING_KEYS.seller], FEATURE_DEFAULTS.seller),
    brix: parseBool(map[FEATURE_SETTING_KEYS.brix], FEATURE_DEFAULTS.brix),
    regNormal: parseBool(map[FEATURE_SETTING_KEYS.regNormal], FEATURE_DEFAULTS.regNormal),
    regGroupBuy: parseBool(map[FEATURE_SETTING_KEYS.regGroupBuy], FEATURE_DEFAULTS.regGroupBuy),
    productRequest: parseBool(map[FEATURE_SETTING_KEYS.productRequest], FEATURE_DEFAULTS.productRequest),
    referral: parseBool(map[FEATURE_SETTING_KEYS.referral], FEATURE_DEFAULTS.referral),
    beeDecoration: parseBool(map[FEATURE_SETTING_KEYS.beeDecoration], FEATURE_DEFAULTS.beeDecoration),
    game: parseBool(map[FEATURE_SETTING_KEYS.game], FEATURE_DEFAULTS.game),
    themSnow: parseBool(map[FEATURE_SETTING_KEYS.themSnow], FEATURE_DEFAULTS.themSnow),
    themCherry: parseBool(map[FEATURE_SETTING_KEYS.themCherry], FEATURE_DEFAULTS.themCherry),
    themHalloween: parseBool(map[FEATURE_SETTING_KEYS.themHalloween], FEATURE_DEFAULTS.themHalloween),
    themChristmas: parseBool(map[FEATURE_SETTING_KEYS.themChristmas], FEATURE_DEFAULTS.themChristmas),
    themValentine: parseBool(map[FEATURE_SETTING_KEYS.themValentine], FEATURE_DEFAULTS.themValentine),
    themRainy: parseBool(map[FEATURE_SETTING_KEYS.themRainy], FEATURE_DEFAULTS.themRainy),
    themSummer: parseBool(map[FEATURE_SETTING_KEYS.themSummer], FEATURE_DEFAULTS.themSummer),
    themAutumn: parseBool(map[FEATURE_SETTING_KEYS.themAutumn], FEATURE_DEFAULTS.themAutumn),
  };
}

// 회원가입 항목 권한(필수/선택/숨김) 설정 조회 (DB JSON 우선, 없으면 코드 기본값)
export async function getRegisterFieldSettings(): Promise<RegisterFieldSettings> {
  const map = await getSettingsMap();
  const raw = map[REGISTER_FIELDS_SETTING_KEY];
  if (!raw) return normalizeRegisterFieldSettings(undefined);
  try {
    return normalizeRegisterFieldSettings(JSON.parse(raw));
  } catch {
    return normalizeRegisterFieldSettings(undefined);
  }
}

// 정산일(영업일 기준 N일 후)
function parseDays(raw: string | undefined, fallback: number): number {
  const n = raw === undefined ? NaN : parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function getSettlementBusinessDays(): Promise<number> {
  const map = await getSettingsMap();
  return parseDays(map[SETTLEMENT_BUSINESS_DAYS_KEY], DEFAULT_SETTLEMENT_BUSINESS_DAYS);
}

export async function getMiddleSettleDays(): Promise<number> {
  const map = await getSettingsMap();
  return parseDays(map[MIDDLE_SETTLE_DAYS_KEY], DEFAULT_MIDDLE_SETTLE_DAYS);
}

export async function getBrandSettleDays(): Promise<number> {
  const map = await getSettingsMap();
  return parseDays(map[BRAND_SETTLE_DAYS_KEY], DEFAULT_BRAND_SETTLE_DAYS);
}

// 뷰티 전문가 출금 수수료율(%) 조회 — 최고관리자가 설정한 값, 미설정/비정상 값이면 0
export async function getPayoutFeeRate(): Promise<number> {
  const map = await getSettingsMap();
  const raw = map[PAYOUT_FEE_RATE_KEY];
  const n = raw === undefined ? NaN : parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_PAYOUT_FEE_RATE;
}

// 소셜 링크 설정 조회
export async function getSocialLinks(): Promise<import("@/lib/featureFlags").SocialLinks> {
  const map = await getSettingsMap();
  return {
    instagramEnabled: map[SOCIAL_INSTAGRAM_ENABLED_KEY] === "true",
    instagramUrl: map[SOCIAL_INSTAGRAM_URL_KEY] ?? "",
    youtubeEnabled: map[SOCIAL_YOUTUBE_ENABLED_KEY] === "true",
    youtubeUrl: map[SOCIAL_YOUTUBE_URL_KEY] ?? "",
    emailEnabled: map[SOCIAL_EMAIL_ENABLED_KEY] === "true",
    emailUrl: map[SOCIAL_EMAIL_URL_KEY] ?? "",
  };
}


// 푸터 회사정보 조회
// DB 에 빈 문자열이 저장돼 있으면 코드 기본값을 쓴다 (빈 푸터 방지).
function pick(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export async function getFooterSettings(): Promise<FooterSettings> {
  const map = await getSettingsMap();
  const copyright = (pick(map[FOOTER_COPYRIGHT_KEY], FOOTER_DEFAULTS.copyright)).replace(
    /BeautyMate/gi,
    "뷰티메이트",
  );
  return {
    companyName: pick(map[FOOTER_COMPANY_NAME_KEY], FOOTER_DEFAULTS.companyName),
    ceoName: pick(map[FOOTER_CEO_NAME_KEY], FOOTER_DEFAULTS.ceoName),
    bizNum: pick(map[FOOTER_BIZ_NUM_KEY], FOOTER_DEFAULTS.bizNum),
    mailOrderNum: map[FOOTER_MAIL_ORDER_NUM_KEY] ?? FOOTER_DEFAULTS.mailOrderNum,
    phone: pick(map[FOOTER_PHONE_KEY], FOOTER_DEFAULTS.phone),
    email: pick(map[FOOTER_EMAIL_KEY], FOOTER_DEFAULTS.email),
    address: map[FOOTER_ADDRESS_KEY] ?? FOOTER_DEFAULTS.address,
    copyright,
  };
}

// 여러 설정을 한 번에 저장(upsert)
export async function setSettings(entries: Record<string, string>): Promise<void> {
  const keys = Object.keys(entries);
  await prisma.$transaction(
    keys.map((key) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: entries[key] },
        update: { value: entries[key] },
      }),
    ),
  );
}

// ─────────────────────────────────────────────
// AI 설정 (OpenAI) — 키는 .env 가 아니라 DB(settings)에 저장해 관리자가 직접 교체 가능
// ─────────────────────────────────────────────
export const AI_OPENAI_KEY = "ai.openai_key";

/** OpenAI API 키 (없으면 null). 서버 전용. */
export async function getOpenAiKey(): Promise<string | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: AI_OPENAI_KEY } });
    const value = row?.value?.trim();
    return value ? value : null;
  } catch {
    // settings 테이블 조회 실패 → 키 없음으로 간주
    return null;
  }
}

/** 화면 표시용 마스킹 (앞 8자 + ***) */
export function maskApiKey(key: string | null | undefined): string | null {
  if (!key) return null;
  const k = key.trim();
  if (!k) return null;
  return `${k.slice(0, 8)}***`;
}

// ─────────────────────────────────────────────
// Daily.co 설정 — 키는 DB(settings)에 저장하며 환경변수보다 우선
// ─────────────────────────────────────────────
export const DAILY_API_KEY_SETTING = "daily.api_key";

/** Daily.co API 키 (없으면 null). 서버 전용. */
export async function getDailyApiKey(): Promise<string | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: DAILY_API_KEY_SETTING } });
    const value = row?.value?.trim();
    return value ? value : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// 뷰티 전문가 호칭(선생/디자이너/아티스트/테라피스트/컨설턴트) — 뷰티 전문가별 지정값
// 스키마 변경 없이 settings 에 JSON 으로 보관한다.
//   key   : consultant.titles
//   value : { "<sellerProfileId>": "테라피스트", ... }
// 지정값이 없는 뷰티 전문가는 id 해시로 자동 선택된다 (lib/consultantTitle.ts)
// ─────────────────────────────────────────────
export const CONSULTANT_TITLES_KEY = "consultant.titles";

/** 뷰티 전문가별 지정 호칭 맵 (없거나 형식이 깨져 있으면 빈 맵) */
export async function getConsultantTitleMap(): Promise<Record<string, string>> {
  const map = await getSettingsMap();
  const raw = map[CONSULTANT_TITLES_KEY];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}
