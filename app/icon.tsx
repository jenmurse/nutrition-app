// app/icon.tsx — Browser tab favicon.
// Generates a 32×32 PNG with a rounded-square "G" in brand green.
// Replace this file with a real logo SVG/PNG once one exists.

import { ImageResponse } from "next/og";
import { SEO } from "@/lib/seo";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: SEO.brandColor,
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: 800,
          color: "white",
          fontFamily: "Georgia, serif",
          letterSpacing: "-0.02em",
          paddingBottom: 1,
        }}
      >
        G
      </div>
    ),
    { ...size },
  );
}
