// ─────────────────────────────────────────────────────────────
//  lib/seo.ts — Single source of truth for all SEO + social meta.
//  Every value here flows through to <head>, OG tags, Twitter
//  cards, the favicon colour, and the OG image generator.
//  Update this file whenever you rebrand, get a custom domain,
//  or want to tweak how the app appears in search / link previews.
// ─────────────────────────────────────────────────────────────

export const SEO = {

  // ── Core identity ────────────────────────────────────────────
  siteName:    "Good Measure",
  title:       "Good Measure — Cook by the gram. Plan by the week.",
  description: "A cooking tool that calculates nutrition to the gram, plans meals by the week, and works whether you're cooking for yourself or a whole household.",

  // ── Canonical URL ────────────────────────────────────────────
  // Update this when you connect a custom domain.
  siteUrl: "https://withgoodmeasure.com",

  // ── Open Graph (Facebook, iMessage, Slack, etc.) ─────────────
  ogTitle:       "Good Measure — Cook by the gram. Plan by the week.",
  ogDescription: "A cooking tool that calculates nutrition to the gram, plans meals by the week, and works whether you're cooking for yourself or a whole household.",
  // Drop a 1200×630 PNG at /public/og.png to use a custom image.
  // Until then the auto-generated branded card is used (app/opengraph-image.tsx).
  ogImagePath:   "/og-image",   // points to the generated route
  ogImageWidth:  1200,
  ogImageHeight: 630,

  // ── Twitter / X ──────────────────────────────────────────────
  twitterCard:   "summary_large_image" as const,
  twitterHandle: "",   // add "@yourhandle" when ready

  // ── Favicon + theme ──────────────────────────────────────────
  // Used for the browser tab favicon background and mobile theme colour.
  brandColor: "#111111",

  // ── Robots ───────────────────────────────────────────────────
  // Set to false to block indexing (e.g. while in private beta).
  allowIndexing: true,

} as const;
