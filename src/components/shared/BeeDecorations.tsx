"use client";

import { Sparkles, Moon, Star } from "lucide-react";
import { useFeatureFlags } from "@/components/shared/FeatureFlagsProvider";

// PC 여백에 불규칙적으로 배치되는 장식 컴포넌트.
// 최고관리자 "장식" 스위치가 켜져 있을 때만 표시.
// 화면 전체 여백에 fixed 배치 (왼쪽/오른쪽 끝에서부터 다양하게 분포).

type Deco = {
  icon: typeof Sparkles;
  top: string;
  size: number;
  rotate: string;
  opacity: number;
  posKey: "left" | "right";
  posVal: string;
};

const PUBLIC_BEES: Deco[] = [
  // 왼쪽 여백 — 7개 (화면 왼쪽 끝에서 다양하게)
  { icon: Sparkles, top: "5%",  size: 45, rotate: "-15deg", opacity: 0.5,  posKey: "left", posVal: "2%" },
  { icon: Star,     top: "18%", size: 51, rotate: "8deg",   opacity: 0.45, posKey: "left", posVal: "12%" },
  { icon: Moon,     top: "33%", size: 42, rotate: "-5deg",  opacity: 0.5,  posKey: "left", posVal: "5%" },
  { icon: Sparkles, top: "48%", size: 54, rotate: "20deg",  opacity: 0.4,  posKey: "left", posVal: "18%" },
  { icon: Star,     top: "62%", size: 45, rotate: "-12deg", opacity: 0.45, posKey: "left", posVal: "8%" },
  { icon: Moon,     top: "76%", size: 48, rotate: "6deg",   opacity: 0.4,  posKey: "left", posVal: "3%" },
  { icon: Sparkles, top: "89%", size: 42, rotate: "-20deg", opacity: 0.35, posKey: "left", posVal: "15%" },
  // 오른쪽 여백 — 7개 (화면 오른쪽 끝에서 다양하게)
  { icon: Star,     top: "10%", size: 48, rotate: "10deg",  opacity: 0.45, posKey: "right", posVal: "3%" },
  { icon: Moon,     top: "23%", size: 42, rotate: "-18deg", opacity: 0.4,  posKey: "right", posVal: "15%" },
  { icon: Sparkles, top: "38%", size: 54, rotate: "5deg",   opacity: 0.5,  posKey: "right", posVal: "7%" },
  { icon: Star,     top: "53%", size: 45, rotate: "-8deg",  opacity: 0.45, posKey: "right", posVal: "20%" },
  { icon: Sparkles, top: "67%", size: 48, rotate: "15deg",  opacity: 0.4,  posKey: "right", posVal: "2%" },
  { icon: Moon,     top: "80%", size: 42, rotate: "-6deg",  opacity: 0.4,  posKey: "right", posVal: "10%" },
  { icon: Star,     top: "92%", size: 51, rotate: "12deg",  opacity: 0.35, posKey: "right", posVal: "5%" },
];

// 관리자 대시보드용 장식: 화면 전체 좌우 여백에 소형으로 분포
const DASHBOARD_BEES: Deco[] = [
  // 왼쪽 — 4개
  { icon: Sparkles, top: "18%", size: 36, rotate: "-20deg", opacity: 0.4,  posKey: "left", posVal: "2%" },
  { icon: Star,     top: "40%", size: 42, rotate: "10deg",  opacity: 0.35, posKey: "left", posVal: "8%" },
  { icon: Moon,     top: "62%", size: 36, rotate: "-5deg",  opacity: 0.4,  posKey: "left", posVal: "3%" },
  { icon: Sparkles, top: "82%", size: 39, rotate: "15deg",  opacity: 0.35, posKey: "left", posVal: "12%" },
  // 오른쪽 — 4개
  { icon: Star,     top: "22%", size: 39, rotate: "8deg",   opacity: 0.4,  posKey: "right", posVal: "3%" },
  { icon: Moon,     top: "46%", size: 36, rotate: "-15deg", opacity: 0.35, posKey: "right", posVal: "10%" },
  { icon: Sparkles, top: "66%", size: 42, rotate: "6deg",   opacity: 0.4,  posKey: "right", posVal: "5%" },
  { icon: Star,     top: "85%", size: 36, rotate: "-10deg", opacity: 0.35, posKey: "right", posVal: "15%" },
];

interface BeeDecorationsProps {
  isDashboard?: boolean;
}

export default function BeeDecorations({ isDashboard = false }: BeeDecorationsProps) {
  const flags = useFeatureFlags();
  if (!flags.beeDecoration) return null;

  const decos = isDashboard ? DASHBOARD_BEES : PUBLIC_BEES;

  return (
    <>
      {decos.map((deco, i) => {
        const DecoIcon = deco.icon;
        const style: React.CSSProperties = {
          position: "fixed",
          top: deco.top,
          [deco.posKey]: deco.posVal,
          zIndex: 5,
          opacity: deco.opacity,
          transform: `rotate(${deco.rotate})`,
          pointerEvents: "none",
          userSelect: "none",
        };
        return (
          <DecoIcon
            key={i}
            size={deco.size}
            strokeWidth={1.2}
            style={style}
            className="hidden lg:block text-[#2d1b69]"
          />
        );
      })}
    </>
  );
}
