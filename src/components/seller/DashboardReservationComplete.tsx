"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

// 대시보드 예약 현황에서 바로 상담 완료 처리 (PATCH /api/reservations/[id]).
// 예약 테이블 미반영 환경에서는 API가 503을 주므로 메시지만 보여주고 상태는 그대로 둔다.
export default function DashboardReservationComplete({
  reservationId,
}: {
  reservationId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!confirm("이 상담을 완료 처리하시겠습니까?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "완료 처리에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleComplete}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
    >
      <Check size={12} strokeWidth={2} />
      {loading ? "처리 중..." : "완료 처리"}
    </button>
  );
}
