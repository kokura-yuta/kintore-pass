/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  CORS_ALLOWED_ORIGINS?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Expo Webから公開APIへ接続できる開発用URL
const DEFAULT_CORS_ALLOWED_ORIGINS = new Set([
  "http://127.0.0.1:8081",
  "http://localhost:8081",
  "http://127.0.0.1:8082",
  "http://localhost:8082",
]);

// 環境変数に追加したURLも含め、今回のアクセス元を許可するか確認する
function isAllowedCorsOrigin(origin: string, env: Env): boolean {
  if (DEFAULT_CORS_ALLOWED_ORIGINS.has(origin)) return true;

  return (env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(origin);
}

// 許可したアクセス元にだけブラウザ通信の許可ヘッダーを付ける
function addCorsHeaders(response: Response, request: Request, env: Env): Response {
  const origin = request.headers.get("Origin");
  if (!origin || !isAllowedCorsOrigin(origin, env)) return response;

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  headers.append("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ブラウザが本通信の前に送るCORS確認へ応答する
    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return addCorsHeaders(new Response(null, { status: 204 }), request, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const response = await handler.fetch(request, env, ctx);
    return url.pathname.startsWith("/api/")
      ? addCorsHeaders(response, request, env)
      : response;
  },
};

export default worker;
