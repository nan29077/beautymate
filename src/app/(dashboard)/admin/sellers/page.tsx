import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminSellersClient from "@/components/admin/AdminSellersClient";
import { getAdminSellers } from "@/lib/adminSellers";

export const dynamic = "force-dynamic";

export default async function AdminSellersPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/");

  const [serialized] = await Promise.all([
    getAdminSellers(),
  ]);

  const serializedMiddleAdmins: { id: string; name: string }[] = [];

  return (
    <div className="animate-fade-in">
      <AdminSellersClient sellers={serialized} middleAdmins={serializedMiddleAdmins} />
    </div>
  );
}
