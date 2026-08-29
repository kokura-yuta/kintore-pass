// 公開中のTypeScriptバックエンドが起動しているか確認するAPI
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
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
