import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────
// 프리즘/OBS 라이브 위젯 공용 조회 로직.
// API 라우트(/api/widget/[consultantId])와 위젯 페이지(서버 컴포넌트)가 함께 쓴다.
// ─────────────────────────────────────────────

export interface WidgetData {
  consultantId: string; // User.id
  consultantName: string;
  consultantAvatar: string | null;
  slug: string;
  bookingUrl: string;
  date: string; // YYYY-MM-DD
  totalSlots: number;
  bookedSlots: number;
  remainingSlots: number;
  isLive: boolean;
  // 슬롯 조회에 실패한 경우 true. 방송 중 DB 순단으로 오버레이가 통째로 사라지거나
  // "0자리(마감)" 같은 잘못된 숫자를 띄우지 않도록, 숫자 대신 안내 문구를 표시한다.
  slotsUnknown: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 서버 타임존과 무관하게 KST(Asia/Seoul) 기준 오늘 날짜(YYYY-MM-DD). */
export function todayInSeoul(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** YYYY-MM-DD 형식이면 그대로, 아니면 오늘(KST). */
export function normalizeWidgetDate(date?: string | null): string {
  return date && DATE_RE.test(date) ? date : todayInSeoul();
}

/** User.id → SellerProfile.id → slug 순으로 뷰티 전문가를 찾는다. */
async function findConsultant(key: string) {
  const include = { user: { select: { id: true, name: true, avatar: true } } };

  const byUserId = await prisma.sellerProfile.findUnique({ where: { userId: key }, include });
  if (byUserId) return byUserId;

  const byProfileId = await prisma.sellerProfile.findUnique({ where: { id: key }, include });
  if (byProfileId) return byProfileId;

  return prisma.sellerProfile.findUnique({ where: { slug: key }, include });
}

/** 뷰티 전문가의 해당 날짜 슬롯 현황. 뷰티 전문가를 못 찾으면 null. */
export async function getWidgetData(key: string, rawDate?: string | null): Promise<WidgetData | null> {
  const date = normalizeWidgetDate(rawDate);
  const seller = await findConsultant(key);
  if (!seller) return null;

  // TimeSlot.date 는 UTC 자정 기준으로 저장된다 (/api/timeslots 와 동일 규칙).
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);

  let slots: { isAvailable: boolean; reservationId: string | null }[] = [];
  let slotsUnknown = false;
  try {
    slots = await prisma.timeSlot.findMany({
      where: { consultantId: seller.userId, date: { gte: start, lte: end } },
      select: { isAvailable: true, reservationId: true },
    });
  } catch (e) {
    // 뷰티 전문가 정보까지는 살아있으므로 QR·예약 링크는 그대로 노출한다.
    console.error("Widget slot query failed:", e);
    slotsUnknown = true;
  }

  return {
    consultantId: seller.userId,
    consultantName: seller.shopName,
    consultantAvatar: seller.shopLogo || seller.user.avatar || null,
    slug: seller.slug,
    bookingUrl: `/c/${seller.slug}`,
    date,
    totalSlots: slots.length,
    bookedSlots: slots.filter((s) => !!s.reservationId).length,
    // 예약이 걸렸거나 뷰티 전문가가 닫은 슬롯은 모두 "남은 자리"에서 제외한다.
    remainingSlots: slots.filter((s) => s.isAvailable && !s.reservationId).length,
    isLive: seller.isManualLive ?? false,
    slotsUnknown,
  };
}
