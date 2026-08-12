// 역할별 기본 아바타 이미지 유틸
import { DEFAULT_CONSULTANT_AVATAR } from "@/lib/defaults";

export type UserRole = "SUPER_ADMIN" | "CONSULTANT" | "CUSTOMER";

export function getDefaultAvatar(role: UserRole, gender?: "male" | "female", index?: number): string {
  const i = ((index ?? 0) % getAvatarCount(role)) + 1;
  switch (role) {
    case "SUPER_ADMIN":
      return `/avatars/관리자_${i}.png`;
    case "CONSULTANT":
      // 상담사는 사주 테마 기본 아바타 1종 (기존 꿀벌 캐릭터 폐기)
      return DEFAULT_CONSULTANT_AVATAR;
    case "CUSTOMER":
    default: {
      const bi = ((index ?? 0) % 13) + 1;
      if (gender === "male") return `/avatars/남성구매회원_${bi}.png`;
      return `/avatars/여성구매회원_${bi}.png`;
    }
  }
}

export function getAvatarCount(role: UserRole): number {
  switch (role) {
    case "SUPER_ADMIN": return 5;
    case "CONSULTANT": return 1;
    case "CUSTOMER": return 13;
    default: return 5;
  }
}

export function getAvatarByIdHash(userId: string, role: UserRole, gender?: "male" | "female"): string {
  const hash = userId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return getDefaultAvatar(role, gender, hash);
}
