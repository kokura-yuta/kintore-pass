import { getAdminIdentity } from "@/app/lib/admin/requireAdmin";

// Expoアプリが「管理画面の入口を表示してよい本人か」だけを軽く確認するAPI
export async function GET(request: Request) {
  const admin = await getAdminIdentity(request);

  if (!admin.allowed) {
    return Response.json(
      {
        isAdmin: false,
        error:
          admin.status === 401
            ? "ログインが必要です。"
            : "管理者権限がありません。",
      },
      {
        status: admin.status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return Response.json(
    { isAdmin: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
