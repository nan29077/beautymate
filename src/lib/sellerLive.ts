// 뷰티 전문가 라이브 상태 판정 + 프로필 이미지 헬퍼 (서버/클라이언트 공용, prisma import 없음).
//
// 라이브 판정 우선순위:
//   1) 라이브 뷰티 실제 방송 중 (status="LIVE" 라이브스트림 존재)
//   2) 뷰티샵 관리 "라이브 중 표시" 수동 스위치 (isManualLive)
//   → 둘 중 하나라도 true 이면 LIVE.

import { resolveSellerDisplayImage, type SellerImageInput } from "@/lib/defaults";

type LiveInput = {
  isManualLive?: boolean | null;
  liveStreams?: { id: string }[] | null;
};

export function isSellerLive(s: LiveInput | null | undefined): boolean {
  if (!s) return false;
  return !!s.isManualLive || (s.liveStreams?.length ?? 0) > 0;
}

// 실제 뷰티 전문가 프로필 사진 — lib/defaults 의 단일 진입점으로 위임한다.
// (뷰티샵 로고 > 회원 동물 캐릭터 > sellerId 해시 동물 캐릭터)
export function sellerProfileImage(s: SellerImageInput | null | undefined): string | null {
  if (!s) return null;
  return resolveSellerDisplayImage(s);
}
