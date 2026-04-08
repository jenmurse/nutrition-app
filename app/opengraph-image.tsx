// app/opengraph-image.tsx — Auto-generated OG card (1200×630).
// Shown in iMessage, Slack, Twitter/X, Facebook, etc.
// To use a custom image instead: drop a 1200×630 PNG at
// /public/og.png and update SEO.ogImagePath in lib/seo.ts to "/og.png".

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
          background: "#F5F2EC",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        {/* Brand accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: SEO.brandColor,
          }}
        />

        {/* "G" mark */}
        <div
          style={{
            width: 56,
            height: 56,
            background: SEO.brandColor,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            fontWeight: 800,
            color: "white",
            marginBottom: 40,
          }}
        >
          G
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#1a1a18",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          Good Measure
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#666",
            fontFamily: "monospace",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {SEO.ogDescription}
        </div>
      </div>
    ),
    { ...size },
  );
}
