import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminTaxClient, { type TaxRecord } from "@/components/admin/AdminTaxClient";
import AdminFinanceNav from "@/components/admin/AdminFinanceNav";

export const dynamic = "force-dynamic";

// 세무 관리 — 회원별 출금(지급) 완료 내역을 원천징수/부가세 관점으로 집계
export default async function AdminTaxPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "SUPER_ADMIN") redirect("/");

  // ── 상담사 출금 (지급완료된 PayoutRequest) ──
  let payouts: any[] = [];
  try {
    payouts = await prisma.payoutRequest.findMany({
      where: { status: "PAID" },
      include: {
        seller: {
          select: {
            shopName: true,
            representativeName: true,
            businessRegistrationNo: true,
          },
        },
      },
      orderBy: { processedAt: "desc" },
    });
  } catch {
    // ignore
  }

  const sellerBusiness: TaxRecord[] = [];
  const sellerNonBusiness: TaxRecord[] = [];
  for (const p of payouts) {
    const rec: TaxRecord = {
      id: p.id,
      name: p.companyName || p.seller?.shopName || "상담사",
      bizNumber: p.bizNumber || p.seller?.businessRegistrationNo || "",
      repName: p.seller?.representativeName || p.accountHolder || "",
      amount: Number(p.amount),
      date: (p.processedAt ?? p.updatedAt ?? p.requestedAt).toISOString(),
    };
    if (p.isBusiness) sellerBusiness.push(rec);
    else sellerNonBusiness.push(rec);
  }

  // 브랜드·중간관리자 개념이 제거되어 해당 정산 집계는 더 이상 존재하지 않는다.
  const brands: TaxRecord[] = [];
  const middleAdmins: TaxRecord[] = [];

  return (
    <div className="animate-fade-in">
      <AdminFinanceNav />
      <AdminTaxClient
        sellerBusiness={sellerBusiness}
        sellerNonBusiness={sellerNonBusiness}
        brands={brands}
        middleAdmins={middleAdmins}
      />
    </div>
  );
}
