"use client";

import { Icon } from '@/components/shared/Icon';
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useFeatureFlags } from "@/components/shared/FeatureFlagsProvider";

interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  gradient: string;
}

const DEFAULT_BANNERS: BannerSlide[] = [
  {
    id: "default-1",
    title: "라이브로 발견하고\n나에게 맞는 뷰티를 예약",
    subtitle: "LIVE BEAUTY, MADE PERSONAL",
    imageUrl: "/banners/beautymate/hero-live-v3.png",
    linkUrl: "/live",
    gradient: "from-gray-900/80 via-gray-900/35 to-transparent",
  },
  {
    id: "default-2",
    title: "나만의 컬러를 찾는\n퍼스널 뷰티 컨설팅",
    subtitle: "COLOR · SKIN · STYLE",
    imageUrl: "/banners/beautymate/hero-color-v3.png",
    linkUrl: "/live",
    gradient: "from-gray-900/80 via-gray-900/35 to-transparent",
  },
  {
    id: "default-3",
    title: "검증된 뷰티 전문가를 만나고\n예약과 결제를 한 번에",
    subtitle: "BEAUTY BOOKING, SIMPLIFIED",
    imageUrl: "/banners/beautymate/hero-salon-v3.png",
    linkUrl: "/live",
    gradient: "from-gray-900/80 via-gray-900/35 to-transparent",
  },
];

interface HeroBannerSliderProps {
  banners?: Array<{
    id: string;
    title: string;
    subtitle: string | null;
    imageUrl: string;
    linkUrl: string | null;
  }>;
  liveCampaignCount?: number;
  variant?: "mobile" | "desktop";
}

function BannerImage({
  src,
  fallback,
  eager,
  onFallback,
}: {
  src: string;
  fallback: string;
  eager: boolean;
  onFallback: () => void;
}) {
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => setResolvedSrc(src), [src]);
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0 && resolvedSrc !== fallback) {
      setResolvedSrc(fallback);
      onFallback();
    }
  }, [fallback, onFallback, resolvedSrc]);

  return (
    <img
      ref={imageRef}
      src={resolvedSrc}
      alt=""
      className="w-full h-full object-cover"
      loading={eager ? "eager" : "lazy"}
      onError={() => {
        if (resolvedSrc !== fallback) onFallback();
        setResolvedSrc(fallback);
      }}
    />
  );
}

export default function HeroBannerSlider({ banners, liveCampaignCount = 0, variant = "mobile" }: HeroBannerSliderProps) {
  const { groupBuy: FEATURE_GROUP_BUY } = useFeatureFlags();
  const slides: BannerSlide[] =
    banners && banners.length > 0
      ? banners.map((b, i) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle || "BEAUTYMATE CURATED",
          imageUrl: b.imageUrl,
          linkUrl: b.linkUrl || "/",
          gradient: DEFAULT_BANNERS[i % DEFAULT_BANNERS.length].gradient,
        }))
      : DEFAULT_BANNERS;

  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [fallbackSlideIds, setFallbackSlideIds] = useState<Set<string>>(() => new Set());

  const goTo = useCallback(
    (idx: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrent(idx);
      setTimeout(() => setIsTransitioning(false), 600);
    },
    [isTransitioning]
  );

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, slides.length, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, slides.length, goTo]);

  // Auto-slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
    setTouchStart(null);
  };

  const slide = fallbackSlideIds.has(slides[current].id)
    ? { ...DEFAULT_BANNERS[current % DEFAULT_BANNERS.length], id: slides[current].id }
    : slides[current];

  return (
    <div
      className={
        variant === "desktop"
          ? "group relative h-[520px] overflow-hidden rounded-[2rem] bg-gray-900 shadow-[0_28px_70px_rgba(61,20,39,0.18)]"
          : "relative aspect-[375/264] overflow-hidden bg-gray-900"
      }
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background images - all preloaded */}
      {slides.map((s, idx) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: idx === current ? 1 : 0 }}
        >
          <BannerImage
            src={s.imageUrl}
            fallback={DEFAULT_BANNERS[idx % DEFAULT_BANNERS.length].imageUrl}
            eager={idx === 0}
            onFallback={() => setFallbackSlideIds((previous) => {
              if (previous.has(s.id)) return previous;
              const nextIds = new Set(previous);
              nextIds.add(s.id);
              return nextIds;
            })}
          />
        </div>
      ))}

      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t ${slide.gradient}`} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

      {/* Top bar - slide counter */}
      <div className={variant === "desktop" ? "absolute top-7 right-7 z-10" : "absolute top-4 right-4 z-10"}>
        <span className={variant === "desktop" ? "text-xs text-white/75 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full font-medium" : "text-[10px] text-white/60 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full font-medium"}>
          {current + 1} / {slides.length}
        </span>
      </div>

      {/* Content */}
      <div className={variant === "desktop" ? "absolute inset-y-0 left-0 flex w-[68%] flex-col justify-end p-12 pb-11" : "absolute bottom-0 left-0 right-0 p-5 pb-8"}>
        <p
          className={variant === "desktop" ? "text-xs uppercase tracking-[0.24em] text-white/70 mb-4 font-semibold transition-all duration-500" : "text-[10px] uppercase tracking-[0.2em] text-white/60 mb-2.5 font-medium transition-all duration-500"}
          key={`sub-${current}`}
        >
          {slide.subtitle}
        </p>
        <h2
          className={variant === "desktop" ? "text-[42px] font-extrabold text-white leading-[1.2] mb-7 whitespace-pre-line drop-shadow-lg" : "text-[22px] font-bold text-white leading-snug mb-4 whitespace-pre-line drop-shadow-lg"}
          key={`title-${current}`}
        >
          {slide.title}
        </h2>

        <div className={variant === "desktop" ? "flex items-center gap-4 mb-8" : "flex items-center gap-2 mb-5"}>
          <Link
            href={slide.linkUrl}
            className={variant === "desktop" ? "inline-flex items-center gap-2 text-sm font-bold text-[#6d2945] bg-white px-6 py-3 rounded-full hover:bg-rose-50 transition-all shadow-lg" : "inline-flex items-center gap-1.5 text-sm font-medium text-white bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full hover:bg-white/30 transition-all"}
          >
            자세히 보기
            <Icon name="ChevronDown" size={14} strokeWidth={1.5} className="-rotate-90" />
          </Link>
          {FEATURE_GROUP_BUY && liveCampaignCount > 0 && (
            <Link
              href="/campaigns"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/70 hover:text-white transition-colors"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              {liveCampaignCount}개 공동 프로모션 진행 중
            </Link>
          )}
        </div>

        {/* Progress bar style dots */}
        <div className="flex items-center gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className="h-1 rounded-full transition-all duration-500 overflow-hidden bg-white/20"
              style={{ width: idx === current ? 28 : 8 }}
              aria-label={`배너 ${idx + 1}`}
            >
              {idx === current && (
                <span
                  className="block h-full bg-white rounded-full"
                  style={{
                    animation: "progressBar 5s linear forwards",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation arrows — visible on hover / desktop */}
      <button
        onClick={prev}
        className={variant === "desktop" ? "absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all opacity-0 group-hover:opacity-100" : "absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/40 transition-all opacity-0 md:opacity-100 md:hover:opacity-100"}
        aria-label="이전"
      >
        <Icon name="ChevronDown" size={18} strokeWidth={1.5} className="rotate-90" />
      </button>
      <button
        onClick={next}
        className={variant === "desktop" ? "absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all opacity-0 group-hover:opacity-100" : "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/40 transition-all opacity-0 md:opacity-100 md:hover:opacity-100"}
        aria-label="다음"
      >
        <Icon name="ChevronDown" size={18} strokeWidth={1.5} className="-rotate-90" />
      </button>

      {/* CSS animation for progress bar */}
      <style jsx>{`
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
