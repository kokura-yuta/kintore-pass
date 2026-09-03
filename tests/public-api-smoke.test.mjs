import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = (
  process.env.PUBLIC_API_BASE_URL ??
  "https://musclepas-api.y0u2t1a8.chatgpt.site"
).replace(/\/$/, "");

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
    ...options,
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

test("公開APIのヘルスチェックが成功する", async () => {
  const result = await request("/api/health");

  assert.equal(result.status, 200);
  assert.equal(result.body.status, "ok");
  assert.equal(result.body.service, "musclepas-api");
});

test("未ログイン利用者から本人データAPIを保護する", async () => {
  const protectedRequests = [
    ["/api/users/bootstrap", { method: "POST" }],
    ["/api/users/goal"],
    ["/api/users/goal", { method: "PATCH" }],
    ["/api/users/profile"],
    ["/api/users/profile", { method: "PATCH" }],
    ["/api/users/onboarding-complete", { method: "POST" }],
    ["/api/users/account", { method: "DELETE" }],
    ["/api/home"],
    ["/api/training-records"],
    ["/api/training-records", { method: "POST" }],
    ["/api/training-records", { method: "PATCH" }],
    ["/api/training-records", { method: "DELETE" }],
    ["/api/weight-records"],
    ["/api/weight-records", { method: "POST" }],
    ["/api/weight-records", { method: "PATCH" }],
    ["/api/weight-records", { method: "DELETE" }],
    ["/api/body-analysis"],
    ["/api/body-analysis", { method: "POST" }],
    ["/api/ai-menu"],
    ["/api/ai-menu", { method: "POST" }],
    ["/api/ai-menu/history"],
    ["/api/ai-menu/history", { method: "PATCH" }],
    ["/api/ai-menu/history", { method: "DELETE" }],
    ["/api/chat"],
    ["/api/chat", { method: "POST" }],
    ["/api/chat", { method: "DELETE" }],
  ];

  for (const [path, options] of protectedRequests) {
    const result = await request(path, options);
    assert.equal(
      result.status,
      401,
      `${path} must reject unauthenticated access`,
    );
    assert.equal(typeof result.body.error, "string");
  }
});
