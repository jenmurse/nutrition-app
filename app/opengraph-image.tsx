// app/opengraph-image.tsx — Auto-generated OG card (1200×630).
// Shown in iMessage, Slack, Twitter/X, Facebook, etc.

import { ImageResponse } from "next/og";
import { SEO } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#F5F4EF",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        {/* Top: G mark */}
        <div
          style={{
            width: 60,
            height: 60,
            background: SEO.brandColor,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 32 32" width={42} height={42}>
            <path
              fill="white"
              d="M17.49,19.24h4.46c-.05,1.12-.3,2.04-.77,2.77s-1.08,1.26-1.86,1.61c-.77.34-1.68.52-2.73.52s-1.88-.16-2.64-.48c-.76-.32-1.42-.82-1.96-1.48s-.96-1.5-1.23-2.52c-.27-1.01-.41-2.22-.41-3.62,0-1.83.24-3.35.72-4.55.47-1.2,1.17-2.09,2.09-2.68.92-.58,2.02-.87,3.3-.87.93,0,1.77.16,2.52.48.75.32,1.36.8,1.82,1.45.46.64.72,1.46.77,2.46l4.86-1.5c-.05-1.1-.31-2.08-.8-2.95-.49-.87-1.16-1.61-2.02-2.23-.86-.62-1.87-1.09-3.03-1.43-1.17-.33-2.46-.5-3.89-.5-1.9,0-3.58.29-5.03.86-1.45.57-2.67,1.4-3.66,2.48-.99,1.08-1.74,2.39-2.25,3.93-.51,1.53-.77,3.29-.77,5.26,0,2.69.45,4.92,1.34,6.69.89,1.77,2.11,3.11,3.64,4,1.53.89,3.27,1.34,5.19,1.34,1.47,0,2.72-.25,3.73-.75,1.01-.5,1.84-1.23,2.48-2.2.64-.96,1.15-2.16,1.53-3.59h.64l-.07,6.03h3.57v-12.24h-9.53v3.71h0Z"
            />
          </svg>
        </div>

        {/* Bottom: wordmark + tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: "#1A1917",
              letterSpacing: "-0.03em",
              lineHeight: 1,
              marginBottom: 24,
            }}
          >
            Good Measure
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#888",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "monospace",
            }}
          >
            Measure what matters.
          </div>
        </div>

        {/* Right accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 8,
            background: SEO.brandColor,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
