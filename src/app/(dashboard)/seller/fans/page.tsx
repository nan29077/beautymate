import { redirect } from "next/navigation";

// 팬 관리는 고객관리(CRM)로 통합되었다. (기존 링크 호환용 redirect)
export default async function SellerFansPage() {
  redirect("/seller/customers");
}
