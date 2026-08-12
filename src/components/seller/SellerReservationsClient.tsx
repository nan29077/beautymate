"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, List, CalendarDays, Calendar, X, User, Phone, Clock, BookOpen, NotebookPen, Loader2, Video } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Reservation {
  id: string;
  reservationNumber: string;
  status: string;
  reservationDate: string;
  reservationTime: string;
  customerName: string;
  customerPhone: string;
  birthDate: string | null;
  birthTime: string | null;
  gender: string | null;
  consultingContent: string | null;
  finalAmount: number;
  totalAmount: number;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  noShowAt: string | null;
  consultantMemo: string | null;
  session: { id: string; status: string } | null;
  user: { id: string; name: string; email: string };
  items: { id: string; productName: string; price: number; quantity: number }[];
  timeSlot: { startTime: string; endTime: string } | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  PENDING:   { label: "예약 대기", color: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-400" },
  CONFIRMED: { label: "예약 확정", color: "bg-blue-50 text-blue-700",   dot: "bg-blue-400" },
  COMPLETED: { label: "상담 완료", color: "bg-green-50 text-green-700", dot: "bg-green-400" },
  CANCELLED: { label: "취소됨",   color: "bg-gray-100 text-gray-500",   dot: "bg-gray-300" },
  NO_SHOW:   { label: "노쇼",      color: "bg-red-50 text-red-600",      dot: "bg-red-400" },
};

const FILTER_TABS = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "대기" },
  { value: "CONFIRMED", label: "확정" },
  { value: "COMPLETED", label: "완료" },
  { value: "CANCELLED", label: "취소" },
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function SellerReservationsClient({
  reservations,
  initialStatus,
  initialView,
}: {
  reservations: Reservation[];
  initialStatus: string;
  initialView: "list" | "calendar";
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [view, setView] = useState<"list" | "calendar">(initialView);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [updating, setUpdating] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  const filtered = reservations.filter(
    (r) => statusFilter === "ALL" || r.status === statusFilter
  );

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!confirm(`상태를 "${STATUS_MAP[newStatus]?.label ?? newStatus}"으로 변경하시겠습니까?`)) return;
    setUpdating(true);
    const res = await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUpdating(false);
    if (res.ok) {
      router.refresh();
      setSelected(null);
    } else {
      const data = await res.json();
      alert(data.error || "상태 변경에 실패했습니다.");
    }
  };

  // 달력 뷰용 날짜맵
  const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const dateReservations: Record<string, Reservation[]> = {};
  for (const r of reservations) {
    const d = r.reservationDate.slice(0, 10);
    if (!dateReservations[d]) dateReservations[d] = [];
    dateReservations[d].push(r);
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">예약 관리</h1>
        <div className="flex gap-1">
          <button
            onClick={() => setView("list")}
            className={`p-2 rounded-lg ${view === "list" ? "bg-gray-900 text-white" : "border border-gray-200 text-gray-500"}`}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`p-2 rounded-lg ${view === "calendar" ? "bg-gray-900 text-white" : "border border-gray-200 text-gray-500"}`}
          >
            <CalendarDays size={16} />
          </button>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-4">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === tab.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {tab.label}
            {tab.value !== "ALL" && (
              <span className="ml-1 text-xs opacity-70">
                {reservations.filter(r => r.status === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 리스트 뷰 */}
      {view === "list" && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">예약이 없습니다.</div>
          ) : (
            filtered.map((r) => {
              const s = STATUS_MAP[r.status] || { label: r.status, color: "bg-gray-100 text-gray-500", dot: "bg-gray-300" };
              const date = new Date(r.reservationDate);
              const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="w-full bg-white rounded-xl border border-gray-100 p-4 text-left hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                        <span className="font-semibold text-sm text-gray-900">{r.customerName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                        {r.session && (r.session.status === "WAITING" || r.session.status === "ACTIVE") && (
                          <Video size={13} className="text-indigo-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 ml-4">{r.items[0]?.productName}</p>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <p>{dateStr}</p>
                      <p>{r.reservationTime}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* 달력 뷰 */}
      {view === "calendar" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
                else setCalMonth(m => m - 1);
              }}
              className="p-1.5 rounded hover:bg-gray-100"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-gray-800">{calYear}년 {calMonth}월</span>
            <button
              onClick={() => {
                if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
                else setCalMonth(m => m + 1);
              }}
              className="p-1.5 rounded hover:bg-gray-100"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
              {WEEKDAYS.map((d, i) => (
                <div key={d} className={`text-center text-xs py-2 font-medium ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array(firstDay).fill(null).map((_, i) => (
                <div key={`e-${i}`} className="min-h-[56px] border-r border-b border-gray-100" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayReservations = dateReservations[dateStr] || [];
                const dow = (firstDay + day - 1) % 7;
                return (
                  <div
                    key={dateStr}
                    className="min-h-[56px] border-r border-b border-gray-100 p-1"
                  >
                    <span className={`text-xs font-medium ${dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-gray-600"}`}>
                      {day}
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {dayReservations.slice(0, 2).map((r) => {
                        const s = STATUS_MAP[r.status];
                        return (
                          <button
                            key={r.id}
                            onClick={() => setSelected(r)}
                            className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate ${s?.color || "bg-gray-100 text-gray-500"}`}
                          >
                            {r.reservationTime} {r.customerName}
                          </button>
                        );
                      })}
                      {dayReservations.length > 2 && (
                        <p className="text-[10px] text-gray-400 pl-1">+{dayReservations.length - 2}건</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 예약 상세 모달 */}
      {selected && (
        <ReservationDetailModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          updating={updating}
        />
      )}
    </div>
  );
}

function ReservationDetailModal({
  reservation: r,
  onClose,
  onStatusChange,
  updating,
}: {
  reservation: Reservation;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  updating: boolean;
}) {
  const s = STATUS_MAP[r.status] || { label: r.status, color: "bg-gray-100", dot: "bg-gray-300" };
  const date = new Date(r.reservationDate);
  const dateStr = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;

  // 허용 다음 상태
  const nextStatuses: { value: string; label: string; color: string }[] = [];
  if (r.status === "PENDING") {
    nextStatuses.push({ value: "CONFIRMED", label: "예약 확정", color: "bg-blue-600 text-white" });
    nextStatuses.push({ value: "CANCELLED", label: "취소", color: "border border-gray-200 text-gray-600" });
  }
  if (r.status === "CONFIRMED") {
    nextStatuses.push({ value: "COMPLETED", label: "상담 완료", color: "bg-green-600 text-white" });
    nextStatuses.push({ value: "NO_SHOW", label: "노쇼 처리", color: "bg-red-500 text-white" });
    nextStatuses.push({ value: "CANCELLED", label: "취소", color: "border border-gray-200 text-gray-600" });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{r.customerName}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* 예약 정보 */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">예약 정보</p>
            {r.items.map((item, i) => (
              <p key={i} className="text-sm font-medium text-gray-800">{item.productName}</p>
            ))}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={14} className="text-gray-400" />
              {dateStr} {r.reservationTime}
              {r.timeSlot && ` ~ ${r.timeSlot.endTime}`}
            </div>
          </div>

          {/* 고객 정보 */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">고객 정보</p>
            <InfoRow icon={<User size={14} />} label="이름" value={r.customerName} />
            <InfoRow icon={<Phone size={14} />} label="연락처" value={r.customerPhone} />
            {r.birthDate && <InfoRow icon={<Clock size={14} />} label="생년월일" value={r.birthDate} />}
            {r.birthTime && <InfoRow icon={<Clock size={14} />} label="태어난 시각" value={r.birthTime} />}
            {r.gender && <InfoRow icon={<User size={14} />} label="성별" value={r.gender === "M" ? "남성" : "여성"} />}
            {r.consultingContent && (
              <div className="flex items-start gap-2 mt-2">
                <BookOpen size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-400">상담 내용</span>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{r.consultingContent}</p>
                </div>
              </div>
            )}
          </div>

          {/* 결제 금액 */}
          <div className="border-t border-gray-100 pt-3 flex justify-between">
            <span className="text-sm text-gray-500">결제 금액</span>
            <span className="font-bold text-gray-900">{formatPrice(r.finalAmount)}</span>
          </div>

          {/* 영상 상담실 입장 (세션이 생성된 확정 예약) */}
          {r.session && (r.session.status === "WAITING" || r.session.status === "ACTIVE") && (
            <Link
              href={`/seller/sessions/${r.session.id}`}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white flex items-center justify-center gap-1.5 hover:bg-indigo-500"
            >
              <Video size={15} />
              영상 상담실 입장
            </Link>
          )}

          {/* 상담 메모 (상담 완료 건만) */}
          {r.status === "COMPLETED" && <ConsultantMemoEditor reservation={r} />}

          {/* 상태 변경 버튼 */}
          {nextStatuses.length > 0 && (
            <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
              {nextStatuses.map((ns) => (
                <button
                  key={ns.value}
                  onClick={() => onStatusChange(r.id, ns.value)}
                  disabled={updating}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium ${ns.color} disabled:opacity-50`}
                >
                  {ns.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 상담 완료 예약에 상담사가 남기는 내부 메모. 고객에게는 노출되지 않는다. */
function ConsultantMemoEditor({ reservation }: { reservation: Reservation }) {
  const [savedMemo, setSavedMemo] = useState(reservation.consultantMemo ?? "");
  const [memo, setMemo] = useState(reservation.consultantMemo ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const dirty = memo !== savedMemo;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/memo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "메모 저장에 실패했습니다.");
        return;
      }
      // 저장 성공 시 기준값을 갱신해 "저장" 버튼이 다시 비활성화되도록 한다.
      setSavedMemo(data.memo ?? "");
      setMemo(data.memo ?? "");
      setSaved(true);
    } catch {
      setError("메모 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-gray-100 pt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <NotebookPen size={14} className="text-gray-400" />
        <span className="text-xs text-gray-400 uppercase tracking-wide">상담 메모</span>
        <span className="text-[10px] text-gray-300">· 고객에게 보이지 않습니다</span>
      </div>
      <textarea
        value={memo}
        onChange={(e) => { setMemo(e.target.value); setSaved(false); setError(""); }}
        rows={4}
        maxLength={5000}
        placeholder="상담 내용, 특이사항, 다음 상담 시 참고할 내용을 기록하세요."
        className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-gray-400">
          {error ? <span className="text-red-500">{error}</span> : saved ? "저장되었습니다." : `${memo.length}/5000`}
        </span>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="px-4 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium disabled:opacity-40 flex items-center gap-1.5"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          메모 저장
        </button>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-400 w-16 text-xs">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}

