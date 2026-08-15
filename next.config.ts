import type { NextConfig } from "vinext";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 開発中のブラウザから画像フォームを送れるようにする
      allowedOrigins: [
        "127.0.0.1:8081",
        "localhost:8081",
        "192.168.68.54:8081",
      ],

      // 8MB画像3枚とフォーム情報をroute.tsまで通す
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
