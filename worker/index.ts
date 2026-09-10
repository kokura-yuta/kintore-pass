/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  logServerError,
  resolveRequestId,
} from "../app/lib/observability/serverLog";

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
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID");
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
    const isApiRequest =
      url.pathname.startsWith("/api/");
    const requestId = isApiRequest
      ? resolveRequestId(request)
      : null;
    const requestStartedAt = Date.now();

    // API内部にも同じIDを渡し、入口から返却まで1件の通信として追跡できるようにする
    const requestWithId = requestId
      ? new Request(request, {
          headers: new Headers(request.headers),
        })
      : request;

    if (requestId) {
      requestWithId.headers.set(
        "x-request-id",
        requestId,
      );
    }

    const finishApiResponse = (
      response: Response,
    ) => {
      if (!requestId) return response;

      const headers = new Headers(
        response.headers,
      );
      headers.set("x-request-id", requestId);

      console.info(
        JSON.stringify({
          level: "info",
          event: "api_request",
          requestId,
          method: request.method,
          pathname: url.pathname,
          status: response.status,
          durationMs:
            Date.now() - requestStartedAt,
        }),
      );

      return addCorsHeaders(
        new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        }),
        request,
        env,
      );
    };

    // ブラウザが本通信の前に送るCORS確認へ応答する
    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return finishApiResponse(
        new Response(null, { status: 204 }),
      );
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

    try {
      const response = await handler.fetch(
        requestWithId,
        env,
        ctx,
      );

      return isApiRequest
        ? finishApiResponse(response)
        : response;
    } catch (error) {
      if (!isApiRequest || !requestId) {
        throw error;
      }

      logServerError(
        "unhandled_api_error",
        error,
        requestId,
      );

      return finishApiResponse(
        Response.json(
          {
            error:
              "サーバーで一時的なエラーが発生しました。",
            requestId,
          },
          { status: 500 },
        ),
      );
    }
  },
};

export default worker;
