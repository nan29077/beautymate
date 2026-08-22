// 인앱 알림(Notification) 생성 헬퍼 — 서버 전용.
// 알림 종류(type)
//  - live_start : 단골 뷰티 전문가의 라이브 시작 알림 (수신 설정: BuyerProfile.liveAlimtalkOptIn)
//  - order      : 예약·진행 방식 관련 알림 (수신 설정: BuyerProfile.notifyOrder)
//  - channel    : 채널 구독 인증 결과 (항상 발송)
//  - payout_rejected : 뷰티 전문가 출금 요청 반려 (사유 포함, 항상 발송)
import { prisma } from "@/lib/prisma";

export type NotificationType = "live_start" | "order" | "channel" | "payout_rejected" | "system";

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  linkUrl?: string | null;
}

/** 단일 사용자에게 인앱 알림을 생성한다. 실패해도 호출자 흐름을 막지 않는다. */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        linkUrl: input.linkUrl ?? null,
      },
    });
  } catch (e) {
    console.error("[notifications] 생성 실패:", e);
  }
}

/** 여러 사용자에게 동일 알림을 일괄 생성한다. */
export async function createNotificationsForUsers(
  userIds: string[],
  payload: Omit<CreateNotificationInput, "userId">,
): Promise<number> {
  if (userIds.length === 0) return 0;
  try {
    const res = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        linkUrl: payload.linkUrl ?? null,
      })),
    });
    return res.count;
  } catch (e) {
    console.error("[notifications] 일괄 생성 실패:", e);
    return 0;
  }
}

/**
 * 라이브 시작 시, 단골(팔로우) 고객에게 인앱 알림을 생성한다.
 * - liveAlimtalkOptIn(라이브 알림 수신 동의)이 켜진 고객만 대상.
 * - 카카오 알림톡(lib/liveNotify)과 별개로 동작하며 알리고 설정과 무관하게 항상 저장된다.
 */
export async function createLiveStartNotifications(liveId: string): Promise<number> {
  try {
    const live = await prisma.liveStream.findUnique({
      where: { id: liveId },
      select: {
        title: true,
        shareCode: true,
        seller: {
          select: {
            shopName: true,
            followers: {
              where: { buyer: { liveAlimtalkOptIn: true } },
              select: { buyer: { select: { userId: true } } },
            },
          },
        },
      },
    });
    if (!live) return 0;

    const userIds = Array.from(
      new Set(live.seller.followers.map((f) => f.buyer.userId)),
    );
    return await createNotificationsForUsers(userIds, {
      title: `${live.seller.shopName} 라이브 시작`,
      message: `단골 뷰티 전문가 ${live.seller.shopName}님이 "${live.title}" 라이브를 시작했어요. 지금 입장해 보세요!`,
      type: "live_start",
      linkUrl: `/live/${live.shareCode}`,
    });
  } catch (e) {
    console.error("[notifications] 라이브 시작 알림 생성 실패:", e);
    return 0;
  }
}

/**
 * 예약 결제 완료 시, 고객에게 인앱 알림을 생성한다.
 * - notifyOrder(예약·진행 방식 알림 수신 동의)가 켜진 경우에만 저장.
 */
export async function notifyOrderPaid(orderId: string): Promise<void> {
  try {
    const order = await prisma.reservation.findUnique({
      where: { id: orderId },
      select: {
        reservationNumber: true,
        userId: true,
        seller: { select: { shopName: true } },
        user: { select: { buyerProfile: { select: { notifyOrder: true } } } },
      },
    });
    if (!order) return;
    if (order.user?.buyerProfile && order.user.buyerProfile.notifyOrder === false) return;

    await createNotification({
      userId: order.userId,
      title: "예약이 완료되었습니다",
      message: `${order.seller.shopName} 예약(${order.reservationNumber})이 정상 결제되었습니다. 진행 방식이 시작되면 다시 알려드릴게요.`,
      type: "order",
      linkUrl: "/my/orders",
    });
  } catch (e) {
    console.error("[notifications] 예약 완료 알림 생성 실패:", e);
  }
}

/**
 * 예약 취소(결제취소 승인 등) 시, 고객에게 인앱 알림을 생성한다.
 * - notifyOrder(예약·진행 방식 알림 수신 동의)가 켜진 경우에만 저장.
 */
export async function notifyOrderCancelled(orderId: string): Promise<void> {
  try {
    const order = await prisma.reservation.findUnique({
      where: { id: orderId },
      select: {
        reservationNumber: true,
        userId: true,
        seller: { select: { shopName: true } },
        user: { select: { buyerProfile: { select: { notifyOrder: true } } } },
      },
    });
    if (!order) return;
    if (order.user?.buyerProfile && order.user.buyerProfile.notifyOrder === false) return;

    await createNotification({
      userId: order.userId,
      title: "예약이 취소되었습니다",
      message: `${order.seller.shopName} 예약(${order.reservationNumber})이 취소 처리되었습니다. 환불은 결제 수단에 따라 영업일 기준 수일 내 완료됩니다.`,
      type: "order",
      linkUrl: "/my/orders",
    });
  } catch (e) {
    console.error("[notifications] 예약 취소 알림 생성 실패:", e);
  }
}
