/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Pantry was previously at /ingredients. Keep old bookmarks/deep links working.
      { source: "/ingredients", destination: "/pantry", permanent: true },
      { source: "/ingredients/:path*", destination: "/pantry/:path*", permanent: true },
    ];
  },
};

module.exports = nextConfig;
