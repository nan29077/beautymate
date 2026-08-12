"use client";

// Mock PG 결제창 UI — 성공/실패 버튼으로 서명된 웹훅을 발사한다
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, CheckCircle2, XCircle, FlaskConical } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface SignedPayload {
  reservationId: string;
  result: "success" | "fail";
  timestamp: number;
  signature: string;
}

export default function MockPayClient({
  reservation,
  successPayload,
  failPayload,
}: {
  reservation: {
    id: string;
    reservationNumber: string;
    alreadyPaid: boolean;
    amount: number;
    customerName: string;
    shopName: string;
    productName: string;
  };
  successPayload: SignedPayload;
  failPayload: SignedPayload;
}) {
  const router = useRouter();
  const [processing, setProcessing] = useState<"success" | "fail" | null>(null);
  const [error, setError] = useState("");

  const fire = async (payload: SignedPayload) => {
    setProcessing(payload.result);
    setError("");
    try {
      const res = await fetch("/api/payments/mock/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "웹훅 처리에 실패했습니다.");
        return;
      }
      if (payload.result === "success") {
        router.push(`/checkout/complete?orderId=${reservation.id}`);
      } else {
        router.push(
          `/checkout/complete?orderId=${reservation.id}&status=fail&msg=${encodeURIComponent("테스트 결제 실패")}`,
        );
      }
    } catch {
      setError("웹훅 호출 중 오류가 발생했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gray-900 text-white px-5 py-4 flex items-center gap-2">
          <FlaskConical size={18} className="text-amber-400" />
          <div>
            <p className="text-sm font-bold">Mock PG 테스트 결제창</p>
            <p className="text-[10px] text-gray-400">
              개발 환경 전용 · 실제 결제가 발생하지 않습니다
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2 text-sm">
            <Row label="가맹점" value={reservation.shopName} />
            <Row label="상품" value={reservation.productName} />
            <Row label="주문자" value={reservation.customerName} />
            <Row label="주문번호" value={reservation.reservationNumber} />
            <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1.5">
                <CreditCard size={14} /> 결제 금액
              </span>
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(reservation.amount)}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {reservation.alreadyPaid ? (
            <div className="text-center text-sm text-green-600 bg-green-50 rounded-xl py-3">
              이미 결제 완료된 예약입니다.
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => fire(successPayload)}
                disabled={processing !== null}
                className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-500 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={16} />
                {processing === "success" ? "처리 중..." : "결제 성공 시뮬레이션"}
              </button>
              <button
                onClick={() => fire(failPayload)}
                disabled={processing !== null}
                className="w-full py-3 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <XCircle size={16} />
                {processing === "fail" ? "처리 중..." : "결제 실패 시뮬레이션"}
              </button>
            </div>
          )}

          <p className="text-[10px] text-gray-400 leading-relaxed">
            버튼을 누르면 HMAC 서명된 웹훅이 /api/payments/mock/webhook 으로 전송되어
            실제 PG 서버통지와 동일한 확정 처리(예약 CONFIRMED·영상 세션 생성·알림)가
            실행됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
