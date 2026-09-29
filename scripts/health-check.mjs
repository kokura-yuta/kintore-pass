import assert from "node:assert/strict";

const targets = [
  {
    name: "TypeScript API",
    url:
      process.env.PUBLIC_API_HEALTH_URL ??
      "https://musclepas-api.y0u2t1a8.chatgpt.site/api/health",
    timeoutMilliseconds: 30_000,
    validate(body) {
      assert.equal(body?.status, "ok");

      // 新版APIが依存先の状態を返す場合はNeonも正常か確認する
      if (body?.dependencies !== undefined) {
        assert.equal(body.dependencies.database, "ok");
      }
    },
  },
  {
    name: "Python analysis API",
    url:
      process.env.PYTHON_API_HEALTH_URL ??
      "https://musclepas-body-analysis.onrender.com/health",
    // 無料プランでは停止中のサービスが起動するまで時間がかかる。
    timeoutMilliseconds: 60_000,
    validate(body) {
      assert.equal(body?.status, "ok");
    },
  },
];

const results = [];

for (const target of targets) {
  const startedAt = Date.now();
  let response;
  let body;

  try {
    response = await fetch(target.url, {
      signal: AbortSignal.timeout(
        target.timeoutMilliseconds,
      ),
      headers: {
        "user-agent": "musclepas-health-check/1.0",
      },
    });
    body = await response.json();
  } catch (error) {
    throw new Error(
      `${target.name} health check failed after ${Date.now() - startedAt}ms`,
      { cause: error },
    );
  }

  assert.equal(
    response.ok,
    true,
    `${target.name} returned HTTP ${response.status}`,
  );
  target.validate(body);

  results.push({
    name: target.name,
    status: response.status,
    durationMilliseconds: Date.now() - startedAt,
  });
}

console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      results,
    },
    null,
    2,
  ),
);
