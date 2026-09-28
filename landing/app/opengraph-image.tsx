import { ImageResponse } from "next/og";

export const alt = "Fill2Fast — Fill job applications faster.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#ffffff",
          color: "#16161d",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 600 }}>
          <svg width="72" height="72" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="22" fill="#4f46e5" />
            <path d="M58 12 26 56h21l-7 32 34-46H53l7-30z" fill="#fff" />
          </svg>
          Fill2Fast
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
            Fill job applications faster.
          </div>
          <div style={{ fontSize: 34, color: "#55556b" }}>
            Save your information once. Fill common fields with one click.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#4f46e5", fontWeight: 600 }}>
          Free Chrome extension · No account · Local-first
        </div>
      </div>
    ),
    size,
  );
}
