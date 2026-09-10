import assert from "node:assert/strict";

const targets = [
  {
    name: "TypeScript API",
    url:
      process.env.PUBLIC_API_HEALTH_URL ??
      "https://musclepas-api.y0u2t1a8.chatgpt.site/api/health",
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
    validate(body) {
      assert.equal(body?.status, "ok");
    },
  },
];

const timeoutMilliseconds = 30_000;
const results = [];

for (const target of targets) {
  const startedAt = Date.now();
  const response = await fetch(target.url, {
    signal: AbortSignal.timeout(timeoutMilliseconds),
    headers: {
      "user-agent": "musclepas-health-check/1.0",
    },
  });
  const body = await response.json();

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
