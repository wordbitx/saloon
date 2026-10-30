import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the sandbox preview host to talk to the dev server (HMR requests).
  allowedDevOrigins: ["*.e2b.app"],
  // Salon gallery images are static files under /public/images.
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      // The old public sample dashboard is now the signed-in admin workspace.
      { source: "/dashboard", destination: "/admin", permanent: false },
    ];
  },
};

export default nextConfig;
