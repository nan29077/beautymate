"use client";

import { useEffect, useState } from "react";

interface Props {
  /** 예약 날짜+시간을 결합한 ISO 문자열 (서버에서 계산) */
  reservationIso: string;
  /** 날짜 레이블 "YYYY-MM-DD" */
  reservationDateLabel: string;
  /** 시간 문자열 "HH:MM" */
  reservationTimeStr: string;
}

export default function ReservationCountdown({
  reservationIso,
  reservationDateLabel,
  reservationTimeStr,
}: Props) {
  const [timeLeft, setTimeLeft] = useState("");
  const [label, setLabel] = useState("내 상담까지");

  useEffect(() => {
    const reservationTime = new Date(reservationIso);

    const tick = () => {
      const now = new Date();
      const diff = reservationTime.getTime() - now.getTime();
      if (diff <= 0) {
        setLabel("상담 시간입니다!");
        setTimeLeft("00:00:00");
        return;
      }
      if (diff <= 30 * 60 * 1000) setLabel("곧 시작합니다!");
      const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
      setTimeLeft(`${h}:${m}:${s}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [reservationIso]);

  const dateDisplay = reservationDateLabel.slice(5).replace("-", "/");

  return (
    <div className="text-center py-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-violet-700 tabular-nums">{timeLeft}</p>
      <p className="mt-2 text-[12px] text-gray-400">
        {dateDisplay} {reservationTimeStr} 상담 예정
      </p>
    </div>
  );
}
