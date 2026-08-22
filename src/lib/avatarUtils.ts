// 역할별 기본 아바타 이미지 유틸
import { BEAUTYMATE_CUSTOMER_AVATARS } from "@/lib/defaults";

export type UserRole = "SUPER_ADMIN" | "CONSULTANT" | "CUSTOMER";

export function getDefaultAvatar(role: UserRole, gender?: "male" | "female", index?: number): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/avatars/beautymate/default.svg";
    case "CONSULTANT":
      // 뷰티 전문가는 뷰티 동물 캐릭터 풀 사용 (기존 꿀벌 캐릭터 폐기)
      return BEAUTYMATE_CUSTOMER_AVATARS[(index ?? 0) % BEAUTYMATE_CUSTOMER_AVATARS.length];
    case "CUSTOMER":
    default: {
      return "/avatars/beautymate/default.svg";
    }
  }
}

export function getAvatarCount(role: UserRole): number {
  switch (role) {
    case "SUPER_ADMIN": return 1;
    case "CONSULTANT": return BEAUTYMATE_CUSTOMER_AVATARS.length;
    case "CUSTOMER": return 1;
    default: return 1;
  }
}

export function getAvatarByIdHash(userId: string, role: UserRole, gender?: "male" | "female"): string {
  const hash = userId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return getDefaultAvatar(role, gender, hash);
}
