"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WidgetData } from "@/lib/widget";

// ─────────────────────────────────────────────
// 프리즘/OBS 브라우저 소스용 예약 현황 위젯 (세로 카드).
// 30초마다 남은 자리를 다시 읽고, 숫자가 줄어들면 펄스 효과를 준다.
// ─────────────────────────────────────────────

const REFRESH_MS = 30_000;
const PULSE_MS = 2_000;

export default function LiveWidgetClient({
  initial,
  widgetKey,
}: {
  initial: WidgetData;
  widgetKey: string;
}) {
  const [data, setData] = useState<WidgetData>(initial);
  const [pulsing, setPulsing] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const remainingRef = useRef(initial.remainingSlots);

  const bookingPath = data.bookingUrl;

  // ── QR 코드 생성 (예약 URL 기준) ────────────────
  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(`${window.location.origin}${bookingPath}`, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 240,
          color: { dark: "#1a0b33", light: "#ffffff" },
        })
      )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        /* QR 생성 실패 시 나머지 위젯은 그대로 표시 */
      });
    return () => {
      cancelled = true;
    };
  }, [bookingPath]);

  // ── 30초 폴링 ────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/widget/${encodeURIComponent(widgetKey)}?date=${encodeURIComponent(initial.date)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const next: WidgetData = await res.json();
      // 자리가 줄었을 때만 펄스 (늘어난 경우는 상담사가 슬롯을 추가한 것)
      if (!next.slotsUnknown && next.remainingSlots < remainingRef.current) {
        setPulsing(true);
        window.setTimeout(() => setPulsing(false), PULSE_MS);
      }
      remainingRef.current = next.remainingSlots;
      setData(next);
    } catch {
      /* 방송 중 네트워크 순단은 무시하고 다음 주기에 재시도 */
    }
  }, [widgetKey, initial.date]);

  useEffect(() => {
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const soldOut = data.remainingSlots <= 0;

  return (
    <div className="sm-widget-root">
      <div className={`sm-widget-card ${pulsing ? "sm-pulse" : ""}`}>
        {/* 별빛 레이어 */}
        <span className="sm-star" style={{ top: "12%", left: "14%", animationDelay: "0s" }} />
        <span className="sm-star" style={{ top: "26%", left: "82%", animationDelay: "0.8s" }} />
        <span className="sm-star" style={{ top: "62%", left: "8%", animationDelay: "1.6s" }} />
        <span className="sm-star" style={{ top: "84%", left: "76%", animationDelay: "2.4s" }} />

        {/* 브랜딩 */}
        <div className="sm-brand">
          <span className="sm-brand-mark">✦</span>
          <span className="sm-brand-text">사주나라</span>
        </div>

        {/* 상담사명 */}
        <p className="sm-consultant">{data.consultantName}</p>

        {/* LIVE 라벨 */}
        <div className="sm-live">
          <span className="sm-live-dot" />
          LIVE 상담 예약
        </div>

        {/* 남은 자리 */}
        <div className="sm-remain-wrap">
          <p className="sm-remain-label">오늘 남은 자리</p>
          {data.slotsUnknown ? (
            // 슬롯 조회 실패 — 틀린 숫자를 띄우느니 안내 문구로 대체한다.
            <p className="sm-unknown">QR로 확인</p>
          ) : soldOut ? (
            <p className="sm-soldout">오늘 마감</p>
          ) : (
            <p className={`sm-remain ${pulsing ? "sm-remain-hit" : ""}`}>
              <span className="sm-remain-num">{data.remainingSlots}</span>
              <span className="sm-remain-unit">자리</span>
            </p>
          )}
        </div>

        {/* QR */}
        <div className="sm-qr-box">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="예약 QR 코드" className="sm-qr" />
          ) : (
            <div className="sm-qr sm-qr-skeleton" />
          )}
        </div>

        {/* CTA */}
        <p className="sm-cta">지금 예약하기</p>
      </div>

      <style>{`
        .sm-widget-root {
          width: 300px;
          padding: 8px;
          font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo",
            "Malgun Gothic", sans-serif;
        }
        .sm-widget-card {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px 14px 14px;
          border-radius: 18px;
          background: rgba(13, 7, 32, 0.85);
          border: 1px solid rgba(167, 139, 250, 0.55);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 0 24px rgba(139, 92, 246, 0.25) inset;
          color: #ffffff;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .sm-widget-card.sm-pulse {
          animation: sm-card-pulse 0.7s ease-in-out 3;
        }
        @keyframes sm-card-pulse {
          0%, 100% { box-shadow: 0 10px 30px rgba(0,0,0,0.45), 0 0 0 0 rgba(167,139,250,0); border-color: rgba(167,139,250,0.55); }
          50% { box-shadow: 0 10px 30px rgba(0,0,0,0.45), 0 0 0 8px rgba(167,139,250,0.28); border-color: rgba(216,180,254,0.95); }
        }

        .sm-star {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #e9d5ff;
          box-shadow: 0 0 6px 2px rgba(216, 180, 254, 0.7);
          animation: sm-twinkle 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes sm-twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.7); }
          50% { opacity: 0.95; transform: scale(1.15); }
        }

        .sm-brand { display: flex; align-items: center; gap: 4px; }
        .sm-brand-mark { color: #fbbf24; font-size: 10px; line-height: 1; }
        .sm-brand-text {
          font-size: 10px;
          letter-spacing: 0.14em;
          font-weight: 600;
          color: rgba(233, 213, 255, 0.85);
        }

        .sm-consultant {
          margin: 2px 0 0;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.01em;
          text-align: center;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        .sm-live {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(239, 68, 68, 0.18);
          border: 1px solid rgba(248, 113, 113, 0.5);
          font-size: 11px;
          font-weight: 700;
          color: #fecaca;
        }
        .sm-live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.8);
          animation: sm-blink 1.2s ease-in-out infinite;
        }
        @keyframes sm-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }

        .sm-remain-wrap { text-align: center; margin-top: 2px; }
        .sm-remain-label {
          margin: 0;
          font-size: 11px;
          color: rgba(221, 214, 254, 0.75);
          letter-spacing: 0.02em;
        }
        .sm-remain {
          margin: 0;
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 3px;
          line-height: 1;
        }
        .sm-remain-num {
          font-size: 46px;
          font-weight: 900;
          letter-spacing: -0.03em;
          background: linear-gradient(180deg, #ffffff 0%, #c4b5fd 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 12px rgba(167, 139, 250, 0.55));
        }
        .sm-remain-unit { font-size: 15px; font-weight: 700; color: #ddd6fe; }
        .sm-remain-hit .sm-remain-num { animation: sm-num-pop 0.5s ease-out 3; }
        @keyframes sm-num-pop {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px rgba(167,139,250,0.55)); }
          40% { transform: scale(1.22); filter: drop-shadow(0 0 22px rgba(216,180,254,0.95)); }
        }
        .sm-soldout {
          margin: 4px 0 0;
          font-size: 26px;
          font-weight: 900;
          color: #fca5a5;
          letter-spacing: -0.02em;
        }
        .sm-unknown {
          margin: 6px 0 0;
          font-size: 22px;
          font-weight: 900;
          color: #ddd6fe;
          letter-spacing: -0.02em;
        }

        .sm-qr-box {
          margin-top: 4px;
          padding: 5px;
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.5), 0 4px 12px rgba(0, 0, 0, 0.35);
          line-height: 0;
        }
        .sm-qr { width: 74px; height: 74px; display: block; }
        .sm-qr-skeleton { background: #ede9fe; border-radius: 4px; }

        .sm-cta {
          margin: 4px 0 0;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #fde68a;
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        }
      `}</style>
    </div>
  );
}
