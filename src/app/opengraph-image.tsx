import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "사주메이트 - 라이브 점사 예약 플랫폼";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b69 100%)",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: 999,
            right: -95,
            top: -120,
            background: "rgba(167, 139, 250, 0.18)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 270,
            height: 270,
            borderRadius: 999,
            right: 150,
            bottom: -150,
            background: "rgba(196, 181, 253, 0.22)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "72px 78px 62px",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: -2,
              color: "#ffffff",
            }}
          >
            사주메이트
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                alignSelf: "flex-start",
                padding: "10px 20px",
                marginBottom: 22,
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.14)",
                color: "#e9d5ff",
                fontSize: 23,
                fontWeight: 700,
                letterSpacing: -0.5,
              }}
            >
              라이브 점사 예약 플랫폼
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 56,
                lineHeight: 1.18,
                fontWeight: 800,
                letterSpacing: -2.2,
              }}
            >
              <span>지금 방송 중인 상담사를</span>
              <span style={{ color: "#c4b5fd" }}>바로 예약하세요</span>
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 25,
                fontSize: 25,
                lineHeight: 1.45,
                color: "#cbc3e3",
                letterSpacing: -0.6,
              }}
            >
              사주 · 신점 · 타로 · 궁합 · 작명 — 유튜브 라이브 상담
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 24,
              borderTop: "2px solid rgba(196, 181, 253, 0.25)",
              color: "#b8aed6",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            <span>LIVE FORTUNE CONSULTING</span>
            <span>sajumate.co.kr</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
