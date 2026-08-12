"use client";

import { MoonStar, Orbit, Sparkles, Star } from "lucide-react";
import { useFeatureFlags } from "@/components/shared/FeatureFlagsProvider";

type Deco = {
  icon: typeof Sparkles;
  top: string;
  size: number;
  rotate: string;
  opacity: number;
  posKey: "left" | "right";
  posVal: string;
  tone: string;
};

const PUBLIC_DECORATIONS: Deco[] = [
  { icon: MoonStar, top: "9%", size: 48, rotate: "-10deg", opacity: 0.22, posKey: "left", posVal: "7%", tone: "#6849d8" },
  { icon: Orbit, top: "30%", size: 72, rotate: "14deg", opacity: 0.12, posKey: "left", posVal: "14%", tone: "#896af1" },
  { icon: Sparkles, top: "58%", size: 34, rotate: "-8deg", opacity: 0.22, posKey: "left", posVal: "5%", tone: "#b78a36" },
  { icon: Star, top: "84%", size: 28, rotate: "12deg", opacity: 0.18, posKey: "left", posVal: "17%", tone: "#6849d8" },
  { icon: Star, top: "14%", size: 30, rotate: "8deg", opacity: 0.2, posKey: "right", posVal: "11%", tone: "#b78a36" },
  { icon: Sparkles, top: "39%", size: 40, rotate: "10deg", opacity: 0.2, posKey: "right", posVal: "5%", tone: "#6849d8" },
  { icon: Orbit, top: "66%", size: 76, rotate: "-16deg", opacity: 0.11, posKey: "right", posVal: "15%", tone: "#896af1" },
  { icon: MoonStar, top: "89%", size: 44, rotate: "7deg", opacity: 0.18, posKey: "right", posVal: "6%", tone: "#6849d8" },
];

const DASHBOARD_DECORATIONS = PUBLIC_DECORATIONS.filter((_, index) => index % 2 === 0).map((item) => ({
  ...item,
  size: Math.round(item.size * 0.78),
  opacity: item.opacity * 0.75,
}));

export default function BeeDecorations({ isDashboard = false }: { isDashboard?: boolean }) {
  const flags = useFeatureFlags();
  if (!flags.beeDecoration) return null;

  const decorations = isDashboard ? DASHBOARD_DECORATIONS : PUBLIC_DECORATIONS;

  return (
    <>
      {decorations.map((deco, index) => {
        const DecorationIcon = deco.icon;
        return (
          <DecorationIcon
            key={`${deco.posKey}-${deco.top}-${index}`}
            size={deco.size}
            strokeWidth={1.15}
            className="hidden lg:block"
            aria-hidden="true"
            style={{
              position: "fixed",
              top: deco.top,
              [deco.posKey]: deco.posVal,
              zIndex: 1,
              color: deco.tone,
              opacity: deco.opacity,
              transform: `rotate(${deco.rotate})`,
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
        );
      })}
    </>
  );
}
