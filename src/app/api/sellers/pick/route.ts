import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Toggle pick (follow/unfollow) a seller
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { sellerId } = await req.json();
    if (!sellerId) {
      return NextResponse.json({ error: "sellerId 필수" }, { status: 400 });
    }

    // Get or create buyer profile
    let buyerProfile = await prisma.buyerProfile.findUnique({
      where: { userId: session.user!.id },
    });
    if (!buyerProfile) {
      buyerProfile = await prisma.buyerProfile.create({
        data: { userId: session.user!.id },
      });
    }

    // Check existing follow
    const existing = await prisma.sellerFollower.findUnique({
      where: {
        buyerId_sellerId: {
          buyerId: buyerProfile.id,
          sellerId,
        },
      },
    });

    if (existing) {
      // Unfollow
      await prisma.sellerFollower.delete({ where: { id: existing.id } });
      await prisma.sellerProfile.update({
        where: { id: sellerId },
        data: { totalFans: { decrement: 1 } },
      });
      return NextResponse.json({ picked: false });
    } else {
      // Follow
      await prisma.sellerFollower.create({
        data: {
          buyerId: buyerProfile.id,
          sellerId,
        },
      });
      await prisma.sellerProfile.update({
        where: { id: sellerId },
        data: { totalFans: { increment: 1 } },
      });
      return NextResponse.json({ picked: true });
    }
  } catch (error) {
    console.error("Pick error:", error);
    return NextResponse.json({ error: "처리 실패" }, { status: 500 });
  }
}

// GET: Check if current user has picked a seller
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ picked: false });
    }

    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get("sellerId");
    if (!sellerId) {
      return NextResponse.json({ picked: false });
    }

    const buyerProfile = await prisma.buyerProfile.findUnique({
      where: { userId: session.user!.id },
    });
    if (!buyerProfile) {
      return NextResponse.json({ picked: false });
    }

    const existing = await prisma.sellerFollower.findUnique({
      where: {
        buyerId_sellerId: {
          buyerId: buyerProfile.id,
          sellerId,
        },
      },
    });

    return NextResponse.json({ picked: !!existing });
  } catch {
    return NextResponse.json({ picked: false });
  }
}
