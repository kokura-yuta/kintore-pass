// 公開中のTypeScriptバックエンドが起動しているか確認するAPI
import { sql } from "drizzle-orm";
import { getAuthenticationMode } from "@/app/lib/config/runtimeStatus";
import { logServerError } from "@/app/lib/observability/serverLog";
import { getDb } from "@/db";

export async function GET() {
  const environment =
    process.env.APP_ENV === "production"
      ? "production"
      : "development";

  try {
    // 実際にNeonへ軽い読取を行い、DBも利用可能か確認する
    await getDb().execute(sql`select 1`);

    return Response.json(
      {
        status: "ok",
        service: "musclepas-api",
        environment,
        authenticationMode:
          getAuthenticationMode(),
        dependencies: {
          database: "ok",
        },
        checkedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    // 接続文字列やDBエラー本文を返さず、分類名だけをログへ残す
    logServerError(
      "health_database_unavailable",
      error,
    );

    return Response.json(
      {
        status: "degraded",
        service: "musclepas-api",
        environment,
        authenticationMode:
          getAuthenticationMode(),
        dependencies: {
          database: "unavailable",
        },
        checkedAt: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
