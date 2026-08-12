/**
 * 히어로 배경 별 파티클 장식.
 * 서버 컴포넌트에서도 쓸 수 있도록 좌표를 고정값으로 두어 하이드레이션 불일치를 피한다.
 * (Math.random() 사용 금지 — 서버/클라이언트 렌더 결과가 달라진다)
 */

type Star = { left: number; top: number; size: number; delay: number; duration: number };

// left/top: %, size: px, delay/duration: s
const STARS: Star[] = [
  { left: 6, top: 12, size: 2, delay: 0, duration: 3 },
  { left: 14, top: 34, size: 3, delay: 1.2, duration: 4 },
  { left: 22, top: 8, size: 2, delay: 2.1, duration: 3.4 },
  { left: 31, top: 52, size: 2, delay: 0.6, duration: 4.6 },
  { left: 38, top: 20, size: 3, delay: 1.8, duration: 3.2 },
  { left: 46, top: 66, size: 2, delay: 2.6, duration: 5 },
  { left: 54, top: 14, size: 2, delay: 0.3, duration: 3.8 },
  { left: 62, top: 42, size: 3, delay: 1.5, duration: 4.2 },
  { left: 69, top: 74, size: 2, delay: 2.9, duration: 3.6 },
  { left: 76, top: 22, size: 2, delay: 0.9, duration: 4.8 },
  { left: 83, top: 56, size: 3, delay: 2.3, duration: 3.1 },
  { left: 90, top: 30, size: 2, delay: 1.1, duration: 4.4 },
  { left: 95, top: 70, size: 2, delay: 0.4, duration: 3.9 },
  { left: 11, top: 78, size: 2, delay: 2.7, duration: 4.1 },
  { left: 28, top: 88, size: 2, delay: 1.6, duration: 3.3 },
  { left: 44, top: 92, size: 2, delay: 0.8, duration: 4.9 },
  { left: 58, top: 84, size: 3, delay: 2.4, duration: 3.7 },
  { left: 72, top: 6, size: 2, delay: 1.9, duration: 4.3 },
  { left: 87, top: 88, size: 2, delay: 0.2, duration: 3.5 },
  { left: 18, top: 60, size: 2, delay: 2.2, duration: 4.7 },
];

export default function StarField({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            boxShadow: "0 0 6px 1px rgba(255,255,255,0.55)",
          }}
        />
      ))}
    </div>
  );
}
