"use client";

import { useState } from "react";
import { Sparkles, X, Calendar, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Reservation = {
  id: string;
  status: string;
  reservationDate: Date | string;
  reservationTime: string;
  createdAt: Date | string;
  product: { name: string } | null;
};

type AiSummary = {
  id: string;
  message: string;
  liveStreamId: string;
  liveStream: {
    title: string;
    startedAt: Date | string | null;
    shareCode: string | null;
  };
};

type Props = {
  reservations: Reservation[];
  aiSummaries: AiSummary[];
  consultantName: string;
  sellerSlug: string;
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "예약신청", color: "bg-yellow-50 text-yellow-700" },
  CONFIRMED: { label: "예약확정", color: "bg-blue-50 text-blue-600" },
  COMPLETED: { label: "상담완료", color: "bg-green-50 text-green-600" },
  CANCELLED: { label: "취소됨", color: "bg-red-50 text-red-600" },
  NO_SHOW: { label: "노쇼", color: "bg-gray-100 text-gray-500" },
};

function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function toYMD(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export default function ConsultDetailSheet({
  reservations,
  aiSummaries,
  consultantName,
}: Props) {
  const [selected, setSelected] = useState<Reservation | null>(null);

  // 날짜 기준으로 AI 요약 매칭
  const matchedSummary = selected
    ? aiSummaries.find(
        (s) => toYMD(s.liveStream.startedAt) === toYMD(selected.reservationDate)
      ) ?? null
    : null;

  const status = selected ? (STATUS_MAP[selected.status] ?? { label: selected.status, color: "bg-gray-50 text-gray-600" }) : null;

  return (
    <>
      {/* 상담 내역 리스트 */}
      {reservations.length > 0 ? (
        <div className="px-4 pb-3">
          {reservations.slice(0, 10).map((r) => {
            const s = STATUS_MAP[r.status] ?? { label: r.status, color: "bg-gray-50 text-gray-600" };
            return (
              <div
                key={r.id}
                className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[14px] font-bold text-gray-900 truncate">
                    {r.product?.name || "상담"}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(r.reservationDate).toLocaleDateString("ko-KR")} {r.reservationTime}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.color}`}>
                    {s.label}
                  </span>
                  <button
                    onClick={() => setSelected(r)}
                    className="text-[11px] text-violet-600 font-medium px-2 py-0.5 rounded-lg bg-violet-50 hover:bg-violet-100 transition-colors"
                  >
                    상세보기
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 px-4">
          <div className="text-3xl mb-2 opacity-30">📋</div>
          <p className="text-xs">아직 상담 내역이 없습니다.</p>
        </div>
      )}

      {/* 상세보기 바텀 시트 */}
      {selected && (
        <>
          {/* 딤 */}
          <div
            className="fixed inset-0 z-[70] bg-black/40"
            onClick={() => setSelected(null)}
          />
          {/* 시트 */}
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[80] w-full max-w-[480px] bg-white rounded-t-2xl shadow-2xl animate-slide-up">
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">상담 상세</h3>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="px-5 pt-4 pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* 상담 정보 */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-violet-500 flex-shrink-0" />
                  <span className="text-xs text-gray-500">뷰티 전문가</span>
                  <span className="text-sm font-semibold text-gray-900 ml-auto">{consultantName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-violet-500 flex-shrink-0" />
                  <span className="text-xs text-gray-500">날짜</span>
                  <span className="text-sm font-semibold text-gray-900 ml-auto">
                    {toDateStr(selected.reservationDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-violet-500 flex-shrink-0" />
                  <span className="text-xs text-gray-500">시간</span>
                  <span className="text-sm font-semibold text-gray-900 ml-auto">{selected.reservationTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs text-gray-500">상태</span>
                  <span className={cn("text-[11px] px-2 py-0.5 rounded-full ml-auto", status?.color)}>
                    {status?.label}
                  </span>
                </div>
                {selected.product && (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs text-gray-500">서비스 종류</span>
                    <span className="text-sm font-semibold text-gray-900 ml-auto truncate max-w-[180px]">
                      {selected.product.name}
                    </span>
                  </div>
                )}
              </div>

              {/* AI 상담 요약 */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={14} className="text-violet-500" />
                  <h4 className="text-sm font-bold text-gray-900">AI 상담 요약</h4>
                </div>
                {matchedSummary ? (
                  <div className="bg-violet-50 rounded-xl p-4">
                    <p className="text-xs text-gray-700 leading-relaxed">{matchedSummary.message}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-400">이 상담에 대한 AI 요약이 없어요.</p>
                    <p className="text-[11px] text-gray-400 mt-1">라이브 뷰티에 참여하면 AI가 내용을 정리해드려요.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
