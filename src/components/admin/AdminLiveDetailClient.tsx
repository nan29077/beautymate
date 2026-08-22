"use client";

// 관리자 라이브 상세 — 방송 정보·예약 상태별 집계·방송 유래 예약 목록
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Radio, RefreshCw, Eye, Heart, Calendar } from "lucide-react";

interface LiveDetail {
  id: string;
  title: string;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  shareCode: string;
  viewerCount: number;
  peakViewerCount: number;
  likeCount: number;
  platform: string | null;
  shopName: string;
  shopSlug: string;
  consultantName: string | null;
  products: { id: string; name: string }[];
}

interface ReservationRow {
  id: string;
  reservationNumber: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  paymentStatus: string;
  finalAmount: number;
  reservationDate: string;
  reservationTime: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

interface Summary {
  total: number;
  PENDING: number;
  CONFIRMED: number;
  COMPLETED: number;
  CANCELLED: number;
  NO_SHOW: number;
}

const LIVE_BADGE: Record<LiveDetail["status"], { label: string; cls: string }> = {
  SCHEDULED: { label: "예정", cls: "bg-amber-50 text-amber-600" },
  LIVE: { label: "LIVE", cls: "bg-red-50 text-red-600" },
  ENDED: { label: "종료", cls: "bg-gray-100 text-gray-500" },
  CANCELLED: { label: "취소", cls: "bg-gray-100 text-gray-400" },
};

const RES_BADGE: Record<ReservationRow["status"], { label: string; cls: string }> = {
  PENDING: { label: "대기", cls: "bg-amber-50 text-amber-600" },
  CONFIRMED: { label: "확정", cls: "bg-indigo-50 text-indigo-600" },
  COMPLETED: { label: "완료", cls: "bg-emerald-50 text-emerald-600" },
  CANCELLED: { label: "취소", cls: "bg-gray-100 text-gray-400" },
  NO_SHOW: { label: "노쇼", cls: "bg-rose-50 text-rose-500" },
};

const SUMMARY_CARDS: { key: keyof Summary; label: string; accent: string }[] = [
  { key: "total", label: "전체", accent: "text-gray-900" },
  { key: "PENDING", label: "대기", accent: "text-amber-600" },
  { key: "CONFIRMED", label: "확정", accent: "text-indigo-600" },
  { key: "COMPLETED", label: "완료", accent: "text-emerald-600" },
  { key: "CANCELLED", label: "취소", accent: "text-gray-400" },
  { key: "NO_SHOW", label: "노쇼", accent: "text-rose-500" },
];

export default function AdminLiveDetailClient({ liveId }: { liveId: string }) {
  const [live, setLive] = useState<LiveDetail | null>(null);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/lives/${liveId}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "불러오지 못했습니다.");
        return;
      }
      setLive(body.live);
      setReservations(body.reservations);
      setSummary(body.summary);
      setTotalAmount(body.totalAmount);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [liveId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !live) {
    return <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>;
  }
  if (error || !live) {
    return (
      <div className="p-6 space-y-4">
        <Link href="/admin/lives" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
          <ArrowLeft size={13} /> 라이브 관리로
        </Link>
        <div className="py-16 text-center text-sm text-gray-400">{error || "라이브를 찾을 수 없습니다."}</div>
      </div>
    );
  }

  const badge = LIVE_BADGE[live.status];
  const when = live.startedAt || live.scheduledAt;
  const filtered =
    statusFilter === "ALL" ? reservations : reservations.filter((r) => r.status === statusFilter);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* 헤더 */}
      <div className="space-y-2">
        <Link href="/admin/lives" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
          <ArrowLeft size={13} /> 라이브 관리로
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Radio size={20} className="text-red-500" />
            {live.title}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
              {live.status === "LIVE" && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              {badge.label}
            </span>
          </h1>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {live.shopName}
          {live.consultantName ? ` · ${live.consultantName}` : ""} ·{" "}
          <Link href={`/live/${live.shareCode}`} target="_blank" className="text-indigo-500 hover:underline">
            {live.shareCode}
          </Link>
          {live.platform ? ` · ${live.platform}` : ""}
          {when
            ? ` · ${new Date(when).toLocaleString("ko-KR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Eye size={13} /> 시청 {live.viewerCount} (최고 {live.peakViewerCount})
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart size={13} /> 좋아요 {live.likeCount}
          </span>
          {live.products.length > 0 && <span>뷰티 서비스 {live.products.length}개</span>}
        </div>
      </div>

      {/* 상태별 집계 */}
      {summary && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {SUMMARY_CARDS.map((c) => (
            <button
              key={c.key}
              onClick={() => setStatusFilter(c.key === "total" ? "ALL" : c.key)}
              className={`bg-white rounded-xl border px-3 py-3 text-left transition-colors ${
                (c.key === "total" && statusFilter === "ALL") || statusFilter === c.key
                  ? "border-gray-900"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <p className="text-[10px] text-gray-400">{c.label}</p>
              <p className={`text-lg font-bold ${c.accent}`}>{summary[c.key]}</p>
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500">
        <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
          <Calendar size={12} /> 예약 매출(취소 제외) {totalAmount.toLocaleString()}원
        </span>
      </p>

      {/* 예약 목록 */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400 bg-white rounded-xl border border-gray-200">
          {statusFilter === "ALL" ? "이 방송에서 들어온 예약이 없습니다." : "해당 상태의 예약이 없습니다."}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-xs min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">예약번호</th>
                <th className="px-4 py-3 font-medium">고객</th>
                <th className="px-4 py-3 font-medium">예약 일시</th>
                <th className="px-4 py-3 font-medium text-right">금액</th>
                <th className="px-4 py-3 font-medium">결제</th>
                <th className="px-4 py-3 font-medium">신청 시각</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const rb = RES_BADGE[r.status];
                return (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${rb.cls}`}>{rb.label}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600">{r.reservationNumber}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.customerName}
                      <p className="text-[10px] text-gray-400">
                        {r.customerPhone}
                        {r.userEmail ? ` · ${r.userEmail}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(r.reservationDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}{" "}
                      {r.reservationTime}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {r.finalAmount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.paymentStatus}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(r.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
