"use client";

import { Tag, Shirt, Palette, Leaf, Gem, Home as HomeIcon, Laptop, Baby, Dumbbell, Plane, Dog, BookOpen, Headphones, Camera, Coffee, Utensils, Heart, Music, Gamepad2, Car, Bike, Flower2, Scissors, Watch, Glasses, Wine, Cake, Pizza, IceCream, Apple, Carrot, Fish, Stethoscope, Pill, Gift, Sparkles, Sun, Moon, Umbrella, Tent, Mountain, Waves, Paintbrush, Brush, Wrench, Hammer, Lightbulb, Smartphone, Tv, Monitor, Printer, Wifi, Footprints, Crown, Ribbon, Star, Zap, Theater, Clapperboard, Mic, Radio, Globe, Map, Compass, Anchor, Rocket, Flag, Trophy, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Shirt, Palette, Leaf, Gem, HomeIcon, Laptop, Baby, Dumbbell, Plane, Dog, BookOpen,
  Headphones, Camera, Coffee, Utensils, Heart, Tag, Music, Gamepad2, Car, Bike,
  Flower2, Scissors, Watch, Glasses, Wine, Cake, Pizza, IceCream, Apple, Carrot, Fish,
  Stethoscope, Pill, Gift, Sparkles, Sun, Moon, Umbrella, Tent, Mountain, Waves,
  Paintbrush, Brush, Wrench, Hammer, Lightbulb, Smartphone, Tv, Monitor, Printer, Wifi,
  Footprints, Crown, Ribbon, Star, Zap, Theater, Clapperboard, Mic, Radio, Globe,
  Map, Compass, Anchor, Rocket, Flag, Trophy,
};

// 슬러그 → 아이콘 이름 폴백 맵
const SLUG_FALLBACK: Record<string, string> = {
  beautymate: "Sun", sinjeom: "Sparkles", tarot: "Star", gunghap: "Heart",
  jakmyeong: "Paintbrush", gwansang: "Glasses", taegil: "Flag", pungsu: "Compass",
  astrology: "Globe", dream: "Moon", bujeok: "Ribbon", gut: "Theater",
  counseling: "Stethoscope", fortune: "Zap", love: "Heart", money: "Gem",
  career: "Trophy", health: "Stethoscope", family: "HomeIcon", study: "BookOpen",
};

interface CategoryIconProps {
  iconName?: string | null;
  slug?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function CategoryIcon({ iconName, slug, size = 20, strokeWidth = 1.5, className }: CategoryIconProps) {
  // 1) DB에 저장된 icon name 우선
  // 2) 없으면 slug 기반 폴백
  // 3) 그래도 없으면 Tag
  const resolvedName = iconName || (slug ? SLUG_FALLBACK[slug] : null) || "Tag";
  const Icon = ICON_MAP[resolvedName] || Tag;

  return <Icon size={size} strokeWidth={strokeWidth} className={className} />;
}
