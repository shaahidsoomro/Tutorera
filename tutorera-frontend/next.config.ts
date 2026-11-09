import type { NextConfig } from "next";

// Vercel sets VERCEL_ENV at build time: "production" for the production
// deployment of the configured domain, "preview" for every PR / branch
// / preview URL (including the default tutorera-frontend.vercel.app),
// and "development" locally. Any build NOT marked production is a
// non-canonical surface and must never be indexable. We stamp this at
// config time so the header fires even on routes the middleware matcher
// excludes (static assets, _next/image, favicon.ico).
const IS_NON_CANONICAL_DEPLOY =
  Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "production";

const nextConfig: NextConfig = {
  // Browser tests use a separate build directory so they can run alongside a
  // developer's existing local Next server without sharing its lock or cache.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    cpus: 2,
  },
  turbopack: {},
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    const assetCache = {
      source:
        "/(favicon.ico|icon.png|icon.svg|apple-icon.png|og-image.png|tutorera-icon-180.png|tutorera-icon-192.png|tutorera-icon-512.png|tutorera-logo-transparent.png|tutorera-logo.png)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
      ],
    };

    const nonCanonicalNoindex = IS_NON_CANONICAL_DEPLOY
      ? [{
          source: "/:path*",
          headers: [
            { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          ],
        }]
      : [];

    return [assetCache, ...nonCanonicalNoindex];
  },
};

export default nextConfig;
