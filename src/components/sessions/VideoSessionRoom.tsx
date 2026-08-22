"use client";

// 1:1 영상 상담실 공용 컴포넌트 (뷰티 전문가 host / 고객 guest 공용)
// Daily.co iframe 임베드 + 상담 타이머 + (host) 고객 메모·종료 컨트롤
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Video,
  VideoOff,
  Clock,
  User,
  Calendar,
  StickyNote,
  PhoneOff,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import type { DailyCall } from "@daily-co/daily-js";

interface SessionData {
  id: string;
  status: "WAITING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  roomUrl: string;
  roomName: string;
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;
  token: string;
  isDemo: boolean;
  viewerRole: "host" | "guest" | "admin";
  durationMinutes: number;
  reservation: {
    id: string;
    reservationNumber: string;
    status: string;
    reservationDate: string;
    reservationTime: string;
    customerName: string;
    customerPhone?: string;
    birthDate?: string | null;
    birthTime?: string | null;
    gender?: string | null;
    consultingContent?: string | null;
    consultantMemo?: string | null;
    productName: string | null;
    shopName: string;
    shopSlug: string;
    consultantName: string | null;
    consultantAvatar: string | null;
  };
}

const STATUS_LABEL: Record<SessionData["status"], string> = {
  WAITING: "입장 대기",
  ACTIVE: "상담 진행 중",
  COMPLETED: "서비스 완료",
  CANCELLED: "취소됨",
};

export default function VideoSessionRoom({
  sessionId,
  backHref,
  backLabel,
}: {
  sessionId: string;
  backHref: string;
  backLabel: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [memo, setMemo] = useState("");
  const [memoLoaded, setMemoLoaded] = useState(false);
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const frameContainerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);

  // 세션 정보 로드
  useEffect(() => {
    let alive = true;
    fetch(`/api/sessions/${sessionId}`)
      .then(async (res) => {
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) {
          setError(body.error || "세션 정보를 불러오지 못했습니다.");
          return;
        }
        setData(body.session);
        if (!memoLoaded) {
          setMemo(body.session.reservation.consultantMemo || "");
          setMemoLoaded(true);
        }
      })
      .catch(() => alive && setError("세션 정보를 불러오지 못했습니다."));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // 타이머 tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const markStarted = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/start`, { method: "POST" });
      if (res.ok) {
        const body = await res.json();
        setData((d) =>
          d ? { ...d, status: body.session.status, startedAt: body.session.startedAt } : d,
        );
      }
    } catch {
      // 시작 마킹 실패는 통화 자체를 막지 않는다
    }
  }, [sessionId]);

  // Daily iframe 부착 (데모 모드/종료 상태 제외)
  useEffect(() => {
    if (!data || data.isDemo) return;
    if (data.status === "COMPLETED" || data.status === "CANCELLED") return;
    if (!frameContainerRef.current || callRef.current) return;

    let cancelled = false;
    (async () => {
      const DailyIframe = (await import("@daily-co/daily-js")).default;
      if (cancelled || !frameContainerRef.current || callRef.current) return;
      const frame = DailyIframe.createFrame(frameContainerRef.current, {
        showLeaveButton: true,
        showFullscreenButton: true,
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "12px",
        },
      });
      callRef.current = frame;
      frame.on("joined-meeting", () => {
        setJoined(true);
        void markStarted();
      });
      frame.on("left-meeting", () => setJoined(false));
      frame
        .join({ url: data.roomUrl, token: data.token })
        .catch(() => setError("상담실 입장에 실패했습니다. 새로고침 후 다시 시도해 주세요."));
    })();

    return () => {
      cancelled = true;
      if (callRef.current) {
        callRef.current.destroy().catch(() => {});
        callRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id, data?.isDemo, data?.status]);

  const handleEnd = async () => {
    if (!data) return;
    setEnding(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo }),
      });
      const body = await res.json();
      if (!res.ok) {
        alert(body.error || "상담 종료에 실패했습니다.");
        return;
      }
      if (callRef.current) {
        await callRef.current.leave().catch(() => {});
      }
      setData((d) =>
        d
          ? {
              ...d,
              status: "COMPLETED",
              endedAt: body.session.endedAt,
              duration: body.session.duration,
            }
          : d,
      );
      setConfirmEnd(false);
      router.refresh();
    } finally {
      setEnding(false);
    }
  };

  // 데모 모드에서 상담 시작 (iframe 없이 상태만 ACTIVE 로)
  const handleDemoStart = () => void markStarted();

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <AlertTriangle size={40} className="text-amber-400 mb-3" />
        <p className="text-sm text-gray-600 mb-4">{error}</p>
        <Link
          href={backHref}
          className="text-sm text-indigo-600 font-medium hover:underline"
        >
          {backLabel}
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-400">
        상담실 정보를 불러오는 중...
      </div>
    );
  }

  const isHost = data.viewerRole === "host" || data.viewerRole === "admin";
  const ended = data.status === "COMPLETED" || data.status === "CANCELLED";

  // 남은 시간 계산: 시작 후엔 (시작+상담분-현재), 시작 전엔 예약 시각까지
  let timerLabel = "";
  let timerDanger = false;
  if (ended) {
    timerLabel = data.duration != null ? `실제 상담 ${data.duration}분` : "종료됨";
  } else if (data.startedAt) {
    const endAt = new Date(data.startedAt).getTime() + data.durationMinutes * 60000;
    const remainMs = endAt - now;
    const abs = Math.abs(remainMs);
    const mm = Math.floor(abs / 60000);
    const ss = Math.floor((abs % 60000) / 1000);
    timerLabel =
      remainMs >= 0
        ? `남은 시간 ${mm}:${String(ss).padStart(2, "0")}`
        : `초과 ${mm}:${String(ss).padStart(2, "0")}`;
    timerDanger = remainMs < 5 * 60000;
  } else {
    timerLabel = `예약 ${data.reservation.reservationTime} · ${data.durationMinutes}분`;
  }

  const dateStr = new Date(data.reservation.reservationDate).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
      {/* 상단 바 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={backHref} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Video size={18} className="text-indigo-500" />
              1:1 영상 상담
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  data.status === "ACTIVE"
                    ? "bg-green-50 text-green-600"
                    : data.status === "WAITING"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-gray-100 text-gray-500"
                }`}
              >
                {STATUS_LABEL[data.status]}
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {isHost
                ? `${data.reservation.customerName}님과의 상담`
                : `${data.reservation.shopName} · ${data.reservation.consultantName || "뷰티 전문가"}`}
              {data.reservation.productName ? ` · ${data.reservation.productName}` : ""}
            </p>
          </div>
        </div>
        <div
          className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${
            timerDanger && !ended
              ? "bg-red-50 text-red-600"
              : "bg-indigo-50 text-indigo-600"
          }`}
        >
          <Clock size={15} />
          {timerLabel}
        </div>
      </div>

      {/* 예약 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <Calendar size={13} className="text-gray-400" />
          {dateStr} {data.reservation.reservationTime}
        </span>
        <span className="flex items-center gap-1.5">
          <User size={13} className="text-gray-400" />
          {isHost ? data.reservation.customerName : data.reservation.shopName}
        </span>
        <span className="text-gray-400">예약번호 {data.reservation.reservationNumber}</span>
        {isHost && data.reservation.birthDate && (
          <span>
            생년월일 {data.reservation.birthDate}
            {data.reservation.birthTime ? ` ${data.reservation.birthTime}` : ""}
            {data.reservation.gender
              ? ` (${data.reservation.gender === "M" ? "남" : "여"})`
              : ""}
          </span>
        )}
      </div>

      {isHost && data.reservation.consultingContent && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">고객 상담 요청 내용</p>
          <p className="whitespace-pre-wrap leading-relaxed">
            {data.reservation.consultingContent}
          </p>
        </div>
      )}

      {/* 영상 영역 */}
      {ended ? (
        <div className="h-72 bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-center justify-center text-center gap-2">
          <VideoOff size={36} className="text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            {data.status === "CANCELLED" ? "취소된 상담입니다." : "상담이 종료되었습니다."}
          </p>
          {data.duration != null && (
            <p className="text-xs text-gray-400">실제 소요 시간 {data.duration}분</p>
          )}
          <Link
            href={backHref}
            className="mt-2 text-xs text-indigo-600 font-medium hover:underline"
          >
            {backLabel}
          </Link>
        </div>
      ) : data.isDemo ? (
        <div className="h-72 bg-gray-900 rounded-xl flex flex-col items-center justify-center text-center gap-3 px-6">
          <Video size={36} className="text-gray-500" />
          <p className="text-sm text-gray-300 font-medium">
            영상 통화 데모 모드입니다
          </p>
          <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
            DAILY_API_KEY가 설정되지 않아 실제 통화 없이 상담 플로우만 시뮬레이션합니다.
            운영 환경에서는 이 자리에 Daily.co 영상 화면이 표시됩니다.
          </p>
          {data.status === "WAITING" && (
            <button
              onClick={handleDemoStart}
              className="mt-1 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500"
            >
              상담 시작 (시뮬레이션)
            </button>
          )}
        </div>
      ) : (
        <div
          ref={frameContainerRef}
          className="h-[60vh] min-h-[320px] bg-gray-900 rounded-xl overflow-hidden"
        />
      )}

      {/* host 컨트롤: 고객 메모 + 종료 */}
      {isHost && !ended && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <StickyNote size={15} className="text-amber-500" />
            고객 메모
            <span className="text-xs font-normal text-gray-400">
              (고객에게 노출되지 않으며 상담 종료 시 저장됩니다)
            </span>
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            placeholder="요청사항을 기록해 두세요. 고객관리(CRM) 이력에 표시됩니다."
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:border-indigo-400"
          />
          {confirmEnd ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleEnd}
                disabled={ending}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <PhoneOff size={15} />
                {ending ? "종료 처리 중..." : "상담 종료 확정 (메모 저장)"}
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                disabled={ending}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmEnd(true)}
              className="w-full py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 flex items-center justify-center gap-1.5"
            >
              <PhoneOff size={15} />
              상담 종료
            </button>
          )}
        </div>
      )}

      {/* guest 안내 */}
      {!isHost && !ended && (
        <p className="text-xs text-gray-400 text-center">
          상담이 끝나면 뷰티 전문가가 종료 처리합니다. 연결에 문제가 있으면 새로고침해 주세요.
        </p>
      )}
      {joined && (
        <p className="sr-only">상담실에 연결되었습니다.</p>
      )}
    </div>
  );
}
