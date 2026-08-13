"use client";

// 관리자 라이브 관리 — 전체 라이브 목록 + 방송별 예약 현황
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Radio, RefreshCw, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface LiveRow {
  id: string;
  title: string;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  shareCode: string;
  viewerCount: number;
  peakViewerCount: number;
  platform: string | null;
  productCount: number;
  shopName: string;
  shopSlug: string;
  consultantName: string | null;
  sellerId: string;
  reservations: { total: number; confirmed: number; completed: number };
  reservationSettings: { dailySlotLimit: number | null; showReservationWidget: boolean } | null;
}

const STATUS_TABS = [
  { key: "ALL", label: "전체" },
  { key: "LIVE", label: "방송 중" },
  { key: "SCHEDULED", label: "예정" },
  { key: "ENDED", label: "종료" },
] as const;

const STATUS_BADGE: Record<LiveRow["status"], { label: string; cls: string }> = {
  SCHEDULED: { label: "예정", cls: "bg-amber-50 text-amber-600" },
  LIVE: { label: "LIVE", cls: "bg-red-50 text-red-600" },
  ENDED: { label: "종료", cls: "bg-gray-100 text-gray-500" },
  CANCELLED: { label: "취소", cls: "bg-gray-100 text-gray-400" },
};

export default function AdminLivesClient() {
  const [status, setStatus] = useState("ALL");
  const [sellerFilter, setSellerFilter] = useState("");
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [sellers, setSellers] = useState<{ id: string; shopName: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status, page: String(page) });
      if (sellerFilter) qs.set("sellerId", sellerFilter);
      const res = await fetch(`/api/admin/lives?${qs.toString()}`);
      const body = await res.json();
      if (res.ok) {
        setRows(body.lives);
        setSellers(body.sellers);
        setTotal(body.total);
        setTotalPages(body.totalPages || 1);
      }
    } finally {
      setLoading(false);
    }
  }, [status, sellerFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Radio size={20} className="text-red-500" /> 라이브 관리
          <span className="text-sm font-normal text-gray-400">총 {total}건</span>
        </h1>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setPage(1);
                setStatus(t.key);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                status === t.key
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={sellerFilter}
          onChange={(e) => {
            setPage(1);
            setSellerFilter(e.target.value);
          }}
          className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-600"
        >
          <option value="">전체 점집</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.shopName}
            </option>
          ))}
        </select>
      </div>

      {loading && rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">라이브가 없습니다.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-xs min-w-[860px]">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">방송</th>
                <th className="px-4 py-3 font-medium">점집 / 상담사</th>
                <th className="px-4 py-3 font-medium">일시</th>
                <th className="px-4 py-3 font-medium text-right">시청</th>
                <th className="px-4 py-3 font-medium text-right">예약 현황</th>
                <th className="px-4 py-3 font-medium text-right">예약 시간 설정</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const badge = STATUS_BADGE[row.status];
                const when = row.startedAt || row.scheduledAt;
                return (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${badge.cls}`}
                      >
                        {row.status === "LIVE" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        )}
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/lives/${row.id}`}
                        className="font-medium text-gray-800 hover:underline"
                      >
                        {row.title}
                      </Link>
                      <p className="text-[10px] text-gray-400">
                        <Link href={`/live/${row.shareCode}`} target="_blank" className="hover:underline">
                          {row.shareCode}
                        </Link>{" "}
                        · 상품 {row.productCount}개
                        {row.platform ? ` · ${row.platform}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.shopName}
                      <p className="text-[10px] text-gray-400">{row.consultantName}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {when ? new Date(when).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {row.viewerCount}
                      <span className="text-[10px] text-gray-300"> / 최고 {row.peakViewerCount}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
                        <Calendar size={11} />
                        {row.reservations.total}건
                      </span>
                      <p className="text-[10px] text-gray-400">
                        확정 {row.reservations.confirmed} · 완료 {row.reservations.completed}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {row.reservationSettings
                        ? row.reservationSettings.dailySlotLimit != null
                          ? `당일 ${row.reservationSettings.dailySlotLimit}건`
                          : "무제한"
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
