import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ShopLoginClient from "@/components/shop/ShopLoginClient";

export const dynamic = "force-dynamic";

// 뷰티샵 독립 로그인 페이지
export default async function ShopLoginPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const { slug } = await Promise.resolve(params);

  const shop = await prisma.sellerProfile.findUnique({
    where: { slug },
    select: { id: true, slug: true, shopName: true, shopLogo: true, isApproved: true },
  });
  if (!shop || !shop.isApproved) notFound();

  // OAuth 키가 설정된 provider 만 버튼을 노출한다. (lib/auth.ts 의 provider 등록 조건과 동일)
  // 키가 없으면 signIn 이 오류 페이지로 튀므로, 아예 보여주지 않는 편이 안전하다.
  const socialProviders = {
    kakao: Boolean(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET),
    naver: Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET),
  };

  return (
    <ShopLoginClient
      shop={{ id: shop.id, slug: shop.slug, shopName: shop.shopName, shopLogo: shop.shopLogo }}
      socialProviders={socialProviders}
    />
  );
}
