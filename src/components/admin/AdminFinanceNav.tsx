"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/settlements", label: "정산" },
  { href: "/admin/deposit-transfer", label: "송금" },
  { href: "/admin/manual-settlement", label: "수기 정산" },
  { href: "/admin/tax", label: "세무" },
  { href: "/admin/revenue", label: "수익" },
];

export default function AdminFinanceNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="정산·재무 관리" className="mb-5 overflow-x-auto scrollbar-hide">
      <div className="flex min-w-max items-center gap-1 border-b border-gray-200">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 sm:px-4 py-2.5 text-xs sm:text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
                active
                  ? "border-brand-500 text-brand-700"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
