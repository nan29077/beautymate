import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 뷰티 전문가 본인이 직접 등록한 정식 뷰티 서비스(Product.sellerId === seller.id) 소유권 검증
async function getOwnedProduct(userId: string, productId: string) {
  const seller = await prisma.sellerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!seller) return { error: "뷰티 전문가 프로필을 찾을 수 없습니다.", status: 404 as const };
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, sellerId: true } });
  // 뷰티 전문가 본인이 등록한 뷰티 서비스만 수정 가능 (브랜드/관리자 뷰티 서비스 sellerId=null 은 불가)
  if (!product || product.sellerId !== seller.id) return { error: "수정 권한이 없는 뷰티 서비스입니다.", status: 403 as const };
  return { sellerId: seller.id };
}

// 뷰티 전문가 본인 등록 뷰티 서비스 조회 (수정 폼 초기값)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  if (session.user?.role !== "CONSULTANT") return NextResponse.json({ error: "뷰티 전문가만 접근 가능" }, { status: 403 });

  const { id } = await Promise.resolve(params);
  const owned = await getOwnedProduct(session.user!.id, id);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!product) return NextResponse.json({ error: "뷰티 서비스를 찾을 수 없습니다." }, { status: 404 });

  return NextResponse.json({
    product: {
      id: product.id,
      name: product.name,
      basePrice: Number(product.basePrice),
      comparePrice: product.comparePrice != null ? Number(product.comparePrice) : null,
      description: product.description,
      consultingType: product.consultingType,
      consultingMethod: product.consultingMethod,
      durationMinutes: product.durationMinutes,
      maxDailySlots: product.maxDailySlots,
      // 대표 썸네일이 갤러리 첫 장과 다를 수 있으므로 별도 제공
      thumbnail: product.thumbnail,
      images: product.images.map((img) => img.url),
    },
  });
}

// 뷰티 전문가 본인 등록 뷰티 서비스 수정
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  if (session.user?.role !== "CONSULTANT") return NextResponse.json({ error: "뷰티 전문가만 접근 가능" }, { status: 403 });

  const { id } = await Promise.resolve(params);
  const owned = await getOwnedProduct(session.user!.id, id);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  const body = await req.json().catch(() => ({}));
  const data: any = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "뷰티 서비스명을 입력해주세요." }, { status: 400 });
    data.name = name;
  }
  if (body.basePrice !== undefined) {
    const price = Number(body.basePrice);
    if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "올바른 판매가격을 입력해주세요." }, { status: 400 });
    data.basePrice = price;
  }
  if (body.comparePrice !== undefined) {
    if (body.comparePrice === null || body.comparePrice === "") {
      data.comparePrice = null;
    } else {
      const cp = Number(body.comparePrice);
      if (!Number.isFinite(cp) || cp < 0) return NextResponse.json({ error: "올바른 정가를 입력해주세요." }, { status: 400 });
      data.comparePrice = cp;
    }
  }
  if (body.description !== undefined) data.description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;
  if (body.totalStock !== undefined) data.totalStock = Number.isFinite(Number(body.totalStock)) ? Math.max(0, Math.floor(Number(body.totalStock))) : 0;
  if (body.shippingFee !== undefined) data.shippingFee = Number.isFinite(Number(body.shippingFee)) ? Math.max(0, Number(body.shippingFee)) : 0;
  if (typeof body.freeShipping === "boolean") data.freeShipping = body.freeShipping;

  // 이미지: 배열로 전달되면 갤러리 전체 교체 + 첫 장을 썸네일로 지정
  let newImages: string[] | null = null;
  if (body.images !== undefined) {
    const arr: string[] = Array.isArray(body.images) ? body.images.filter((u: any): u is string => typeof u === "string") : [];
    newImages = arr;
    data.thumbnail = arr.length > 0 ? arr[0] : null;
  }

  if (Object.keys(data).length === 0 && newImages === null) {
    return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
  }

  // 뷰티 서비스 필드 업데이트 + 갤러리 이미지 재구성을 트랜잭션으로 처리
  const imagesToSet = newImages; // const 로 고정해 클로저 내부 narrowing 유지
  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.product.update({ where: { id }, data });
    }
    if (imagesToSet !== null) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (imagesToSet.length > 0) {
        await tx.productImage.createMany({
          data: imagesToSet.map((url, i) => ({ productId: id, url, alt: `${data.name ?? "뷰티 서비스"} 이미지 ${i + 1}`, sortOrder: i })),
        });
      }
    }
  });

  return NextResponse.json({ success: true });
}
