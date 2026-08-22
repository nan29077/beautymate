"use client";

import { Droplets, Flower2, Gem, Heart, Sparkles } from "lucide-react";
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
  { icon: Flower2, top: "8%", size: 54, rotate: "-10deg", opacity: 0.18, posKey: "left", posVal: "7%", tone: "#b44b68" },
  { icon: Droplets, top: "29%", size: 62, rotate: "12deg", opacity: 0.12, posKey: "left", posVal: "15%", tone: "#c98c9d" },
  { icon: Sparkles, top: "57%", size: 34, rotate: "-8deg", opacity: 0.2, posKey: "left", posVal: "6%", tone: "#9a6b52" },
  { icon: Heart, top: "83%", size: 30, rotate: "10deg", opacity: 0.14, posKey: "left", posVal: "17%", tone: "#b44b68" },
  { icon: Gem, top: "13%", size: 34, rotate: "8deg", opacity: 0.15, posKey: "right", posVal: "11%", tone: "#9a6b52" },
  { icon: Sparkles, top: "38%", size: 40, rotate: "10deg", opacity: 0.18, posKey: "right", posVal: "6%", tone: "#b44b68" },
  { icon: Flower2, top: "66%", size: 70, rotate: "-14deg", opacity: 0.11, posKey: "right", posVal: "15%", tone: "#c98c9d" },
  { icon: Droplets, top: "88%", size: 46, rotate: "7deg", opacity: 0.14, posKey: "right", posVal: "6%", tone: "#b44b68" },
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
