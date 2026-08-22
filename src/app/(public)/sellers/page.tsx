import { Icon } from '@/components/shared/Icon';
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safeDb";
import { resolveSellerDisplayImage } from "@/lib/defaults";
import { parseJsonArray } from "@/lib/utils";
import SellerSearchClient from "@/components/shared/SellerSearchClient";

export const dynamic = "force-dynamic";

// 메인 랜딩과 동일한 8개 상담 분야 — 등록 뷰티 전문가가 없어도 필터 칩은 항상 노출한다.
const CONSULT_CATEGORIES = ["스킨케어", "메이크업", "헤어", "네일", "퍼스널 컬러", "바디케어", "왁싱", "이미지 컨설팅"];

export default async function SellersPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  // FEATURE_SELLER 플래그와 무관하게 뷰티 전문가 목록 페이지는 항상 접근 가능

  // 메인 카테고리(뷰티·스킨케어·퍼스널 컬러 등)에서 넘어온 경우 해당 분야 뷰티 전문가만 노출
  const category = searchParams?.category?.trim() || "";

  const sellers = await safeQuery("뷰티 전문가 목록", () => prisma.sellerProfile.findMany({
    where: {
      isApproved: true,
      user: { role: "CONSULTANT" as any }, // 뷰티메이트 레거시 역할 제외
      ...(category ? { category } : {}),
    },
    include: {
      user: { select: { name: true, avatar: true } },
      _count: { select: { campaigns: true, shopProducts: true, fans: true } },
      // 현재 라이브 중인지 확인
      liveStreams: {
        where: { status: "LIVE" },
        select: { id: true, title: true, shareCode: true, viewerCount: true },
        take: 1,
      },
      // 뷰티 전문가가 판매하는 뷰티 서비스 이미지를 가져옴
      shopProducts: {
        where: { isActive: true },
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              thumbnail: true,
              basePrice: true,
              slug: true,
              images: { take: 1, select: { url: true } },
            },
          },
        },
      },
      // 콘텐츠 포스트 이미지도 가져옴
      contentPosts: {
        where: { isPublished: true },
        take: 6,
        orderBy: { createdAt: "desc" },
        select: { images: true },
      },
    },
    orderBy: { totalFans: "desc" },
  }), [], 3500);

  const serialized = sellers.map((s) => {
    // 뷰티 서비스 이미지 수집
    const productImages = s.shopProducts
      .map((sp) => sp.product.thumbnail || sp.product.images[0]?.url || null)
      .filter(Boolean) as string[];

    // 콘텐츠 이미지 수집
    const contentImages = s.contentPosts
      .flatMap((cp) => parseJsonArray(cp.images))
      .filter(Boolean);

    // 합쳐서 최대 6개
    const allImages = [...new Set([...contentImages, ...productImages])].slice(0, 6);

    // 뷰티 서비스 정보
    const products = s.shopProducts.map((sp) => ({
      id: sp.product.id,
      name: sp.product.name,
      thumbnail: sp.product.thumbnail || sp.product.images[0]?.url || null,
      basePrice: Number(sp.product.basePrice),
      slug: sp.product.slug,
    }));

    // 해시태그 생성 (카테고리, 무드 기반)
    const tags: string[] = [];
    if (s.user.name) tags.push(`#${s.user.name}`);
    if (s.category) tags.push(`#${s.category}`);
    if (s.mood) {
      s.mood.split(/[,\s]+/).filter(Boolean).forEach((m) => {
        if (!m.startsWith("#")) tags.push(`#${m}`);
        else tags.push(m);
      });
    }

    // 시작 가격 = 노출 뷰티 서비스 중 최저가 (뷰티 서비스가 없으면 null)
    const startPrice = products.length > 0 ? Math.min(...products.map((p) => p.basePrice)) : null;

    return {
      id: s.id,
      slug: s.slug,
      shopName: s.shopName,
      startPrice,
      // 뷰티 전문가 표시 이미지 단일 진입점 (뷰티샵 로고 > 회원 동물 캐릭터 > id 해시 캐릭터)
      shopLogo: resolveSellerDisplayImage(s),
      shopBanner: s.shopBanner,
      shopDescription: s.shopDescription,
      category: s.category,
      mood: s.mood,
      referralCode: s.referralCode, // 뷰티 전문가 코드 검색용
      totalFans: s.totalFans,
      _count: {
        campaigns: s._count.campaigns,
        shopProducts: s._count.shopProducts,
        fans: s._count.fans,
      },
      displayImages: allImages,
      products,
      tags,
      isNew: s.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30일 이내 신규
      isLive: s.liveStreams.length > 0,
      liveInfo: s.liveStreams[0] ? { 
        shareCode: s.liveStreams[0].shareCode,
        title: s.liveStreams[0].title,
        viewerCount: s.liveStreams[0].viewerCount,
      } : null,
    };
  });

  return (
    <div className="beautymate-pc-page min-h-screen bg-white animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white lg:hidden">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/" className="p-1 -ml-1 text-gray-600 hover:text-gray-900 transition-colors">
              <Icon name="ChevronDown" size={22} strokeWidth={1.5} className="rotate-90" />
            </Link>
            <h1 className="text-base font-bold text-gray-900">뷰티 전문가 찾기</h1>
          </div>
          <span className="text-xs text-gray-400 font-medium">{serialized.length}명</span>
        </div>
      </div>

      {/* 인트로 — 예약 커머스 포지셔닝 */}
      <div
        className="relative overflow-hidden px-4 py-4 text-white lg:px-8 lg:py-16"
        style={{ background: "linear-gradient(150deg, #3d1427 0%, #6d2945 55%, #b44b68 100%)" }}
      >
        <div className="max-w-2xl mx-auto relative lg:max-w-[1320px]">
          <p className="text-[15px] font-extrabold leading-snug lg:text-4xl lg:tracking-tight">방송 중인 뷰티 전문가에게 바로 예약하세요</p>
          <p className="mt-1 text-[11.5px] text-rose-100/80 lg:mt-4 lg:text-base">
            스킨케어·메이크업·헤어·네일 등 원하는 분야의 전문가를 찾아보세요
          </p>
        </div>
      </div>

      {/* Seller List */}
      <div className="lg:mx-auto lg:max-w-[1320px] lg:px-8 lg:py-12">
        <SellerSearchClient sellers={serialized} baseCategories={CONSULT_CATEGORIES} />
      </div>
    </div>
  );
}
