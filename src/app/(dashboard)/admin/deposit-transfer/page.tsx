import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminDepositTransferClient from "@/components/admin/AdminDepositTransferClient";
import AdminFinanceNav from "@/components/admin/AdminFinanceNav";

export const dynamic = "force-dynamic";

export default async function AdminDepositTransferPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if ((session.user as any).role !== "SUPER_ADMIN") redirect("/admin");
  return (
    <div className="animate-fade-in min-w-0">
      <AdminFinanceNav />
      <AdminDepositTransferClient />
    </div>
  );
}
