/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Pantry was previously at /ingredients. Keep old bookmarks/deep links working.
      { source: "/ingredients", destination: "/pantry", permanent: true },
      { source: "/ingredients/:path*", destination: "/pantry/:path*", permanent: true },
      // Classic meal-plans UI retired June 2026 — matrix planner at /planner is primary.
      { source: "/meal-plans", destination: "/planner", permanent: true },
      { source: "/meal-plans/:path*", destination: "/planner", permanent: true },
    ];
  },
};

export default nextConfig;
