import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// ⚠️ 전역 omit — 운영 DB 에 아직 반영되지 않은 컬럼(스키마 드리프트)을 기본 조회에서
// 제외한다. select 없이 전체 컬럼을 읽는 쿼리가 P2022 로 죽는 것을 막기 위한 조치.
// 명시적으로 select 하면 다시 포함되므로(런타임 P2022), 해당 컬럼이 꼭 필요한 코드는
// c/[slug]/page.tsx 처럼 폴백 조회를 갖춰야 한다. DB 스키마 반영 후 이 omit 을 제거할 것.
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    omit: {
      product: {
        consultingType: true,
        consultingMethod: true,
        durationMinutes: true,
        maxDailySlots: true,
      },
      payoutRequest: {
        reservationCount: true,
      },
      referralCommission: {
        reservationId: true,
      },
    },
  });

globalForPrisma.prisma = prisma;
