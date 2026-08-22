import type { Metadata } from "next";

// ─────────────────────────────────────────────
// 프리즘 라이브 스튜디오 / OBS "브라우저 소스" 전용 레이아웃.
// 헤더·푸터 없이 완전 투명 배경만 렌더한다.
// (루트 레이아웃의 기본 배경이 방송 소스에 비치지 않도록 여기서 강제로 덮는다)
// ─────────────────────────────────────────────

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "뷰티메이트 라이브 위젯",
  robots: { index: false, follow: false },
};

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        /* 방송 화면 위에 얹히는 오버레이라 스크롤바가 보이면 안 된다 */
        ::-webkit-scrollbar { display: none; }
      `}</style>
      {children}
    </>
  );
}
