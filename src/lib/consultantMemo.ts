import { prisma } from "@/lib/prisma";

/**
 * 예약 ID 목록에 대한 상담사 메모를 안전하게 조회한다.
 *
 * `Reservation.consultantMemo` 는 스키마에 추가돼 있지만 운영 DB 반영(db push)은
 * 별도 절차로 진행된다. 컬럼이 없는 환경에서 페이지 전체가 죽지 않도록,
 * 조회 실패 시 빈 맵으로 fallback 한다.
 */
export async function getConsultantMemos(
  reservationIds: string[]
): Promise<Record<string, string | null>> {
  if (reservationIds.length === 0) return {};
  try {
    const rows = await prisma.reservation.findMany({
      where: { id: { in: reservationIds } },
      select: { id: true, consultantMemo: true },
    });
    return Object.fromEntries(rows.map((r) => [r.id, r.consultantMemo ?? null]));
  } catch (err) {
    console.error("상담 메모 조회 실패 (빈 값으로 fallback):", err);
    return {};
  }
}
