"use client";

// 관리자 영상 세션 관리 — 목록/필터/실시간 모니터링/강제 종료
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Users, PhoneOff } from "lucide-react";
import {
  DashboardEmptyState,
  DashboardFilterPill,
  DashboardPageHeader,
  DashboardPanel,
  DashboardStatusBadge,
} from "@/components/shared/DashboardUI";

interface SessionRow {
  id: string;
  status: "WAITING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  roomName: string;
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;
  createdAt: string;
  reservation: {
    id: string;
    reservationNumber: string;
    reservationDate: string;
    reservationTime: string;
    customerName: string;
    status: string;
    shopName: string;
    consultantName: string | null;
    productName: string | null;
  };
}

const STATUS_TABS = [
  { key: "ALL", label: "전체" },
  { key: "ACTIVE", label: "진행 중" },
  { key: "WAITING", label: "대기" },
  { key: "COMPLETED", label: "완료" },
  { key: "CANCELLED", label: "취소" },
] as const;

const STATUS_BADGE: Record<SessionRow["status"], { label: string; tone: "gold" | "success" | "neutral" | "danger" }> = {
  WAITING: { label: "대기", tone: "gold" },
  ACTIVE: { label: "진행 중", tone: "success" },
  COMPLETED: { label: "완료", tone: "neutral" },
  CANCELLED: { label: "취소", tone: "danger" },
};

export default function AdminSessionsClient() {
  const [status, setStatus] = useState<string>("ALL");
  const [date, setDate] = useState("");
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);
  // 진행 중 세션의 실시간 참여자 수 (id -> count)
  const [presence, setPresence] = useState<Record<string, number | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status });
      if (date) qs.set("date", date);
      const res = await fetch(`/api/admin/sessions?${qs.toString()}`);
      if (res.status === 503) {
        setUnavailable(true);
        return;
      }
      const body = await res.json();
      if (res.ok) {
        setRows(body.sessions);
        setTotal(body.total);
      }
    } finally {
      setLoading(false);
    }
  }, [status, date]);

  useEffect(() => {
    load();
  }, [load]);

  // 진행 중 세션 참여자 수 폴링 (15초)
  useEffect(() => {
    const activeIds = rows.filter((r) => r.status === "ACTIVE").map((r) => r.id);
    if (activeIds.length === 0) return;
    let alive = true;
    const poll = async () => {
      const entries = await Promise.all(
        activeIds.map(async (id) => {
          try {
            const res = await fetch(`/api/admin/sessions/${id}`);
            if (!res.ok) return [id, null] as const;
            const body = await res.json();
            return [id, body.session.participantCount as number | null] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      if (alive) setPresence(Object.fromEntries(entries));
    };
    poll();
    const t = setInterval(poll, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [rows]);

  const handleForceEnd = async (row: SessionRow) => {
    if (
      !window.confirm(
        `${row.reservation.customerName}님의 세션을 강제 종료할까요?\n(예약은 완료 처리됩니다)`,
      )
    )
      return;
    setEndingId(row.id);
    try {
      const res = await fetch(`/api/admin/sessions/${row.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "force-end" }),
      });
      const body = await res.json();
      if (!res.ok) {
        alert(body.error || "강제 종료에 실패했습니다.");
        return;
      }
      await load();
    } finally {
      setEndingId(null);
    }
  };

  if (unavailable) {
    return (
      <div className="space-y-5">
        <DashboardPageHeader iconName="Video" title="영상 세션 관리" description="영상 상담 세션의 연결 및 진행 상태를 관리합니다." />
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
          영상 상담 세션 테이블이 아직 데이터베이스에 반영되지 않았습니다. 스키마 반영 후
          이용할 수 있습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        iconName="Video"
        title="영상 세션 관리"
        description="진행 중인 영상 상담과 고객 접속 상태를 실시간으로 확인합니다."
        meta={`총 ${total}건`}
        actions={<button
          onClick={load}
          className="flex items-center gap-1.5 rounded-xl border border-brand-100 bg-white px-3 py-2 text-xs font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>}
      />

      {/* 필터 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {STATUS_TABS.map((t) => (
            <DashboardFilterPill
              key={t.key}
              onClick={() => setStatus(t.key)}
              active={status === t.key}
            >
              {t.label}
            </DashboardFilterPill>
          ))}
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600"
        />
        {date && (
          <button
            onClick={() => setDate("")}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            날짜 초기화
          </button>
        )}
      </div>

      {/* 목록 */}
      {loading && rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : rows.length === 0 ? (
        <DashboardEmptyState iconName="Video" title="해당 조건의 영상 세션이 없습니다" description="필터를 변경하거나 새로고침해 보세요." />
      ) : (
        <DashboardPanel className="overflow-x-auto">
          <table className="w-full text-xs min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">예약 일시</th>
                <th className="px-4 py-3 font-medium">뷰티샵 / 뷰티 전문가</th>
                <th className="px-4 py-3 font-medium">고객</th>
                <th className="px-4 py-3 font-medium">상품</th>
                <th className="px-4 py-3 font-medium">진행</th>
                <th className="px-4 py-3 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const badge = STATUS_BADGE[row.status];
                const live = row.status === "ACTIVE";
                return (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <DashboardStatusBadge tone={badge.tone} live={live}>
                        {badge.label}
                      </DashboardStatusBadge>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(row.reservation.reservationDate).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {row.reservation.reservationTime}
                      <p className="text-[10px] text-gray-300">
                        {row.reservation.reservationNumber}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.reservation.shopName}
                      <p className="text-[10px] text-gray-400">
                        {row.reservation.consultantName}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.reservation.customerName}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {row.reservation.productName || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {row.status === "COMPLETED" && row.duration != null
                        ? `${row.duration}분`
                        : live
                          ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <Users size={12} />
                                {presence[row.id] != null ? `${presence[row.id]}명 접속` : "확인 중"}
                              </span>
                            )
                          : "-"}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <Link
                        href={`/admin/reservations?number=${row.reservation.reservationNumber}`}
                        className="text-indigo-500 hover:underline"
                      >
                        예약
                      </Link>
                      {(row.status === "ACTIVE" || row.status === "WAITING") && (
                        <button
                          onClick={() => handleForceEnd(row)}
                          disabled={endingId === row.id}
                          className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 disabled:opacity-40"
                        >
                          <PhoneOff size={11} />
                          {endingId === row.id ? "종료 중" : "강제 종료"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DashboardPanel>
      )}
    </div>
  );
}
