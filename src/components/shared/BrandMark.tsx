import type { CSSProperties } from "react";

export default function BrandMark({
  size = 24,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label="뷰티메이트"
    >
      <path d="M32 10c6.5 8.2 9.8 15.6 9.8 22.2C41.8 43.2 34.4 52 32 52s-9.8-8.8-9.8-19.8C22.2 25.6 25.5 18.2 32 10Z" fill="currentColor" />
      <path d="M10 32c8.2-6.5 15.6-9.8 22.2-9.8C43.2 22.2 52 29.6 52 32s-8.8 9.8-19.8 9.8C25.6 41.8 18.2 38.5 10 32Z" fill="#EAA7B8" fillOpacity=".9" />
      <circle cx="32" cy="32" r="8" fill="white" />
      <path d="m50 8 1.8 4.2L56 14l-4.2 1.8L50 20l-1.8-4.2L44 14l4.2-1.8L50 8Z" fill="#F7D4DD" />
    </svg>
  );
}
