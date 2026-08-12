"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar, Clock, User, Phone, BookOpen } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface ReservationDetail {
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
  seller: { shopName: string; slug: string };
  items: { productName: string }[];
  timeSlot: { endTime: string } | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "예약 대기", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  CONFIRMED: { label: "예약 확정", color: "bg-blue-50 text-blue-700 border-blue-200" },
  COMPLETED: { label: "상담 완료", color: "bg-green-50 text-green-700 border-green-200" },
  CANCELLED: { label: "취소됨", color: "bg-gray-50 text-gray-500 border-gray-200" },
  NO_SHOW: { label: "노쇼", color: "bg-red-50 text-red-600 border-red-200" },
};

export default function MyReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || "";

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/reservations/${id}`)
      .then(r => r.json())
      .then(data => {
        setReservation(data.reservation || null);
        setLoading(false);
      });
  }, [id]);

  const handleCancel = async () => {
    if (!confirm("예약을 취소하시겠습니까?")) return;
    setCancelling(true);
    const res = await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    setCancelling(false);
    if (res.ok) {
      setReservation(prev => prev ? { ...prev, status: "CANCELLED" } : null);
    } else {
      const data = await res.json();
      alert(data.error || "취소에 실패했습니다.");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">로딩 중...</div>
  );
  if (!reservation) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">예약을 찾을 수 없습니다.</div>
  );

  const s = STATUS_MAP[reservation.status] || { label: reservation.status, color: "bg-gray-100 text-gray-500 border-gray-200" };
  const date = new Date(reservation.reservationDate);
  const dateStr = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/my/reservations" className="text-gray-500">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-base font-bold text-gray-900">예약 상세</h1>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {/* 상태 배지 */}
        <div className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm font-medium ${s.color}`}>
          {s.label}
        </div>

        {/* 상담사 정보 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">상담사</p>
          <p className="font-semibold text-gray-900">{reservation.seller.shopName}</p>
          <Link
            href={`/shop/${reservation.seller.slug}`}
            className="text-xs text-indigo-500 mt-1 inline-block"
          >
            점집 홈 보기 →
          </Link>
        </div>

        {/* 예약 정보 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide">예약 정보</p>
          {reservation.items.map((item, i) => (
            <div key={i} className="text-sm font-medium text-gray-800">{item.productName}</div>
          ))}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={15} className="text-gray-400" />
            {dateStr}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={15} className="text-gray-400" />
            {reservation.reservationTime}
            {reservation.timeSlot?.endTime && ` ~ ${reservation.timeSlot.endTime}`}
          </div>
        </div>

        {/* 신청자 정보 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">신청자 정보</p>
          <InfoRow icon={<User size={14} />} label="이름" value={reservation.customerName} />
          <InfoRow icon={<Phone size={14} />} label="연락처" value={reservation.customerPhone} />
          {reservation.birthDate && (
            <InfoRow icon={<Calendar size={14} />} label="생년월일" value={reservation.birthDate} />
          )}
          {reservation.birthTime && (
            <InfoRow icon={<Clock size={14} />} label="태어난 시각" value={reservation.birthTime} />
          )}
          {reservation.gender && (
            <InfoRow icon={<User size={14} />} label="성별" value={reservation.gender === "M" ? "남성" : "여성"} />
          )}
          {reservation.consultingContent && (
            <div className="pt-2 border-t border-gray-50">
              <div className="flex items-start gap-2">
                <BookOpen size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-400 block">상담 내용</span>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{reservation.consultingContent}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 결제 정보 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">결제 금액</span>
            <span className="font-bold text-gray-900">{formatPrice(reservation.finalAmount)}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">예약번호: {reservation.reservationNumber}</p>
        </div>

        {/* 취소 버튼 (PENDING 상태만) */}
        {reservation.status === "PENDING" && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-3 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50"
          >
            {cancelling ? "취소 중..." : "예약 취소"}
          </button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500 w-16">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}
