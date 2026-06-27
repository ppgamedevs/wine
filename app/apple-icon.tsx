import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#7C2D12",
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 7C9 12.8 11.9 16.6 15 17V23H11.5C10.95 23 10.5 23.45 10.5 24C10.5 24.55 10.95 25 11.5 25H20.5C21.05 25 21.5 24.55 21.5 24C21.5 23.45 21.05 23 20.5 23H17V17C20.1 16.6 23 12.8 23 7H9Z"
            fill="#F7E9D7"
          />
          <path
            d="M10 8.5C10.7 11.6 13 13.8 16 13.8C19 13.8 21.3 11.6 22 8.5H10Z"
            fill="#C2410C"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
