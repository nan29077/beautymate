import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Participant {
  id: string;
  userId: string | null;
  name: string;
  entry: string | null;
  createdAt: Date;
}

function parseConfig(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// 당첨자(로그인 참여자)에게 게임 쿠폰 자동 발급.
// 승자 판정은 result.winnerUserIds(참여자 userId) 를 기준으로 한다.
// 예전에는 result.winners(표시 이름)를 참여자 이름과 문자열 비교했는데, 이름은
// 중복·위장이 가능해 동명이인이 함께 당첨되거나 남의 이름을 그대로 적어 넣은
// 참여자가 쿠폰을 받아갈 수 있었다. 이름은 표시용으로만 남긴다.
// 실패해도 결과 처리를 막지 않도록 호출부에서 try/catch 로 감싼다.
async function issueGameCoupons(
  gameId: string,
  sellerId: string,
  result: Record<string, unknown>,
) {
  const coupons = await prisma.gameCoupon.findMany({ where: { gameId } });
  if (coupons.length === 0) return;

  // 이 게임의 로그인 참여자만 쿠폰 대상 — 외부에서 넘어온 id 는 반드시 대조한다.
  const members = await prisma.gameParticipant.findMany({
    where: { gameId, userId: { not: null } },
    select: { userId: true },
  });
  if (members.length === 0) return;
  const memberUserIds = new Set(members.map((m) => m.userId as string));

  const declared: string[] = Array.isArray(result.winnerUserIds)
    ? (result.winnerUserIds as unknown[]).map(String)
    : [];
  const winnerUserIds = Array.from(new Set(declared.filter((id) => memberUserIds.has(id))));
  if (winnerUserIds.length === 0) return;

  const now = new Date();
  for (const coupon of coupons) {
    let issued = await prisma.userGameCoupon.count({ where: { gameCouponId: coupon.id } });
    const expiresAt = new Date(now.getTime() + coupon.validDays * 24 * 60 * 60 * 1000);
    for (const userId of winnerUserIds) {
      if (coupon.maxIssueCount != null && issued >= coupon.maxIssueCount) break;
      // 1인 1회 (unique userId+gameCouponId)
      const exists = await prisma.userGameCoupon.findUnique({
        where: { userId_gameCouponId: { userId, gameCouponId: coupon.id } },
      });
      if (exists) continue;
      const base = coupon.code ? coupon.code : "GAME";
      const code = `${base}-${userId.slice(0, 6)}${coupon.id.slice(0, 3)}`.toUpperCase().slice(0, 40);
      try {
        await prisma.userGameCoupon.create({
          data: { userId, gameCouponId: coupon.id, gameId, sellerId, code, expiresAt },
        });
        issued++;
      } catch {
        // 코드 충돌 등 → 랜덤 코드로 1회 재시도
        try {
          await prisma.userGameCoupon.create({
            data: { userId, gameCouponId: coupon.id, gameId, sellerId, code: `GAME-${randomCode()}`, expiresAt },
          });
          issued++;
        } catch {
          /* skip */
        }
      }
    }
  }
}

// SEQUENTIAL: 참여자 풀에서 1등~N등 순위 추첨. 참여자가 없으면 items(뷰티 전문가 입력) 폴백.
function computeSequential(
  cfg: Record<string, unknown>,
  participants: Participant[],
  items: string[],
) {
  // 참여자가 있으면 참여자 풀, 없으면 뷰티 전문가가 입력한 항목 풀.
  // 참여자 풀일 때는 userId 를 함께 들고 다녀야 쿠폰 발급 대상을 이름이 아닌
  // 계정 기준으로 특정할 수 있다.
  const pool: { name: string; userId: string | null }[] =
    participants.length > 0
      ? participants.map((p) => ({ name: p.name, userId: p.userId }))
      : items.map((name) => ({ name, userId: null }));
  const rewards = Array.isArray(cfg.rewards) ? (cfg.rewards as unknown[]).map(String) : [];
  const rankCount = Math.max(1, Math.min(Number(cfg.rankCount) || pool.length, pool.length));
  const picked = shuffle(pool).slice(0, rankCount);
  const ranks = picked.map((p, i) => ({ rank: i + 1, name: p.name, reward: rewards[i] || "" }));
  return {
    ranks,
    winners: ranks.map((r) => r.name),
    winnerUserIds: pickUserIds(picked),
  };
}

/** 당첨 참여자 목록에서 로그인 계정 id 만 중복 없이 추출 */
function pickUserIds(list: { userId: string | null }[]): string[] {
  return Array.from(new Set(list.map((x) => x.userId).filter((v): v is string => !!v)));
}

function computeWinners(type: string, cfg: Record<string, unknown>, participants: Participant[]) {
  switch (type) {
    case "KEYWORD": {
      const keyword = String(cfg.keyword ?? "").trim().toLowerCase();
      const winnerCount = Math.max(1, Number(cfg.winnerCount) || 1);
      const matched = participants
        .filter((p) => (p.entry ?? "").trim().toLowerCase() === keyword && keyword !== "")
        .slice(0, winnerCount);
      return {
        winners: matched.map((p) => p.name),
        winnerUserIds: pickUserIds(matched),
        keyword: cfg.keyword ?? "",
      };
    }
    case "NUMBER_GUESS": {
      const answer = Number(cfg.answer) || 0;
      const mode = cfg.mode === "exact" ? "exact" : "closest";
      const winnerCount = Math.max(1, Number(cfg.winnerCount) || 1);
      const withNum = participants
        .map((p) => ({ p, num: Number((p.entry ?? "").trim()) }))
        .filter((x) => Number.isFinite(x.num));
      let picked: typeof withNum;
      if (mode === "exact") {
        picked = withNum.filter((x) => x.num === answer).slice(0, winnerCount);
      } else {
        picked = withNum
          .map((x) => ({ ...x, diff: Math.abs(x.num - answer) }))
          .sort((a, b) => a.diff - b.diff || a.p.createdAt.getTime() - b.p.createdAt.getTime())
          .slice(0, winnerCount);
      }
      return {
        winners: picked.map((x) => `${x.p.name} (${x.num})`),
        winnerUserIds: pickUserIds(picked.map((x) => x.p)),
        answer,
        mode,
      };
    }
    case "QUIZ": {
      const answerIndex = Number(cfg.answerIndex) || 0;
      const correct = participants.filter((p) => Number((p.entry ?? "").trim()) === answerIndex);
      return {
        winners: correct.map((p) => p.name),
        winnerUserIds: pickUserIds(correct),
        correctCount: correct.length,
        answerIndex,
      };
    }
    case "VOTE": {
      const choices = Array.isArray(cfg.choices) ? (cfg.choices as unknown[]).map(String) : [];
      const counts = choices.map(() => 0);
      participants.forEach((p) => {
        const idx = Number((p.entry ?? "").trim());
        if (Number.isInteger(idx) && idx >= 0 && idx < counts.length) counts[idx]++;
      });
      let winnerIndex = 0;
      counts.forEach((c, i) => {
        if (c > counts[winnerIndex]) winnerIndex = i;
      });
      const total = counts.reduce((a, b) => a + b, 0);
      return {
        counts,
        choices,
        winnerIndex: total > 0 ? winnerIndex : -1,
        winnerLabel: total > 0 ? choices[winnerIndex] : "",
        total,
      };
    }
    case "BOX_OPEN": {
      const boxes = Array.isArray(cfg.boxes) ? (cfg.boxes as Record<string, unknown>[]) : [];
      const weights = boxes.map((b) => Math.max(0, Number(b.prob) || 0));
      const totalW = weights.reduce((a, b) => a + b, 0);
      let pickIdx = 0;
      if (totalW > 0) {
        let r = Math.random() * totalW;
        for (let i = 0; i < weights.length; i++) {
          r -= weights[i];
          if (r <= 0) {
            pickIdx = i;
            break;
          }
        }
      } else if (boxes.length > 0) {
        pickIdx = Math.floor(Math.random() * boxes.length);
      }
      const box = boxes[pickIdx] || { label: "결과 없음", kind: "MISS" };
      return { box: { label: String(box.label ?? ""), kind: String(box.kind ?? "MISS") }, boxIndex: pickIdx };
    }
    default:
      return { winners: [], winnerUserIds: [] };
  }
}

// POST: 게임 결과 처리 (뷰티 전문가만) — 당첨자 결정 후 result 저장
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await Promise.resolve(params);
    const session = await auth();
    if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
    if (session.user.role !== "CONSULTANT") {
      return NextResponse.json({ error: "뷰티 전문가 전용" }, { status: 403 });
    }
    const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user!.id } });
    if (!seller) return NextResponse.json({ error: "뷰티 전문가 프로필 없음" }, { status: 400 });

    const game = await prisma.game.findUnique({ where: { id } });
    if (!game || game.sellerId !== seller.id) {
      return NextResponse.json({ error: "이 게임에 대한 권한이 없습니다" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const cfg = parseConfig(game.config);

    let result: Record<string, unknown>;
    if (Array.isArray(body.winners) && body.winners.length > 0) {
      // 뷰티 전문가가 직접 당첨자 지정.
      // 쿠폰은 계정(userId) 기준으로만 발급되므로, 이름만 넘어온 경우에는
      // 표시용 당첨자 목록만 저장하고 쿠폰은 발급하지 않는다.
      result = {
        winners: body.winners.map((w: unknown) => String(w)),
        winnerUserIds: Array.isArray(body.winnerUserIds)
          ? (body.winnerUserIds as unknown[]).map(String)
          : [],
      };
    } else {
      const participants = await prisma.gameParticipant.findMany({
        where: { gameId: id },
        orderBy: { createdAt: "asc" },
        select: { id: true, userId: true, name: true, entry: true, createdAt: true },
      });
      if (game.type === "SEQUENTIAL") {
        // 참여자 풀에서 순위 추첨 (참여자 없으면 items 폴백)
        const items = parseJsonArray(game.items);
        if (participants.length === 0 && items.length === 0) {
          return NextResponse.json({ error: "추첨할 참여자가 없습니다" }, { status: 400 });
        }
        result = computeSequential(cfg, participants, items);
      } else {
        result = computeWinners(game.type, cfg, participants);
      }
    }

    const updated = await prisma.game.update({
      where: { id },
      data: { status: "FINISHED", result: JSON.stringify(result) },
    });

    // 당첨자에게 게임 쿠폰 자동 발급 (실패해도 결과 처리는 유지)
    let couponsIssued = false;
    try {
      await issueGameCoupons(id, game.sellerId, result);
      couponsIssued = true;
    } catch (e) {
      console.error("Game coupon issue error:", e);
    }

    return NextResponse.json({
      success: true,
      result,
      couponsIssued,
      game: { id: updated.id, status: updated.status },
    });
  } catch (error) {
    console.error("Game result error:", error);
    return NextResponse.json({ error: "결과 처리에 실패했습니다" }, { status: 500 });
  }
}
