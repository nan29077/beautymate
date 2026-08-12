import { redirect } from "next/navigation";
export default async function AdminOrdersPage() {
  redirect("/admin/reservations");
}
