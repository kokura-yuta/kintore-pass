import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import nextConfig from "./next.config";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  // 同じWi-Fi上のスマホから開発中のAPIへ接続できるよう、Workerを全てのLANアドレスで待ち受ける
  dev: {
    // デバッグ用InspectorはMac内部だけに限定し、LANへ公開しない
    inspector: {
      hostname: "127.0.0.1",
    },
    server: {
      hostname: "0.0.0.0",
    },
  },
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      // Vite本体の3000番ポートも同じWi-Fi上のスマホから接続できるようにする
      host: "0.0.0.0",
      ...(isCodexSeatbeltSandbox
        ? {
            watch: {
              useFsEvents: false,
              usePolling: true,
            },
          }
        : {}),
    },
    plugins: [
      vinext({
        // next.config.tsの画像送信設定をVinextへ明示的に渡す
        nextConfig,
      }),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
