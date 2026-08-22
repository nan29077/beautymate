"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Upload, Loader2 } from "lucide-react";
import { BEAUTYMATE_CUSTOMER_AVATARS } from "@/lib/defaults";
import ImageUploader from "@/components/shared/ImageUploader";

// 뷰티 전문가 프로필(동물 캐릭터) 선택 UI.
// 가입 시 랜덤 배정된 뷰티 동물 캐릭터를 다른 캐릭터로 바꾸거나, 직접 사진을 올릴 수 있다.
// 저장 대상은 User.avatar (뷰티샵 로고 shopLogo 와는 별개).

interface Props {
  /** 현재 확정된 표시 이미지 (동물 캐릭터 또는 업로드 이미지) */
  currentImage: string;
  /** 뷰티샵 로고가 설정돼 있으면 공개 페이지에서는 로고가 우선한다 — 안내용 */
  hasShopLogo?: boolean;
}

export default function ConsultantAvatarPicker({ currentImage, hasShopLogo = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentImage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const save = async (value: string) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장에 실패했습니다.");
      setOpen(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-1">내 프로필 캐릭터</h3>
      <p className="text-[10px] text-gray-400 mb-4">
        대시보드와 뷰티 전문가 목록에 표시됩니다.
        {hasShopLogo && " 뷰티샵 페이지에서는 위에서 설정한 뷰티샵 로고가 우선 표시됩니다."}
      </p>

      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
          <img src={currentImage} alt="내 프로필 캐릭터" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => { setSelected(currentImage); setOpen(true); }}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 active:scale-95 transition-all"
          >
            프로필 이미지 변경
          </button>
          {savedFlash && (
            <p className="text-[11px] text-green-600 mt-2 flex items-center gap-1">
              <Check size={12} /> 저장되었습니다.
            </p>
          )}
          <p className="text-[10px] text-gray-400 mt-2">
            뷰티메이트 동물 캐릭터 {BEAUTYMATE_CUSTOMER_AVATARS.length}종 중에서 고르거나 직접 올릴 수 있어요.
          </p>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={() => !saving && setOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-lg max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h4 className="text-sm font-bold text-gray-900">프로필 이미지 선택</h4>
              <button onClick={() => !saving && setOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600" aria-label="닫기">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-[11px] font-semibold text-gray-500 mb-2">뷰티 동물 캐릭터</p>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                {BEAUTYMATE_CUSTOMER_AVATARS.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSelected(src)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      selected === src ? "border-brand-500 ring-2 ring-brand-200 scale-105" : "border-transparent hover:border-gray-200"
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    {selected === src && (
                      <span className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                        <Check size={16} className="text-white drop-shadow" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-gray-500 mb-2 flex items-center gap-1">
                  <Upload size={12} /> 직접 업로드
                </p>
                <ImageUploader
                  images={selected && !selected.startsWith("/avatars/") ? [selected] : []}
                  onChange={(urls) => { if (urls[0]) setSelected(urls[0]); }}
                  maxImages={1}
                  compact
                />
              </div>

              {error && <p className="text-[12px] text-red-500 mt-3">{error}</p>}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-2">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                <img src={selected} alt="선택된 프로필" className="w-full h-full object-cover" />
              </div>
              <button
                onClick={() => save(selected)}
                disabled={saving || selected === currentImage}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
              >
                {saving ? (<><Loader2 size={15} className="animate-spin" /> 저장 중...</>) : "이 이미지로 저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
