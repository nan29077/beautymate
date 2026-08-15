import { Icon } from "@/components/shared/Icon";

export default function DashboardLoading() {
  return (
    <div className="animate-fade-in space-y-4">
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-brand-950/5 backdrop-blur-[2px]">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-brand-100 bg-white/95 text-brand-600 shadow-[0_20px_60px_rgba(36,20,69,0.18)]">
          <span className="absolute inset-2 rounded-2xl border border-brand-100 animate-pulse" />
          <Icon name="MoonStar" size={34} className="relative animate-pulse" />
        </div>
      </div>
      {/* 기존 스켈레톤 유지 */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
      </div>
      {/* Content skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse mb-2" />
            <div className="h-6 w-16 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
