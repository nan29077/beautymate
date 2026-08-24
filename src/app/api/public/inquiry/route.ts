import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INQUIRIES_PATH = join(process.cwd(), "data", "inquiries.json");

interface Inquiry {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  reply: string | null;
  status: "pending" | "replied";
  createdAt: string;
}

async function getInquiries(): Promise<Inquiry[]> {
  try {
    if (existsSync(INQUIRIES_PATH)) {
      const data = await readFile(INQUIRIES_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch {}
  return [];
}

async function saveInquiries(list: Inquiry[]): Promise<void> {
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(INQUIRIES_PATH, JSON.stringify(list, null, 2), "utf-8");
}

// GET: 문의 목록 (관리자 전용)
export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }
    const list = await getInquiries();
    // 최신순 정렬
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: "문의를 불러올 수 없습니다" }, { status: 500 });
  }
}

// PATCH: 문의 답변 저장 (관리자 전용)
// 관리자 화면의 "답변 전송"이 화면 상태만 바꾸고 저장되지 않아, 새로고침하면
// 답변이 사라지고 문의가 계속 미답변으로 남던 문제를 해결한다.
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "").trim();
    const reply = String(body.reply ?? "").trim();
    if (!id || !reply) {
      return NextResponse.json({ error: "문의 ID와 답변 내용이 필요합니다" }, { status: 400 });
    }

    const list = await getInquiries();
    const target = list.find((i) => i.id === id);
    if (!target) {
      return NextResponse.json({ error: "문의를 찾을 수 없습니다" }, { status: 404 });
    }
    target.reply = reply;
    target.status = "replied";
    await saveInquiries(list);

    return NextResponse.json({ ok: true, inquiry: target });
  } catch {
    return NextResponse.json({ error: "답변 저장에 실패했습니다" }, { status: 500 });
  }
}

// POST: 1:1 문의 접수 (인증 불필요 — 비회원도 문의 가능)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();
    const category = String(body.category ?? "1:1 채팅").trim() || "1:1 채팅";

    if (!name || !email || !message) {
      return NextResponse.json({ error: "이름, 이메일, 문의 내용을 모두 입력해 주세요" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "올바른 이메일 형식이 아닙니다" }, { status: 400 });
    }

    const inquiry: Inquiry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      email,
      category,
      message,
      reply: null,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const list = await getInquiries();
    list.push(inquiry);
    await saveInquiries(list);

    return NextResponse.json({ ok: true, id: inquiry.id });
  } catch {
    return NextResponse.json({ error: "문의 접수에 실패했습니다" }, { status: 500 });
  }
}
