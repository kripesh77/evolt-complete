import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://res.cloudinary.com/dbznmbrjy/**"),
      new URL("https://images.unsplash.com/**"),
    ],
  },
};

export default nextConfig;
