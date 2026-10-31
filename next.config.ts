import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the sandbox preview host to talk to the dev server (HMR requests).
  allowedDevOrigins: ["*.e2b.app"],
  // Dev chunks change during Fast Refresh. A preview proxy must not keep old
  // chunks after the source graph changes (production assets remain hashed).
  async headers() {
    return process.env.NODE_ENV === "development"
      ? [{ source: "/_next/static/:path*", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] }]
      : [];
  },
  // Salon gallery images are static files under /public/images.
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
