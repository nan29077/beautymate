"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Cake,
  Clock,
  NotebookPen,
  Loader2,
  MessageSquareText,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export interface CustomerDetail {
  customerId: string;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  birthTime: string | null;
  gender: string | null;
  totalReservations: number;
  completedCount: number;
  totalPaid: number;
  firstReservationDate: string;
  lastReservationDate: string;
}

export interface ConsultingHistoryItem {
  id: string;
  reservationNumber: string;
  status: string;
  paymentStatus: string;
  reservationDate: string;
  reservationTime: string;
  endTime: string | null;
  productNames: string[];
  finalAmount: number;
  consultingContent: string | null;
  consultantMemo: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  PENDING: { label: "예약 대기", color: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-400" },
  CONFIRMED: { label: "예약 확정", color: "bg-blue-50 text-blue-700", dot: "bg-blue-400" },
  COMPLETED: { label: "서비스 완료", color: "bg-green-50 text-green-700", dot: "bg-green-400" },
  CANCELLED: { label: "취소됨", color: "bg-gray-100 text-gray-500", dot: "bg-gray-300" },
  NO_SHOW: { label: "노쇼", color: "bg-red-50 text-red-600", dot: "bg-red-400" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${weekday})`;
}

export default function SellerCustomerDetailClient({
  customer,
  history,
}: {
  customer: CustomerDetail;
  history: ConsultingHistoryItem[];
}) {
  return (
    <div className="animate-fade-in space-y-5 max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Link href="/seller/customers" className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">고객 상세 · 상담 이력</p>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">기본 정보</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6">
          <InfoRow icon={<User size={14} />} label="이름" value={customer.name} />
          <InfoRow icon={<Phone size={14} />} label="연락처" value={customer.phone} />
          <InfoRow icon={<Cake size={14} />} label="생년월일" value={customer.birthDate || "-"} />
          <InfoRow
            icon={<User size={14} />}
            label="성별"
            value={customer.gender === "M" ? "남성" : customer.gender === "F" ? "여성" : "-"}
          />
          <InfoRow icon={<Mail size={14} />} label="이메일" value={customer.email || "-"} />
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {([
          { label: "총 상담 횟수", value: `${customer.completedCount}회`, sub: `예약 ${customer.totalReservations}건` },
          { label: "총 결제금액", value: formatPrice(customer.totalPaid), accent: true },
          { label: "첫 상담일", value: formatDate(customer.firstReservationDate).slice(0, 10) },
          { label: "마지막 상담일", value: formatDate(customer.lastReservationDate).slice(0, 10) },
        ] as { label: string; value: string; sub?: string; accent?: boolean }[]).map((s) => (
          <div
            key={s.label}
            className={`rounded-xl p-3 sm:p-4 ${s.accent ? "bg-amber-400 text-black" : "bg-white border border-gray-100"}`}
          >
            <p className={`text-[10px] font-medium mb-1 ${s.accent ? "text-black/60" : "text-gray-400"}`}>{s.label}</p>
            <p className={`text-[13px] sm:text-base font-bold break-all ${s.accent ? "text-black" : "text-gray-900"}`}>
              {s.value}
            </p>
            {s.sub && <p className="text-[10px] text-gray-300 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* 상담 이력 타임라인 */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 mb-3">상담 이력 ({history.length}건)</h2>
        <div className="relative pl-5">
          {/* 타임라인 세로선 */}
          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-200" />
          <div className="space-y-3">
            {history.map((h) => (
              <HistoryCard key={h.id} item={h} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ item }: { item: ConsultingHistoryItem }) {
  const s = STATUS_MAP[item.status] || { label: item.status, color: "bg-gray-100 text-gray-500", dot: "bg-gray-300" };

  return (
    <div className="relative">
      {/* 타임라인 점 */}
      <span className={`absolute -left-5 top-4 w-[11px] h-[11px] rounded-full border-2 border-white ${s.dot}`} />
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{formatDate(item.reservationDate)}</span>
              <span className="text-xs text-gray-500">
                {item.reservationTime}
                {item.endTime ? ` ~ ${item.endTime}` : ""}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">
              {item.productNames.length > 0 ? item.productNames.join(", ") : "뷰티 서비스 정보 없음"}
            </p>
            <p className="text-[10px] text-gray-300 mt-0.5">예약번호 {item.reservationNumber}</p>
          </div>
          <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatPrice(item.finalAmount)}</p>
        </div>

        {item.consultingContent && (
          <div className="mt-3 flex items-start gap-2 bg-gray-50 rounded-lg p-2.5">
            <MessageSquareText size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 mb-0.5">고객 문의 내용</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">{item.consultingContent}</p>
            </div>
          </div>
        )}

        {item.status === "COMPLETED" ? (
          <MemoBox reservationId={item.id} initialMemo={item.consultantMemo} />
        ) : item.consultantMemo ? (
          <div className="mt-3 flex items-start gap-2 bg-amber-50/60 rounded-lg p-2.5">
            <NotebookPen size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">{item.consultantMemo}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** 서비스 완료 건의 메모 조회·수정. 접혀 있다가 클릭 시 편집 모드로 전환된다. */
function MemoBox({ reservationId, initialMemo }: { reservationId: string; initialMemo: string | null }) {
  const [savedMemo, setSavedMemo] = useState(initialMemo ?? "");
  const [memo, setMemo] = useState(initialMemo ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/reservations/${reservationId}/memo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "메모 저장에 실패했습니다.");
        return;
      }
      setSavedMemo(data.memo ?? "");
      setMemo(data.memo ?? "");
      setEditing(false);
    } catch {
      setError("메모 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-3 w-full text-left flex items-start gap-2 bg-amber-50/60 hover:bg-amber-50 rounded-lg p-2.5 transition-colors"
      >
        <NotebookPen size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] text-amber-600 mb-0.5">고객 메모 {savedMemo ? "(클릭해 수정)" : ""}</p>
          <p className={`text-xs whitespace-pre-wrap break-words ${savedMemo ? "text-gray-700" : "text-gray-400"}`}>
            {savedMemo || "메모를 남기려면 클릭하세요."}
          </p>
        </div>
      </button>
    );
  }

  return (
    <div className="mt-3">
      <textarea
        value={memo}
        onChange={(e) => { setMemo(e.target.value); setError(""); }}
        rows={4}
        maxLength={5000}
        autoFocus
        placeholder="요청사항, 특이사항, 다음 상담 시 참고할 내용을 기록하세요."
        className="w-full rounded-lg border border-gray-200 p-2.5 text-xs text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 resize-none"
      />
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] text-gray-400">
          {error ? <span className="text-red-500">{error}</span> : `${memo.length}/5000`}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => { setMemo(savedMemo); setEditing(false); setError(""); }}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium disabled:opacity-40 flex items-center gap-1.5"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-400 w-20 text-xs flex-shrink-0">{label}</span>
      <span className="text-gray-800 truncate">{value}</span>
    </div>
  );
}
