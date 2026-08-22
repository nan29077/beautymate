import { cookies } from "next/headers";
import { parseShopCookie, SB_SHOP_COOKIE } from "@/lib/shopContext";

export function getShopAwareLoginPath(fallbackCallbackUrl?: string): string {
  const shop = parseShopCookie(cookies().get(SB_SHOP_COOKIE)?.value);
  // 뷰티샵 컨텍스트에서는 메인 로그인이 아니라 "뷰티샵 전용 로그인"으로 보낸다.
  // (뷰티샵 로그인은 메인과 완전히 분리되며, 로그인 성공 시 해당 뷰티샵으로 복귀한다.)
  if (shop) return `/shop/${encodeURIComponent(shop.slug)}/login`;

  if (!fallbackCallbackUrl) return "/auth/login";
  return `/auth/login?callbackUrl=${encodeURIComponent(fallbackCallbackUrl)}`;
}
