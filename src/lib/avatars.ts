// 역할별 아바타 목록
import { BEAUTYMATE_CUSTOMER_AVATARS } from "@/lib/defaults";

export const AVATAR_SETS = {
  // CUSTOMER (구매회원)
  BUYER_MALE: BEAUTYMATE_CUSTOMER_AVATARS,
  BUYER_FEMALE: BEAUTYMATE_CUSTOMER_AVATARS,

  // SUPER_ADMIN (관리자)
  ADMIN: BEAUTYMATE_CUSTOMER_AVATARS,
  ADMIN_MALE: BEAUTYMATE_CUSTOMER_AVATARS,
  ADMIN_FEMALE: BEAUTYMATE_CUSTOMER_AVATARS,

  // CONSULTANT (뷰티 전문가) — 뷰티 동물 캐릭터 풀 사용 (기존 꿀벌 캐릭터 폐기)
  CONSULTANT: BEAUTYMATE_CUSTOMER_AVATARS,
};

function randomFrom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 역할과 성별에 따라 랜덤 아바타 URL 반환
 * @param role - 사용자 역할
 * @param gender - 성별 ('MALE' | 'FEMALE' | null/undefined = 랜덤)
 */
export function getRandomAvatar(role: string, gender?: string | null): string {
  switch (role) {
    case "CUSTOMER": {
      if (gender === "MALE") return randomFrom(AVATAR_SETS.BUYER_MALE);
      if (gender === "FEMALE") return randomFrom(AVATAR_SETS.BUYER_FEMALE);
      // 성별 미구분 → 50/50 랜덤
      return randomFrom(
        Math.random() < 0.5 ? AVATAR_SETS.BUYER_MALE : AVATAR_SETS.BUYER_FEMALE
      );
    }
    case "SUPER_ADMIN": {
      if (gender === "MALE") return randomFrom(AVATAR_SETS.ADMIN_MALE);
      if (gender === "FEMALE") return randomFrom(AVATAR_SETS.ADMIN_FEMALE);
      return randomFrom(AVATAR_SETS.ADMIN);
    }
    case "CONSULTANT":
      return randomFrom(AVATAR_SETS.CONSULTANT);
    default:
      return randomFrom(AVATAR_SETS.CONSULTANT);
  }
}
