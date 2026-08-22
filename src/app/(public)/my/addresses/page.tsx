import Link from "next/link";
import { PackageX } from "lucide-react";

export const dynamic = "force-dynamic";

// 배송지 관리는 상품 배송 시절의 잔재로, 상담 예약 플랫폼에서는 사용하지 않는다.
// 기존 링크/북마크가 살아 있을 수 있어 404 대신 안내 화면으로 대체한다.
export default function AddressesPage() {
  return (
    <div className="animate-fade-in px-4 py-20 text-center">
      <PackageX size={48} strokeWidth={1.2} className="mx-auto mb-4 text-gray-200" />
      <p className="text-sm font-medium text-gray-600">뷰티샵에서 사용하지 않는 기능입니다.</p>
      <p className="text-xs text-gray-400 mt-1.5">
        상담 예약은 배송지 없이 진행됩니다.
      </p>
      <Link
        href="/my"
        className="mt-6 inline-block px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800"
      >
        마이페이지로 돌아가기
      </Link>
    </div>
  );
}
