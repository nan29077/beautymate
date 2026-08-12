// Daily.co 영상 상담 서비스 레이어.
// 예약 확정 시 룸을 만들고, 상담사(host)·고객(guest)용 meeting token을 발급한다.
// DAILY_API_KEY 미설정 환경(로컬 개발 등)에서는 데모 모드로 동작해
// 실제 API 호출 없이 세션 레코드 생성·화면 플로우를 시뮬레이션할 수 있다.

const DAILY_API_BASE = "https://api.daily.co/v1";

/** Daily.co 연동 키가 설정돼 있는지 (미설정이면 데모 모드) */
export function isDailyConfigured(): boolean {
  return !!process.env.DAILY_API_KEY;
}

export interface DailyRoomResult {
  roomName: string;
  roomUrl: string;
  /** 데모 모드로 생성됐는지 (실제 통화 불가) */
  isDemo: boolean;
}

export interface DailyRoomInfo {
  roomName: string;
  /** 현재 참여자 수 (조회 실패 시 null) */
  participantCount: number | null;
}

class DailyApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "DailyApiError";
  }
}

async function dailyFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${DAILY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    // Daily API 응답은 캐시하지 않는다
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new DailyApiError(
      `Daily API ${path} 실패 (${res.status}): ${body.slice(0, 300)}`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

/** 예약 ID 기반 룸 이름 (재호출해도 동일 — 중복 생성 방지 키로 사용) */
export function roomNameForReservation(reservationId: string): string {
  return `saju-${reservationId}`;
}

/**
 * 예약에 대한 Daily.co 룸 생성.
 * - nbf/exp: 예약 시각 30분 전부터 입장 가능, 종료 예정 + 60분 후 자동 만료
 * - 이미 같은 이름의 룸이 있으면(재시도 등) 기존 룸을 그대로 사용한다.
 */
export async function createRoom(
  reservationId: string,
  scheduledAt: Date,
  durationMinutes: number,
): Promise<DailyRoomResult> {
  const roomName = roomNameForReservation(reservationId);

  if (!isDailyConfigured()) {
    return {
      roomName,
      roomUrl: `https://demo.daily.co/${roomName}`,
      isDemo: true,
    };
  }

  const nbf = Math.floor(scheduledAt.getTime() / 1000) - 30 * 60;
  const exp =
    Math.floor(scheduledAt.getTime() / 1000) + (durationMinutes + 60) * 60;

  try {
    const room = await dailyFetch<{ name: string; url: string }>("/rooms", {
      method: "POST",
      body: JSON.stringify({
        name: roomName,
        privacy: "private", // meeting token 없이는 입장 불가
        properties: {
          nbf,
          exp,
          max_participants: 4, // 상담사+고객+여유(재접속 유령 세션 대비)
          enable_screenshare: false,
          enable_chat: true,
          enable_knocking: false,
          eject_at_room_exp: true,
          lang: "ko",
        },
      }),
    });
    return { roomName: room.name, roomUrl: room.url, isDemo: false };
  } catch (e) {
    // 이미 존재하는 룸(400: already exists) → 기존 룸 조회 후 재사용
    if (e instanceof DailyApiError && e.status === 400) {
      const room = await dailyFetch<{ name: string; url: string }>(
        `/rooms/${encodeURIComponent(roomName)}`,
      );
      return { roomName: room.name, roomUrl: room.url, isDemo: false };
    }
    throw e;
  }
}

/**
 * 특정 룸 입장용 meeting token 발급.
 * isOwner=true(상담사)는 상대 강제 퇴장 등 owner 권한을 가진다.
 */
export async function createMeetingToken(
  roomName: string,
  isOwner: boolean,
  userName: string,
  expiresAt?: Date,
): Promise<string> {
  if (!isDailyConfigured()) {
    // 데모 모드: 토큰 포맷만 흉내낸 더미 값 (iframe 미부착)
    return `demo-token-${isOwner ? "host" : "guest"}-${roomName}`;
  }

  const { token } = await dailyFetch<{ token: string }>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        is_owner: isOwner,
        user_name: userName,
        ...(expiresAt
          ? { exp: Math.floor(expiresAt.getTime() / 1000) }
          : {}),
      },
    }),
  });
  return token;
}

/** 상담 완료 후 룸 삭제 (실패해도 치명적이지 않으므로 호출부에서 무시 가능) */
export async function deleteRoom(roomName: string): Promise<boolean> {
  if (!isDailyConfigured()) return true;
  try {
    await dailyFetch(`/rooms/${encodeURIComponent(roomName)}`, {
      method: "DELETE",
    });
    return true;
  } catch (e) {
    // 이미 삭제됐거나 만료된 룸(404)은 성공으로 간주
    if (e instanceof DailyApiError && e.status === 404) return true;
    console.error(`[daily] 룸 삭제 실패 (${roomName}):`, e);
    return false;
  }
}

/** 룸 현재 상태 조회 — 진행 중 세션 모니터링용 (참여자 수 등) */
export async function getRoomInfo(
  roomName: string,
): Promise<DailyRoomInfo | null> {
  if (!isDailyConfigured()) {
    return { roomName, participantCount: null };
  }
  try {
    // presence API: 룸의 현재 접속자 목록
    const presence = await dailyFetch<{
      [room: string]: Array<{ id: string }>;
    }>(`/rooms/${encodeURIComponent(roomName)}/presence`);
    const participants = presence[roomName] ?? Object.values(presence)[0] ?? [];
    return {
      roomName,
      participantCount: Array.isArray(participants) ? participants.length : null,
    };
  } catch (e) {
    if (e instanceof DailyApiError && e.status === 404) return null;
    console.error(`[daily] 룸 조회 실패 (${roomName}):`, e);
    return { roomName, participantCount: null };
  }
}
