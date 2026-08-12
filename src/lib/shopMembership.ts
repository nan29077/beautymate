// 점집 독립 회원(ShopMembership) 도메인 로직 — 서버 전용.
// ⚠️ shop_memberships 테이블은 운영 DB에 아직 없을 수 있다(P2021) — 모든 접근은 폴백 필수.
import { prisma } from "@/lib/prisma";
import { safeQuery, isMissingSchemaError } from "@/lib/safeDb";
import type { ShopMembership } from "@/generated/prisma";

/**
 * 점집 멤버십을 멱등 생성한다.
 * 테이블 미반영(P2021) 환경에서는 경고만 남기고 null 반환 — 가입 흐름은 막지 않는다.
 */
export async function ensureShopMembership(
  shopId: string,
  userId: string,
  consultantId: string,
): Promise<ShopMembership | null> {
  try {
    const existing = await prisma.shopMembership.findUnique({
      where: { shopId_userId: { shopId, userId } },
    });
    if (existing) return existing;
    return await prisma.shopMembership.create({
      data: { shopId, userId, consultantId },
    });
  } catch (e) {
    if (isMissingSchemaError(e)) {
      console.warn(
        "[shopMembership] shop_memberships 테이블 미반영 — 멤버십 생성 생략 (DB 스키마 드리프트)",
      );
      return null;
    }
    // 동시 가입 경합(유니크 충돌) → 기존 멤버십 반환
    if ((e as { code?: string })?.code === "P2002") {
      return safeQuery(
        `shop membership race (${shopId}/${userId})`,
        () =>
          prisma.shopMembership.findUnique({
            where: { shopId_userId: { shopId, userId } },
          }),
        null,
      );
    }
    throw e;
  }
}

/** 현재 사용자가 이 점집 회원인지 (테이블 미반영 시 false) */
export async function isShopMember(shopId: string, userId: string): Promise<boolean> {
  const m = await safeQuery(
    `shop membership check (${shopId}/${userId})`,
    () =>
      prisma.shopMembership.findUnique({
        where: { shopId_userId: { shopId, userId } },
        select: { id: true },
      }),
    null,
  );
  return !!m;
}
