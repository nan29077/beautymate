"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WidgetData } from "@/lib/widget";

// ─────────────────────────────────────────────
// 새 예약 알림 오버레이 (별도 브라우저 소스).
// 10초마다 예약 건수를 폴링해 늘어났으면 5초간 배너를 띄운다.
// ─────────────────────────────────────────────

const POLL_MS = 10_000;
const SHOW_MS = 5_000;

export default function WidgetAlertClient({
  initial,
  widgetKey,
}: {
  initial: WidgetData;
  widgetKey: string;
}) {
  const [visible, setVisible] = useState(false);
  const [remaining, setRemaining] = useState(initial.remainingSlots);
  const bookedRef = useRef(initial.bookedSlots);
  const hideTimerRef = useRef<number | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/widget/${encodeURIComponent(widgetKey)}?date=${encodeURIComponent(initial.date)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const next: WidgetData = await res.json();

      // 슬롯 조회에 실패한 응답은 건수 비교 자체가 무의미하므로 건너뛴다.
      if (next.slotsUnknown) return;

      if (next.bookedSlots > bookedRef.current) {
        setRemaining(next.remainingSlots);
        setVisible(true);
        if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = window.setTimeout(() => setVisible(false), SHOW_MS);
      }
      bookedRef.current = next.bookedSlots;
    } catch {
      /* 방송 중 네트워크 순단은 무시하고 다음 주기에 재시도 */
    }
  }, [widgetKey, initial.date]);

  useEffect(() => {
    const timer = window.setInterval(poll, POLL_MS);
    return () => {
      window.clearInterval(timer);
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    };
  }, [poll]);

  return (
    <div className="sma-root">
      <div className={`sma-banner ${visible ? "sma-in" : "sma-out"}`} aria-live="polite">
        <span className="sma-icon">🔮</span>
        <div className="sma-texts">
          <p className="sma-title">새로운 상담 예약이 접수되었습니다</p>
          <p className="sma-sub">
            오늘 남은 상담 <strong>{remaining}</strong>자리
          </p>
        </div>
      </div>

      <style>{`
        .sma-root {
          width: 100%;
          display: flex;
          justify-content: center;
          padding-top: 12px;
          font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo",
            "Malgun Gothic", sans-serif;
          pointer-events: none;
        }
        .sma-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          border-radius: 16px;
          background: rgba(13, 7, 32, 0.85);
          border: 1px solid rgba(167, 139, 250, 0.6);
          box-shadow: 0 10px 34px rgba(0, 0, 0, 0.5), 0 0 26px rgba(139, 92, 246, 0.3);
          color: #ffffff;
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .sma-out { opacity: 0; transform: translateY(-16px); }
        .sma-in { opacity: 1; transform: translateY(0); animation: sma-glow 1.6s ease-in-out infinite; }
        @keyframes sma-glow {
          0%, 100% { box-shadow: 0 10px 34px rgba(0,0,0,0.5), 0 0 20px rgba(139,92,246,0.25); }
          50% { box-shadow: 0 10px 34px rgba(0,0,0,0.5), 0 0 34px rgba(216,180,254,0.6); }
        }
        .sma-icon { font-size: 26px; line-height: 1; filter: drop-shadow(0 0 8px rgba(216,180,254,0.7)); }
        .sma-texts { display: flex; flex-direction: column; gap: 2px; }
        .sma-title {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }
        .sma-sub {
          margin: 0;
          font-size: 12px;
          color: rgba(221, 214, 254, 0.85);
          white-space: nowrap;
        }
        .sma-sub strong {
          color: #fde68a;
          font-size: 14px;
          font-weight: 900;
        }
      `}</style>
    </div>
  );
}
