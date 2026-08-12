import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopAwareLoginPath } from "@/lib/shopLoginRedirect";
import BookingFlow from "@/components/booking/BookingFlow";

export const dynamic = "force-dynamic";

const BASE_PRODUCT_SELECT = {
  id: true,
  name: true,
  basePrice: true,
  thumbnail: true,
  description: true,
} as const;

const CONSULTING_PRODUCT_SELECT = {
  ...BASE_PRODUCT_SELECT,
  consultingType: true,
  consultingMethod: true,
  durationMinutes: true,
} as const;

// select 를 런타임에 바꾸므로 두 select 의 합집합을 명시해 타입을 되찾는다.
interface BookProduct {
  id: string;
  name: string;
  basePrice: unknown; // Prisma.Decimal — Number() 로만 사용
  thumbnail: string | null;
  description: string | null;
  consultingType?: string;
  consultingMethod?: string;
  durationMinutes?: number;
}

function sellerQuery(productSelect: object) {
  return {
    user: { select: { id: true, name: true, avatar: true } },
    shopProducts: {
      where: { isActive: true, isApproved: true },
      include: { product: { select: productSelect } },
      orderBy: { displayOrder: "asc" as const },
    },
  };
}

/**
 * 상담사 + 상담상품 조회.
 * 상담 관련 컬럼(consultingType 등)이 아직 운영 DB 에 없는 환경에서도 예약 페이지가
 * 죽지 않도록, 실패하면 기본 컬럼만으로 한 번 더 조회한다. (c/[slug] 와 동일 패턴)
 */
async function getSeller(slug: string) {
  try {
    return await prisma.sellerProfile.findUnique({
      where: { slug },
      include: sellerQuery(CONSULTING_PRODUCT_SELECT),
    });
  } catch (e) {
    console.error("Booking page: 상담 컬럼 조회 실패, 기본 컬럼으로 폴백", e);
    return prisma.sellerProfile.findUnique({
      where: { slug },
      include: sellerQuery(BASE_PRODUCT_SELECT),
    });
  }
}

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

  const seller = await getSeller(slug);

  if (!seller || !seller.isApproved) notFound();

  const products = seller.shopProducts.map((sp) => {
    const p = sp.product as unknown as BookProduct;
    return {
      id: p.id,
      name: p.name,
      basePrice: Number(p.basePrice),
      consultingType: p.consultingType ?? null,
      consultingMethod: p.consultingMethod ?? null,
      durationMinutes: p.durationMinutes ?? null,
      thumbnail: p.thumbnail,
      description: p.description,
      sellerPrice: sp.sellerPrice ? Number(sp.sellerPrice) : null,
    };
  });

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
