import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ShopLoginClient from "@/components/shop/ShopLoginClient";

export const dynamic = "force-dynamic";

// 점집 독립 로그인 페이지
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

  return (
    <ShopLoginClient
      shop={{ id: shop.id, slug: shop.slug, shopName: shop.shopName, shopLogo: shop.shopLogo }}
    />
  );
}
