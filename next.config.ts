import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  async headers() {
    return [
      {
        source: '/api/convert/:path*',
        headers: [
          {
            key: 'max-body-size',
            value: '10mb'
          }
        ],
      },
    ]
  }
};

export default nextConfig;
