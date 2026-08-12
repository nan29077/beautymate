import { Sparkles } from "lucide-react";

export default function BeeLoader({ size = 96 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className="animate-pulse flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Sparkles size={Math.round(size * 0.6)} strokeWidth={1.4} className="text-[#2d1b69]" />
      </div>
      <p className="text-xs text-gray-400">잠시만 기다려주세요</p>
    </div>
  );
}
