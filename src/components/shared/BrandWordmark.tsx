import { Moon } from "lucide-react";

/**
 * 사주메이트 워드마크 — 이미지 로고 대신 아이콘 + 텍스트로 브랜드를 표기한다.
 * (리브랜딩 Phase 1: 신규 로고 이미지 확정 전까지 사용)
 */
export default function BrandWordmark({
  size = "md",
  variant = "dark",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
  className?: string;
}) {
  const textCls = size === "lg" ? "text-[22px]" : size === "sm" ? "text-[16px]" : "text-[19px]";
  const iconSize = size === "lg" ? 24 : size === "sm" ? 17 : 20;
  const toneCls = variant === "light" ? "text-white" : "text-[#2d1b69]";

  return (
    <span className={`inline-flex items-center gap-1.5 ${toneCls} ${className}`}>
      <Moon size={iconSize} strokeWidth={1.7} className="flex-shrink-0" aria-hidden="true" />
      <span className={`${textCls} font-extrabold tracking-tight leading-none`}>사주메이트</span>
    </span>
  );
}
