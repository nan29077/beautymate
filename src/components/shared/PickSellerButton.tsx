"use client";

import { Icon } from '@/components/shared/Icon';
import { useState, useEffect } from "react";
import { X, Sparkles } from 'lucide-react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAppDialog } from "@/components/shared/AppDialog";

// 상담사 Pick(팔로우) 토글.
// 셀러브릭스 시절의 SNS 채널 구독 인증(ChannelVerification) 연동은 제거되었고,
// 지금은 순수하게 Pick / Pick 해제만 처리한다.

interface PickSellerButtonProps {
  sellerId: string;
  sellerName: string;
  variant?: "default" | "icon" | "large";
  className?: string;
}

export default function PickSellerButton({
  sellerId,
  sellerName,
  variant = "default",
  className = "",
}: PickSellerButtonProps) {
  const { appConfirm } = useAppDialog();
  const { data: session } = useSession();
  const router = useRouter();
  const [isPicked, setIsPicked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/sellers/pick?sellerId=${sellerId}`)
      .then((r) => r.json())
      .then((d) => setIsPicked(d.picked))
      .catch(() => {});
  }, [session, sellerId]);

  const handlePick = async () => {
    if (!session) {
      router.push("/auth/login");
      return;
    }

    if (isPicked) {
      const confirmed = await appConfirm("Pick을 취소하시겠습니까?");
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sellers/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId }),
      });
      const data = await res.json();
      setIsPicked(data.picked);
      if (data.picked) setShowPopup(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // ─── PICK 완료 안내 팝업 ───
  const PickPopup = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowPopup(false)}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-fade-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-brand-500 to-pink-500 px-6 pt-8 pb-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full" />
            <div className="absolute -bottom-5 -left-5 w-24 h-24 bg-white rounded-full" />
          </div>
          <button
            onClick={() => setShowPopup(false)}
            className="absolute top-3 right-3 p-1.5 text-white/60 hover:text-white transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur mx-auto flex items-center justify-center mb-3">
              <Sparkles size={28} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Pick 완료!</h2>
            <p className="text-white/80 text-sm">{sellerName}을(를) Pick 하셨습니다</p>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="bg-brand-50 rounded-xl px-4 py-3 mb-4">
            <p className="text-[13px] text-brand-700 leading-relaxed">
              Pick 한 상담사의 <strong>라이브 상담 시작</strong>과 새 소식을 알림으로 받아볼 수 있어요.
            </p>
          </div>
          <button onClick={() => setShowPopup(false)} className="w-full py-3 text-sm btn-primary">
            확인
          </button>
        </div>
      </div>
    </div>
  );

  // ─── 버튼 렌더링 ───

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={handlePick}
          disabled={loading}
          className={`p-2 rounded-full transition-all ${
            isPicked ? "bg-brand-50 text-brand-500" : "bg-white/80 text-gray-400 hover:text-brand-500"
          } ${className}`}
          title={isPicked ? "Pick 해제" : `${sellerName} Pick`}
        >
          <Icon name="Wishlist" size={20} strokeWidth={1.5} className={isPicked ? "fill-brand-500" : ""} />
        </button>
        {showPopup && <PickPopup />}
      </>
    );
  }

  if (variant === "large") {
    return (
      <>
        <button
          onClick={handlePick}
          disabled={loading}
          className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-sm transition-all ${
            isPicked
              ? "bg-brand-50 text-brand-600 border border-brand-200"
              : "bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 border border-gray-200"
          } ${className}`}
        >
          <Icon name="Wishlist" size={18} strokeWidth={1.5} className={isPicked ? "fill-brand-500 text-brand-500" : ""} />
          {isPicked ? "Picked!" : "Pick"}
        </button>
        {showPopup && <PickPopup />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handlePick}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          isPicked
            ? "bg-brand-500 text-white shadow-sm"
            : "bg-white border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600"
        } ${className}`}
      >
        <Icon name="Wishlist" size={16} strokeWidth={isPicked ? 2 : 1.5} className={isPicked ? "fill-white" : ""} />
        {isPicked ? "Picked" : "Pick"}
      </button>
      {showPopup && <PickPopup />}
    </>
  );
}
