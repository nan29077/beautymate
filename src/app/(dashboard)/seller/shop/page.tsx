import { Icon } from '@/components/shared/Icon';
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Camera } from 'lucide-react';
import SafeImage from "@/components/shared/SafeImage";
import { resolveSellerDisplayImage, resolveShopBanner } from "@/lib/defaults";
import ShopLinkButton from "@/components/shared/ShopLinkButton";
import ShopThemeColorPicker from "@/components/shared/ShopThemeColorPicker";
import SellerBusinessInfoForm from "@/components/shared/SellerBusinessInfoForm";
import ShopFeatureToggles from "@/components/shared/ShopFeatureToggles";
import ShopLiveSettings from "@/components/shared/ShopLiveSettings";
import PastBroadcastToggles from "@/components/shared/PastBroadcastToggles";
import ShopEditForm from "@/components/shared/ShopEditForm";
import SellerShopDashboardTabs from "@/components/shared/SellerShopDashboardTabs";
import ShopQRSection from "@/components/shared/ShopQRSection";
import { getFeatureFlags } from "@/lib/settings";
import { getShopCustomization } from "@/lib/shopCustomization";
import ConsultantAvatarPicker from "@/components/shared/ConsultantAvatarPicker";

export const dynamic = "force-dynamic";

export default async function SellerShopPage() {
  const session = await auth();
  if (session?.user?.role !== "CONSULTANT") redirect("/");

  const flags = await getFeatureFlags();

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session!.user!.id },
    include: {
      user: { select: { avatar: true } },
      _count: { select: { fans: true, shopProducts: true, campaigns: true, referredBuyers: true } },
    },
  });

  if (!seller) redirect("/");

  // 뷰티샵 커스터마이징(한줄 소개·상세 소개·상담 분야 태그) — Setting 테이블 저장분
  const customization = await getShopCustomization(seller.id);
  // 프로필 캐릭터 / 배너 — 미설정 시 뷰티 전문가 id 기반 기본값
  const displayAvatar = resolveSellerDisplayImage(seller);
  const displayBanner = resolveShopBanner(seller.shopBanner, seller.id);

  // 지난 방송(종료된 라이브) 목록 — 뷰티샵 노출 스위치용. 라이브 뷰티이 운영 정책상 켜진 경우에만 노출.
  const endedLives = flags.liveCommerce
    ? await prisma.liveStream.findMany({
        where: { sellerId: seller.id, status: "ENDED" },
        orderBy: [{ endedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          thumbnailImage: true,
          endedAt: true,
          startedAt: true,
          peakViewerCount: true,
          viewerCount: true,
          showPastInShop: true,
          _count: { select: { products: true } },
        },
      })
    : [];

  const pastBroadcastItems = endedLives.map((l) => ({
    id: l.id,
    title: l.title,
    thumbnail: l.thumbnailImage,
    endedAt: l.endedAt ? l.endedAt.toISOString() : null,
    startedAt: l.startedAt ? l.startedAt.toISOString() : null,
    productCount: l._count.products,
    peakViewerCount: l.peakViewerCount || l.viewerCount || 0,
    showPastInShop: l.showPastInShop,
  }));

  const basicContent = (
    <>
      <ShopEditForm
        initial={{
          slug: seller.slug,
          shopName: seller.shopName,
          category: seller.category,
          mood: seller.mood,
          shopDescription: seller.shopDescription,
          instagramUrl: seller.instagramUrl,
          youtubeUrl: seller.youtubeUrl,
          tiktokUrl: seller.tiktokUrl,
          facebookUrl: seller.facebookUrl,
          twitterUrl: seller.twitterUrl,
          youtubeChannelId: seller.youtubeChannelId,
          shopLogo: seller.shopLogo,
          shopBanner: seller.shopBanner,
        }}
        initialCustomization={customization}
      />

      {/* 프로필 캐릭터 선택 */}
      <div className="mt-4">
        <ConsultantAvatarPicker currentImage={displayAvatar} hasShopLogo={!!seller.shopLogo} />
      </div>

      {/* 현재 뷰티샵 배너 미리보기 */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mt-4">
        <h3 className="text-sm font-bold text-gray-900 mb-1">현재 뷰티샵 배너</h3>
        <p className="text-[10px] text-gray-400 mb-3">
          {seller.shopBanner
            ? "직접 등록하신 배너입니다. 위 '뷰티샵 배너 이미지'에서 변경할 수 있어요."
            : "배너를 등록하지 않아 뷰티메이트 기본 배너가 자동 적용됐습니다. 직접 등록하면 교체됩니다."}
        </p>
        <div className="w-full h-32 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img src={displayBanner} alt="뷰티샵 배너 미리보기" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* 뷰티샵 테마 색상 (배너 그라디언트·강조색에 반영) */}
      <div className="mt-4">
        <ShopThemeColorPicker currentColor={seller.shopThemeColor || "#f5a700"} />
      </div>

      {/* 뷰티샵 링크 & 통계 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">내 뷰티샵 주소</h3>
            <p className="text-xs text-gray-400 mt-0.5">/shop/{seller.slug}</p>
          </div>
        </div>
        <ShopLinkButton slug={seller.slug} />

        {/* 간단 통계 */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Icon name="Users" size={14} strokeWidth={1.5} className="text-brand-500" />
            <span className="font-semibold">{seller._count.fans}</span> 팬
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Icon name="Cart" size={14} strokeWidth={1.5} className="text-brand-500" />
            <span className="font-semibold">{seller._count.shopProducts}</span> 뷰티 서비스
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Icon name="Star" size={14} strokeWidth={1.5} className="text-brand-500" />
            <span className="font-semibold">{seller._count.campaigns}</span> 캠페인
          </div>
          {/* 뷰티메이트: 추천인 통계 미사용 */}
        </div>
      </div>

      {/* 뷰티샵 바로가기 & QR코드 */}
      <ShopQRSection slug={seller.slug} />
    </>
  );

  const liveContent = (
    <>
      {/* 뷰티샵 기능 관리 */}
      <ShopFeatureToggles
        initialFeatures={{
          groupBuy: seller.featureGroupBuy ?? true,
          content: seller.featureContent ?? true,
          liveCommerce: seller.featureLiveCommerce ?? false,
        }}
        adminFlags={{
          groupBuy: flags.groupBuy,
          content: flags.brix,
          liveCommerce: flags.liveCommerce,
        }}
      />

      {/* 라이브 중 수동 표시 + 외부 라이브 연동 링크 */}
      <div className="mt-4">
        <ShopLiveSettings
          initial={{
            isManualLive: seller.isManualLive ?? false,
            livePlatform: seller.livePlatform ?? null,
            liveLink: seller.liveLink ?? null,
            manualLiveProductIds: (() => {
              try { return JSON.parse((seller as any).manualLiveProductIds || "[]"); } catch { return []; }
            })(),
          }}
        />
      </div>

      {/* 지난 방송 뷰티 서비스 노출 스위치 */}
            {flags.liveCommerce && (
        <div className="mt-4">
          <PastBroadcastToggles initialItems={pastBroadcastItems} />
        </div>
      )}
    </>
  );

  return (
    <div className="animate-fade-in">
      <SellerShopDashboardTabs basicContent={basicContent} liveContent={liveContent} />
    </div>
  );
}
