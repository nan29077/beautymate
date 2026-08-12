import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SellerLiveModeClient from "@/components/seller/SellerLiveModeClient";

export const dynamic = "force-dynamic";

export default async function SellerLiveModePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") redirect("/");

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { shopName: true, slug: true },
  });
  if (!seller) redirect("/");

  return <SellerLiveModeClient shopName={seller.shopName} slug={seller.slug} />;
}
