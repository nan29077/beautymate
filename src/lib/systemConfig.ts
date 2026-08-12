// 시스템 전역 스위치(SystemConfig) 서버 전용 액세스 레이어.
// - sellerOnlyFee: true 이면 플랫폼 수수료 전액을 상담사가 부담 (공급자 수수료 없음).
// - prisma 를 import 하므로 서버 컴포넌트 / route handler 에서만 사용하세요.

import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const DEFAULT_SELLER_ONLY_FEE = false;

// 단일 레코드(id=1) 를 보장하며 조회. 없으면 기본값으로 생성.
async function getOrCreateConfig() {
  return prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, sellerOnlyFee: DEFAULT_SELLER_ONLY_FEE },
  });
}

// sellerOnlyFee 조회 (React cache — 요청당 1회)
export const getSellerOnlyFee = cache(async (): Promise<boolean> => {
  try {
    const cfg = await getOrCreateConfig();
    return cfg.sellerOnlyFee;
  } catch {
    return DEFAULT_SELLER_ONLY_FEE;
  }
});

export async function setSellerOnlyFee(value: boolean): Promise<boolean> {
  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: { sellerOnlyFee: value },
    create: { id: 1, sellerOnlyFee: value },
  });
  return value;
}
