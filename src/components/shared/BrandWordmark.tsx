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
  const toneCls = variant === "light" ? "text-white" : "text-[#241445]";

  return (
    <span className={`inline-flex items-center gap-1.5 ${toneCls} ${className}`}>
      <BrandMark size={iconSize} className="flex-shrink-0" />
      <span className={`${textCls} font-extrabold tracking-[-0.035em] leading-none`}>사주메이트</span>
    </span>
  );
}
