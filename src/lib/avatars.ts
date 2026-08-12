// 역할별 아바타 목록
import { DEFAULT_CONSULTANT_AVATAR } from "@/lib/defaults";

export const AVATAR_SETS = {
  // CUSTOMER (구매회원)
  BUYER_MALE: Array.from({ length: 13 }, (_, i) => `/avatars/남성구매회원_${i + 1}.png`),
  BUYER_FEMALE: Array.from({ length: 13 }, (_, i) => `/avatars/여성구매회원_${i + 1}.png`),

  // SUPER_ADMIN (관리자)
  ADMIN: Array.from({ length: 5 }, (_, i) => `/avatars/관리자_${i + 1}.png`),
  ADMIN_MALE: [
    "/avatars/관리자_2.png",
    "/avatars/관리자_3.png",
    "/avatars/관리자_5.png",
  ],
  ADMIN_FEMALE: ["/avatars/관리자_1.png", "/avatars/관리자_4.png"],

  // CONSULTANT (상담사) — 사주 테마 기본 아바타 단일 사용 (기존 꿀벌 캐릭터 폐기)
  CONSULTANT: [DEFAULT_CONSULTANT_AVATAR],
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
