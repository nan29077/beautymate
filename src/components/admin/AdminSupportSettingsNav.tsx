"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/contact-settings", label: "고객센터·FAQ" },
  { href: "/admin/support/chatbot", label: "챗봇 노출" },
];

export default function AdminSupportSettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="고객지원 설정" className="mb-5 overflow-x-auto scrollbar-hide">
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
