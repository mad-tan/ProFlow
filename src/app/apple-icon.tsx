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
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          borderRadius: "40px",
        }}
      >
        {/* Lightning bolt */}
        <svg
          width="90"
          height="90"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 2L4.09 12.5H11.5L10.5 22L19.91 11.5H12.5L13 2Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
