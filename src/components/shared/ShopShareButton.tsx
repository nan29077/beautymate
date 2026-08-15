"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

// 점집 예약 URL 공유 버튼.
// Web Share API 가 있으면 네이티브 공유 시트, 없으면 클립보드 복사로 폴백한다.

export default function ShopShareButton({
  slug,
  shopName,
  themeColor,
}: {
  slug: string;
  shopName: string;
  themeColor: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/shop/${slug}` : `/shop/${slug}`;
    const shareData = {
      title: `${shopName} | 사주나라`,
      text: `${shopName}에서 상담을 예약해 보세요.`,
      url,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // 사용자가 취소했거나 실패 → 복사로 폴백
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold border transition-all active:scale-95"
      style={{ color: themeColor, borderColor: `${themeColor}55`, backgroundColor: `${themeColor}10` }}
    >
      {copied ? <Check size={13} strokeWidth={2.2} /> : <Share2 size={13} strokeWidth={1.8} />}
      {copied ? "링크 복사됨" : "예약 링크 공유"}
    </button>
  );
}
