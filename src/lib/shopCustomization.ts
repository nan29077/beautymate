// 뷰티샵(뷰티 전문가 공개 페이지) 커스터마이징 값 액세스 레이어.
//
// 배너·로고·뷰티샵명·설명·테마색은 SellerProfile 컬럼에 이미 있으므로 그대로 쓰고,
// 여기서는 컬럼이 없는 3가지(한줄 소개 / 상세 소개 / 상담 분야 태그)만 다룬다.
//
// ⚠️ 저장소로 SellerProfile 컬럼을 새로 만들지 않고 기존 Setting(key-value) 테이블을 쓰는 이유:
//    운영 RDS 는 DB push 금지 상태라 새 컬럼을 추가하면 sellerProfile 조회가 전부 P2022 로 죽는다.
//    Setting 테이블은 이미 운영에 존재하므로 마이그레이션 없이 바로 동작한다.
//    (스키마 반영이 가능해지면 SellerProfile 컬럼으로 옮기고 이 모듈만 교체하면 된다.)

import { prisma } from "@/lib/prisma";

export interface ShopCustomization {
  /** 뷰티샵 한줄 소개 — 뷰티샵명 바로 아래 노출 */
  tagline: string;
  /** 뷰티샵 상세 소개 — 공개 페이지 "소개" 섹션 본문 (줄바꿈 유지) */
  intro: string;
  /** 상담 분야 태그 — 공개 페이지 프로필 카드의 칩 목록 */
  tags: string[];
}

export const EMPTY_SHOP_CUSTOMIZATION: ShopCustomization = { tagline: "", intro: "", tags: [] };

export const SHOP_TAGLINE_MAX = 40;
export const SHOP_INTRO_MAX = 2000;
export const SHOP_TAGS_MAX = 8;
const SHOP_TAG_MAX_LEN = 12;

/** 뷰티 전문가 프로필 ID → Setting 키 */
export function shopCustomizationKey(sellerProfileId: string): string {
  return `shop.custom.${sellerProfileId}`;
}

/** 신뢰할 수 없는 입력(JSON.parse 결과 / 요청 본문)을 안전한 형태로 정규화 */
export function normalizeShopCustomization(raw: unknown): ShopCustomization {
  if (!raw || typeof raw !== "object") return { ...EMPTY_SHOP_CUSTOMIZATION };
  const src = raw as Record<string, unknown>;

  const tagline = typeof src.tagline === "string" ? src.tagline.trim().slice(0, SHOP_TAGLINE_MAX) : "";
  const intro = typeof src.intro === "string" ? src.intro.slice(0, SHOP_INTRO_MAX) : "";
  const tags = Array.isArray(src.tags)
    ? Array.from(
        new Set(
          src.tags
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim().slice(0, SHOP_TAG_MAX_LEN))
            .filter((t) => t.length > 0),
        ),
      ).slice(0, SHOP_TAGS_MAX)
    : [];

  return { tagline, intro, tags };
}

/**
 * 뷰티샵 커스터마이징 조회. Setting 행이 없거나 값이 깨졌으면 빈 값으로 폴백한다.
 * (공개 페이지에서 호출되므로 절대 throw 하지 않는다)
 */
export async function getShopCustomization(sellerProfileId: string): Promise<ShopCustomization> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: shopCustomizationKey(sellerProfileId) } });
    if (!row?.value) return { ...EMPTY_SHOP_CUSTOMIZATION };
    return normalizeShopCustomization(JSON.parse(row.value));
  } catch {
    return { ...EMPTY_SHOP_CUSTOMIZATION };
  }
}

/** 뷰티샵 커스터마이징 저장(upsert). 정규화된 값을 그대로 반환한다. */
export async function setShopCustomization(
  sellerProfileId: string,
  patch: Partial<ShopCustomization>,
): Promise<ShopCustomization> {
  const current = await getShopCustomization(sellerProfileId);
  const next = normalizeShopCustomization({ ...current, ...patch });
  const key = shopCustomizationKey(sellerProfileId);
  const value = JSON.stringify(next);
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  return next;
}
