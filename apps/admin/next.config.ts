import type { NextConfig } from 'next';

const basePath = process.env.NEXT_PUBLIC_APP_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

if (basePath) {
  nextConfig.basePath = basePath;
}

export default nextConfig;
