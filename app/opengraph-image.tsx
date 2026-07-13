import { ImageResponse } from "next/og";

export const alt = "VinIntel - Ghid de vinuri romanesti";
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
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px",
          background: "linear-gradient(135deg, #1c1917 0%, #7C2D12 100%)",
          color: "#F7E9D7",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
            <path
              d="M9 7C9 12.8 11.9 16.6 15 17V23H11.5C10.95 23 10.5 23.45 10.5 24C10.5 24.55 10.95 25 11.5 25H20.5C21.05 25 21.5 24.55 21.5 24C21.5 23.45 21.05 23 20.5 23H17V17C20.1 16.6 23 12.8 23 7H9Z"
              fill="#F7E9D7"
            />
            <path
              d="M10 8.5C10.7 11.6 13 13.8 16 13.8C19 13.8 21.3 11.6 22 8.5H10Z"
              fill="#C2410C"
            />
          </svg>
          <span style={{ fontSize: 36, fontWeight: 700 }}>VinIntel</span>
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15, maxWidth: 900 }}>
          Vinuri romanesti, preturi si recomandari
        </div>
        <div style={{ fontSize: 28, marginTop: 24, opacity: 0.9 }}>
          Value Score, topuri pe bugete si AI Sommelier
        </div>
      </div>
    ),
    { ...size },
  );
}
