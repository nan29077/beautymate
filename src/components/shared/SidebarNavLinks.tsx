"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from '@/components/shared/Icon';

interface NavItem {
  href: string;
  iconName: string;
  label: string;
  group?: string;
}

export default function SidebarNavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "";

  // Group items
  const groups: { name: string; items: NavItem[] }[] = [];
  items.forEach((item) => {
    const groupName = item.group || "";
    const existing = groups.find((g) => g.name === groupName);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ name: groupName, items: [item] });
    }
  });

  return (
    <nav className="dashboard-sidebar-nav flex-1 px-3 py-4 overflow-y-auto">
      {groups.map((group, gi) => (
        <div key={group.name || gi} className={gi > 0 ? "mt-4" : ""}>
          {group.name && gi > 0 && (
            <p className="text-[10px] font-bold text-brand-400 uppercase tracking-[0.14em] px-3 mb-2">
              {group.name}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isDashboardRoot = ["/admin", "/seller", "/brand"].includes(item.href);
              const isActive = isDashboardRoot
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[0_8px_20px_rgba(104,73,216,0.22)]"
                      : "text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                  }`}
                >
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${isActive ? "bg-white/15" : "bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-brand-600"}`}>
                    <Icon name={item.iconName} size={15} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
