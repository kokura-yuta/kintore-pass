// 依存性注入で認可順序を実際のHTTPレスポンスとして検証できるようにする。
export async function retentionEndpoint(request: Request, dependencies: {
  authorize: (request: Request) => Promise<{ allowed: boolean; status?: number }>;
  load: () => Promise<unknown>;
  report: (error: unknown) => void;
}) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const identity = await dependencies.authorize(request);
    if (!identity.allowed) return Response.json({ error: '管理者のみ利用できます。' }, { status: identity.status ?? 403, headers });
    return Response.json(await dependencies.load(), { headers });
  } catch (error) {
    dependencies.report(error);
    return Response.json({ error: '継続率を取得できません。DB変更の適用状況を確認してください。' }, { status: 503, headers });
  }
}
