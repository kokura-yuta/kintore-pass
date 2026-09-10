// 公開中のTypeScriptバックエンドが起動しているか確認するAPI
import { getAuthenticationMode } from "@/app/lib/config/runtimeStatus";

export async function GET() {
  const environment =
    process.env.APP_ENV === "production"
      ? "production"
      : "development";

  return Response.json(
    {
      status: "ok",
      service: "musclepas-api",
      environment,
      authenticationMode:
        getAuthenticationMode(),
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
