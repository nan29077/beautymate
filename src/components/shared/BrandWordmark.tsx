import BrandMark from "@/components/shared/BrandMark";

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
  const iconSize = size === "lg" ? 27 : size === "sm" ? 20 : 23;
  const markTone = variant === "light" ? "text-white" : "text-[#6D2945]";
  const beautyTone = variant === "light" ? "text-white" : "text-[#6D2945]";
  const mateTone = variant === "light" ? "text-[#F7D4DD]" : "text-[#B44B68]";

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <BrandMark size={iconSize} className={`flex-shrink-0 ${markTone}`} />
      <span className={`${textCls} font-extrabold tracking-[-0.045em] leading-none`} aria-label="뷰티메이트">
        <span className={beautyTone}>뷰티</span>
        <span className={mateTone}>메이트</span>
      </span>
    </span>
  );
}
