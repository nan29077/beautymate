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
  const markTone = variant === "light" ? "text-white" : "text-[#5B3DB5]";
  const sajuTone = variant === "light" ? "text-white" : "text-[#4C319F]";
  const naraTone = variant === "light" ? "text-[#F2C66D]" : "text-[#B9822D]";

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <BrandMark size={iconSize} className={`flex-shrink-0 ${markTone}`} />
      <span className={`${textCls} font-extrabold tracking-[-0.045em] leading-none`} aria-label="사주나라">
        <span className={sajuTone}>사주</span>
        <span className={naraTone}>나라</span>
      </span>
    </span>
  );
}
