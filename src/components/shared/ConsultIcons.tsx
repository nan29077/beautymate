"use client";

// 뷰티 서비스 카드에서 쓰는 라인형 아이콘 모음 (lucide-react 만 사용).
// 뷰티메이트는 이모지를 쓰지 않고 전부 라인 아이콘으로 통일한다.

import {
  Sparkles,
  Layers,
  Eye,
  PenLine,
  MessageCircle,
  Video,
  Phone,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import type { ConsultTypeKey } from "@/lib/consulting";

/**
 * 상담 분야별 아이콘.
 *
 *   스킨케어 · 메이크업      → Sparkles
 *   퍼스널 컬러             → Layers
 *   헤어 · 브로우              → Eye
 *   이미지 컨설팅 · 네일      → PenLine
 *   그 외(상담 일반) → MessageCircle
 *
 * 상품명/분야 텍스트에서 키워드를 찾아 고른다.
 */
export function consultTopicIcon(text: string | null | undefined): LucideIcon {
  const s = text || "";
  if (/퍼스널 컬러|컬러/i.test(s)) return Layers;
  if (/헤어|브로우|두피/.test(s)) return Eye;
  if (/이미지 컨설팅|네일|왁싱/.test(s)) return PenLine;
  if (/뷰티|스킨케어|메이크업|바디케어/.test(s)) return Sparkles;
  return MessageCircle;
}

/** 상담 분야 아이콘을 바로 렌더 */
export function ConsultTopicIcon({
  name,
  size = 14,
  className = "",
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const Icon = consultTopicIcon(name);
  return <Icon size={size} strokeWidth={1.75} className={className} />;
}

/** 진행 방식 아이콘 — 영상 / 전화 / 방문 */
export function ConsultTypeIcon({
  type,
  size = 12,
  className = "",
}: {
  type: ConsultTypeKey | string;
  size?: number;
  className?: string;
}) {
  const Icon = type === "PHONE" ? Phone : type === "VISIT" ? MapPin : Video;
  return <Icon size={size} strokeWidth={1.75} className={className} />;
}
