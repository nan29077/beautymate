import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  CreditCard,
  Heart,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import HeroBannerSlider from "@/components/shared/HeroBannerSlider";
import SellerSearchHero from "@/components/shared/SellerSearchHero";
import SellerMarquee from "@/components/shared/SellerMarquee";
import HomeFaq from "@/components/shared/HomeFaq";
import type { HomeBenefits, HomeStat, HomeStory } from "@/lib/siteContent";

type HeroBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
};

type DesktopLiveSeller = {
  id: string;
  slug: string;
  shopName: string;
  shopLogo: string | null;
  liveTitle: string;
  shareCode: string | null;
  isManual: boolean;
  liveLink: string | null;
};

const CATEGORIES = [
  { label: "스킨케어", emoji: "🫧" },
  { label: "메이크업", emoji: "💄" },
  { label: "헤어", emoji: "✂️" },
  { label: "네일", emoji: "✨" },
  { label: "퍼스널 컬러", emoji: "🎨" },
  { label: "바디케어", emoji: "🌿" },
  { label: "왁싱", emoji: "🤍" },
  { label: "이미지 컨설팅", emoji: "💎" },
];

const CUSTOMER_STEPS = [
  ["01", "전문가를 발견해요", "분야와 스타일을 비교하고 나에게 맞는 전문가를 찾아보세요."],
  ["02", "콘텐츠와 라이브를 봐요", "전문가의 노하우와 분위기를 먼저 확인할 수 있어요."],
  ["03", "바로 예약해요", "원하는 서비스와 시간을 골라 간편하게 예약·결제하세요."],
];

export default function DesktopHome({
  heroBanners,
  liveCampaignCount,
  homeStats,
  homeStories,
  homeBenefits,
  sellerCtaBg,
  sellerCtaLink,
  liveSellers,
  featureLive,
}: {
  heroBanners: HeroBanner[];
  liveCampaignCount: number;
  homeStats: HomeStat[];
  homeStories: HomeStory[];
  homeBenefits: HomeBenefits;
  sellerCtaBg: string;
  sellerCtaLink: string;
  liveSellers: DesktopLiveSeller[];
  featureLive: boolean;
}) {
  return (
    <div className="beautymate-desktop-home hidden bg-white lg:block">
      <section className="bg-gradient-to-b from-[#fff8f9] via-white to-white px-8 pb-16 pt-9">
        <div className="mx-auto grid max-w-[1320px] grid-cols-[minmax(0,1.75fr)_minmax(360px,0.75fr)] gap-7">
          <HeroBannerSlider banners={heroBanners} liveCampaignCount={liveCampaignCount} variant="desktop" />
          <SellerSearchHero variant="desktop" />
        </div>

        <div className="mx-auto mt-7 max-w-[1320px] rounded-[1.75rem] border border-rose-100 bg-white px-7 py-5 shadow-[0_12px_35px_rgba(109,41,69,0.06)]">
          <div className="flex items-center gap-7">
            <div className="flex min-w-[150px] items-center gap-3 border-r border-gray-100 pr-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-[#b44b68]"><Search size={18} /></span>
              <div><p className="text-sm font-extrabold text-gray-950">분야별 찾기</p><p className="text-xs text-gray-400">원하는 뷰티를 골라보세요</p></div>
            </div>
            <div className="grid flex-1 grid-cols-8 gap-3">
              {CATEGORIES.map((category) => (
                <Link key={category.label} href={`/sellers?category=${encodeURIComponent(category.label)}`} className="group flex flex-col items-center gap-2 rounded-2xl px-2 py-2.5 transition hover:bg-rose-50">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff5f7] text-xl ring-1 ring-rose-100 transition group-hover:-translate-y-0.5 group-hover:shadow-md">{category.emoji}</span>
                  <span className="whitespace-nowrap text-xs font-bold text-gray-700">{category.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {liveSellers.length > 0 && (
        <section className="border-y border-rose-100 bg-rose-50/40 px-8 py-8">
          <div className="mx-auto flex max-w-[1320px] items-center gap-6">
            <div className="min-w-[210px]"><p className="flex items-center gap-2 text-sm font-extrabold text-gray-950"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" /> 내 단골 라이브</p><p className="mt-1 text-xs text-gray-500">지금 방송 중인 전문가를 만나보세요</p></div>
            <div className="flex flex-1 gap-3 overflow-x-auto">
              {liveSellers.map((seller) => {
                const href = !seller.isManual && seller.shareCode ? `/live/${seller.shareCode}` : seller.liveLink || `/shop/${seller.slug}`;
                return <Link key={seller.id} href={href} className="flex min-w-[250px] items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-rose-100"><span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-rose-100 font-bold text-[#9a3656]">{seller.shopLogo ? <img src={seller.shopLogo} alt="" className="h-full w-full object-cover" /> : seller.shopName.charAt(0)}<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-red-500" /></span><span className="min-w-0"><strong className="block truncate text-sm text-gray-900">{seller.shopName}</strong><span className="block truncate text-xs text-gray-400">{seller.liveTitle}</span></span></Link>;
              })}
            </div>
          </div>
        </section>
      )}

      <section id="experts" className="px-8 py-24">
        <div className="mx-auto max-w-[1320px]">
          <SectionTitle eyebrow="BEAUTY EXPERTS" title="나에게 맞는 뷰티 전문가를 만나보세요" desc="콘텐츠와 라이브로 실력과 분위기를 먼저 확인하고 편하게 예약하세요." />
          <div className="mt-10 grid grid-cols-3 gap-6">
            {homeStories.slice(0, 3).map((story, index) => (
              <article key={story.name} className="group overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-[0_14px_40px_rgba(61,20,39,0.07)] transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(61,20,39,0.12)]">
                <div className="relative h-64 overflow-hidden bg-rose-50"><img src={story.avatar || "/avatars/beautymate/default.svg"} alt={story.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" /><span className="absolute bottom-5 left-5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#8f3652] backdrop-blur">{["스킨케어 · 라이브", "퍼스널 컬러 · 메이크업", "헤어 · 스타일링"][index]}</span></div>
                <div className="p-6"><div className="flex items-center justify-between"><h3 className="text-lg font-extrabold text-gray-950">{story.name}</h3><BadgeCheck className="text-[#b44b68]" size={20} /></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-500">“{story.quote}”</p><p className="mt-4 text-sm font-bold text-[#b44b68]">{story.metric}</p></div>
              </article>
            ))}
          </div>
          <div className="mt-8 overflow-hidden rounded-2xl"><SellerMarquee /></div>
        </div>
      </section>

      <section id="about" className="bg-[#fff8f9] px-8 py-24">
        <div className="mx-auto max-w-[1320px]">
          <SectionTitle eyebrow="WHY BEAUTYMATE" title="뷰티를 발견하고 예약하는 새로운 방법" desc="전문가와 고객이 더 가까워지는 데 필요한 모든 경험을 한곳에 담았습니다." />
          <div className="mt-11 grid grid-cols-4 gap-5">
            {homeBenefits.items.slice(0, 4).map((item, index) => {
              const icons = [Radio, ShieldCheck, Sparkles, Heart];
              const BenefitIcon = icons[index];
              return <article key={item.title} className="rounded-[1.5rem] border border-rose-100 bg-white p-7"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#b44b68]"><BenefitIcon size={22} /></span><h3 className="mt-5 text-base font-extrabold text-gray-950">{item.title}</h3><p className="mt-2 text-sm leading-6 text-gray-500">{item.desc}</p></article>;
            })}
          </div>
          <div className="relative mt-8 overflow-hidden rounded-[2rem] bg-[#3d1427] px-10 py-9 text-white">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#d87691]/20 blur-3xl" />
            <div className="relative grid grid-cols-[1.2fr_repeat(4,1fr)] items-center gap-8"><div><span className="text-xs font-bold tracking-[0.2em] text-rose-200">BY THE NUMBERS</span><h3 className="mt-2 text-2xl font-extrabold">숫자로 보는 뷰티메이트</h3></div>{homeStats.slice(0, 4).map((stat) => <div key={stat.label} className="border-l border-white/15 pl-8"><strong className="block text-3xl font-extrabold text-[#f2b7c6]">{stat.value}</strong><span className="mt-1 block text-sm text-white/65">{stat.label}</span></div>)}</div>
          </div>
        </div>
      </section>

      <section id="how" className="px-8 py-24">
        <div className="mx-auto grid max-w-[1320px] grid-cols-[0.95fr_1.05fr] items-center gap-16">
          <div><span className="text-xs font-extrabold tracking-[0.22em] text-[#b44b68]">HOW IT WORKS</span><h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-gray-950">찾고, 확인하고,<br />원하는 시간에 바로 예약하세요</h2><p className="mt-5 max-w-lg text-base leading-8 text-gray-500">스킨케어부터 헤어, 네일, 퍼스널 컬러까지 복잡한 문의 없이 간편하게 시작할 수 있어요.</p><Link href="/sellers" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#6d2945] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#4f1d32]">전문가 둘러보기 <ArrowRight size={17} /></Link></div>
          <div className="space-y-4">{CUSTOMER_STEPS.map(([number, title, desc]) => <div key={number} className="flex gap-5 rounded-[1.5rem] border border-gray-100 bg-white p-6 shadow-sm"><span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-rose-50 text-sm font-extrabold text-[#b44b68]">{number}</span><div><h3 className="text-base font-extrabold text-gray-950">{title}</h3><p className="mt-1.5 text-sm leading-6 text-gray-500">{desc}</p></div></div>)}</div>
        </div>
      </section>

      <section className="px-8 pb-24">
        <div className="mx-auto grid max-w-[1320px] grid-cols-[1.1fr_0.9fr] overflow-hidden rounded-[2.25rem] bg-[#4b1b31] shadow-[0_30px_80px_rgba(61,20,39,0.2)]">
          <div className="relative min-h-[430px] bg-cover bg-center" style={{ backgroundImage: `url(${sellerCtaBg})` }}><div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#4b1b31]" /></div>
          <div className="flex flex-col justify-center px-14 py-12 text-white"><span className="text-xs font-bold tracking-[0.2em] text-rose-200">FOR BEAUTY EXPERTS</span><h2 className="mt-4 text-4xl font-extrabold leading-tight">방송은 그대로,<br />예약은 더 간편하게</h2><p className="mt-5 text-sm leading-7 text-white/70">서비스와 가능한 시간만 등록하면 오늘부터 예약을 받을 수 있어요. 결제, 정산, 단골 관리까지 뷰티메이트가 함께합니다.</p><div className="mt-6 grid grid-cols-2 gap-3 text-sm text-white/80">{["실시간 예약", "간편 결제", "정산 자동화", "고객관리 CRM"].map((label) => <span key={label} className="flex items-center gap-2"><Check size={15} className="text-rose-200" />{label}</span>)}</div><Link href={sellerCtaLink} className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-extrabold text-[#6d2945]">뷰티 전문가로 시작하기 <ArrowRight size={17} /></Link></div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50 px-8 py-24">
        <div className="mx-auto grid max-w-[1180px] grid-cols-[0.7fr_1.3fr] gap-20"><div><span className="text-xs font-extrabold tracking-[0.2em] text-[#b44b68]">FAQ</span><h2 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-950">자주 묻는 질문</h2><p className="mt-4 text-sm leading-7 text-gray-500">뷰티메이트 이용 전에 궁금한 내용을 확인해 보세요.</p><div className="mt-8 flex gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#b44b68] shadow-sm"><CalendarCheck size={20} /></span><span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#b44b68] shadow-sm"><CreditCard size={20} /></span><span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#b44b68] shadow-sm"><Users size={20} /></span></div></div><div className="rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-gray-100"><HomeFaq /></div></div>
      </section>

      {featureLive && <section className="bg-[#f7e7eb] px-8 py-12"><div className="mx-auto flex max-w-[1180px] items-center justify-between"><div><p className="flex items-center gap-2 text-sm font-bold text-[#9a3656]"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" /> LIVE BEAUTY</p><h2 className="mt-2 text-2xl font-extrabold text-gray-950">지금 진행 중인 라이브를 만나보세요</h2></div><Link href="/live" className="inline-flex items-center gap-2 rounded-full bg-[#6d2945] px-6 py-3 text-sm font-bold text-white">라이브 찾기 <ArrowRight size={17} /></Link></div></section>}
    </div>
  );
}

function SectionTitle({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return <div><p className="text-xs font-extrabold tracking-[0.22em] text-[#b44b68]">{eyebrow}</p><h2 className="mt-3 text-[34px] font-extrabold tracking-tight text-gray-950">{title}</h2><p className="mt-3 text-sm text-gray-500">{desc}</p></div>;
}
