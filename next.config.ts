import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-src 'self' https://widget.rango.exchange https://app.1inch.io https://changenow.io https://api.sumsub.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
