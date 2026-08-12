import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TimeslotManager from "@/components/seller/TimeslotManager";

export const dynamic = "force-dynamic";

export default async function SellerTimeslotsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CONSULTANT") redirect("/");

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!seller) redirect("/");

  return (
    <TimeslotManager consultantId={session.user.id} sellerName={seller.shopName} />
  );
}
