"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  MonitorPlay,
  QrCode,
  Radio,
  Link2,
  Bell,
} from "lucide-react";

// ─────────────────────────────────────────────
// 상담사 방송 도구 화면.
// 위젯 URL / 예약 URL 복사, 예약 QR 다운로드, 실제 위젯 미리보기, 프리즘·OBS 설정 가이드.
// ─────────────────────────────────────────────

const QR_PX = 320; // 다운로드용 QR 해상도

function UrlRow({
  icon,
  label,
  hint,
  url,
  openable = true,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  url: string;
  openable?: boolean;
  description?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard API 차단 환경(비 HTTPS 등) 폴백
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#2d1b69]/5 text-[#2d1b69] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-gray-900">{label}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{hint}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-[11px] text-gray-600 font-mono truncate">
          {url}
        </code>
        <button
          type="button"
          onClick={copy}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-semibold border transition-colors flex-shrink-0 ${
            copied
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : "bg-[#2d1b69] text-white border-[#2d1b69] hover:bg-[#3d2589]"
          }`}
        >
          {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.8} />}
          {copied ? "복사됨" : "복사"}
        </button>
        {openable && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"
            aria-label={`${label} 새 창으로 열기`}
          >
            <ExternalLink size={13} strokeWidth={1.6} />
          </a>
        )}
      </div>

      {description && (
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

export default function SellerWidgetClient({
  consultantId,
  slug,
  shopName,
  baseUrl,
}: {
  consultantId: string;
  slug: string;
  shopName: string;
  baseUrl: string;
}) {
  // 서버가 준 기본 도메인으로 먼저 그리고, 마운트 후 실제 접속 origin 으로 보정한다.
  const [origin, setOrigin] = useState(baseUrl.replace(/\/$/, ""));
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const widgetUrl = `${origin}/widget/${consultantId}`;
  const alertUrl = `${origin}/widget/${consultantId}/alert`;
  const bookingUrl = `${origin}/c/${slug}`;

  // ── 예약 URL QR 생성 ────────────────────────
  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(bookingUrl, {
          errorCorrectionLevel: "H",
          margin: 2,
          width: QR_PX,
          color: { dark: "#2d1b69", light: "#ffffff" },
        })
      )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        /* QR 생성 실패 시 나머지 화면은 그대로 사용 */
      });
    return () => {
      cancelled = true;
    };
  }, [bookingUrl]);

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `사주나라-예약QR-${slug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const reloadPreview = () => {
    const frame = previewRef.current;
    if (frame) frame.src = `${widgetUrl}?t=${Date.now()}`;
  };

  return (
    <div className="max-w-4xl">
      {/* ───── 헤더 ───── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MonitorPlay size={20} strokeWidth={1.6} className="text-[#2d1b69]" />
          방송 도구
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          프리즘 라이브 스튜디오·OBS 방송 화면에 <strong>{shopName}</strong> 님의 예약 현황을
          띄우고, 시청자에게 예약 링크를 안내하세요.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ───── 왼쪽: URL & QR ───── */}
        <div className="space-y-4">
          <UrlRow
            icon={<Radio size={16} strokeWidth={1.6} />}
            label="라이브 위젯 URL"
            hint="방송 화면에 띄울 예약 현황 위젯입니다. 브라우저 소스에 붙여넣으세요."
            url={widgetUrl}
            description='OBS 또는 프리즘 라이브 스튜디오에서 "브라우저 소스"를 추가할 때 이 주소를 입력하세요. 방송 화면에 오늘의 예약 현황이 실시간으로 표시됩니다.'
          />

          <UrlRow
            icon={<Bell size={16} strokeWidth={1.6} />}
            label="예약 알림 오버레이"
            hint="새 예약이 접수될 때만 5초간 배너가 뜹니다. 별도 브라우저 소스로 추가하세요. (선택)"
            url={alertUrl}
            description="새 예약이 들어올 때 방송 화면에 5초 동안 알림 배너가 자동으로 표시됩니다. OBS/프리즘에서 별도 브라우저 소스로 추가하면 됩니다."
          />

          <UrlRow
            icon={<Link2 size={16} strokeWidth={1.6} />}
            label="예약 페이지 URL"
            hint="유튜브 설명란·고정 댓글·인스타 프로필에 넣는 짧은 예약 주소입니다."
            url={bookingUrl}
            description="유튜브 영상 설명란, 인스타그램 프로필 링크 등에 사용할 수 있는 짧은 주소입니다. 이 링크를 통해 시청자가 바로 예약할 수 있습니다."
          />

          {/* QR */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2d1b69]/5 text-[#2d1b69] flex items-center justify-center flex-shrink-0">
                <QrCode size={16} strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900">예약 QR 코드</p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                  예약 페이지 URL로 연결됩니다. 방송 화면·명함·포스터에 사용하세요.
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row items-center gap-4">
              <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-sm w-full max-w-[200px] mx-auto sm:mx-0 sm:w-auto">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="예약 QR 코드"
                    className="w-full h-auto block sm:w-[132px] sm:h-[132px]"
                  />
                ) : (
                  <div className="w-full aspect-square rounded bg-gray-50 animate-pulse sm:w-[132px] sm:h-[132px]" />
                )}
              </div>
              <button
                type="button"
                onClick={downloadQr}
                disabled={!qrDataUrl}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Download size={13} strokeWidth={1.6} />
                QR 다운로드
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              QR 코드를 방송 화면에 띄우거나 인쇄물에 활용하세요. 시청자가 스마트폰으로 스캔하면 바로 예약 페이지로 이동합니다.
            </p>
          </div>
        </div>

        {/* ───── 오른쪽: 미리보기 & 가이드 ───── */}
        <div className="space-y-4">
          {/* 미리보기 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-gray-900">위젯 미리보기</p>
              <button
                type="button"
                onClick={reloadPreview}
                className="text-[11px] font-semibold text-[#2d1b69] hover:underline"
              >
                새로고침
              </button>
            </div>

            {/* 방송 화면 위에 얹힌 느낌을 주려고 어두운 체커보드 배경을 깐다 */}
            <div
              className="rounded-xl overflow-hidden p-3"
              style={{
                background:
                  "repeating-conic-gradient(#2a2a2a 0% 25%, #3a3a3a 0% 50%) 50% / 20px 20px",
              }}
            >
              <div
                className="w-full max-w-[300px] mx-auto overflow-hidden rounded-lg"
                style={{ aspectRatio: "3/4" }}
              >
                <iframe
                  ref={previewRef}
                  src={widgetUrl}
                  title="라이브 위젯 미리보기"
                  className="border-0 bg-transparent w-full h-full"
                  style={{ colorScheme: "normal" }}
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              실제 방송에서는 배경이 완전히 투명하게 표시됩니다. 남은 자리는 30초마다 자동
              갱신됩니다.
            </p>
          </div>

          {/* 설정 가이드 */}
          <div className="bg-[#2d1b69]/[0.03] rounded-2xl border border-[#2d1b69]/10 p-4">
            <p className="text-[13px] font-bold text-gray-900 mb-3">프리즘 / OBS 설정 방법</p>
            <ol className="space-y-2.5">
              {[
                "프리즘 라이브 스튜디오(또는 OBS)에서 소스 추가 → 브라우저(Browser Source) 선택",
                '위의 “라이브 위젯 URL”을 복사해 URL 칸에 붙여넣기',
                "너비 300, 높이 400 으로 설정",
                "방송 화면 우하단(또는 좌하단)으로 위치 조정",
                '예약 알림 배너를 쓰려면 “예약 알림 오버레이 URL”을 브라우저 소스로 하나 더 추가해 상단 중앙에 배치',
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5 text-[12px] text-gray-600 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-[#2d1b69] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-px">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-3 pt-3 border-t border-[#2d1b69]/10">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                <strong className="text-gray-700">TIP</strong> — 특정 날짜의 예약 현황을 띄우려면
                위젯 URL 뒤에 <code className="font-mono">?date=2026-08-15</code> 처럼 날짜를 붙이세요.
                생략하면 오늘 기준으로 표시됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
