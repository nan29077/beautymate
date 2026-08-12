import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopAwareLoginPath } from "@/lib/shopLoginRedirect";
import BookingFlow from "@/components/booking/BookingFlow";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const session = await auth();
  const { slug } = await Promise.resolve(params);

  if (!session?.user) {
    redirect(getShopAwareLoginPath(`/shop/${slug}/book`));
  }

  const seller = await prisma.sellerProfile.findUnique({
    where: { slug },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      shopProducts: {
        where: { isActive: true, isApproved: true },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              basePrice: true,
              consultingType: true,
              consultingMethod: true,
              durationMinutes: true,
              thumbnail: true,
              description: true,
            },
          },
        },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (!seller || !seller.isApproved) notFound();

  const products = seller.shopProducts.map((sp) => ({
    id: sp.product.id,
    name: sp.product.name,
    basePrice: Number(sp.product.basePrice),
    consultingType: sp.product.consultingType,
    consultingMethod: sp.product.consultingMethod,
    durationMinutes: sp.product.durationMinutes,
    thumbnail: sp.product.thumbnail,
    description: sp.product.description,
    sellerPrice: sp.sellerPrice ? Number(sp.sellerPrice) : null,
  }));

  return (
    <BookingFlow
      seller={{
        id: seller.id,
        slug: seller.slug,
        shopName: seller.shopName,
        shopLogo: seller.shopLogo,
        shopDescription: seller.shopDescription,
        consultantUserId: seller.user.id,
        consultantName: seller.user.name,
        consultantAvatar: seller.user.avatar,
      }}
      products={products}
      currentUserId={session.user.id}
    />
  );
}
