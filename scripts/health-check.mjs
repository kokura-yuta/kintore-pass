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

async function checkTarget(target) {
  const startedAt = Date.now();
  let lastError;
  // Render's free service can wake up between the TCP response and the JSON
  // health response. Retry transient/non-JSON responses once before failing.
  const attempts = target.name === "Python analysis API" ? 3 : 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(target.url, {
        signal: AbortSignal.timeout(target.timeoutMilliseconds),
        headers: { "user-agent": "musclepas-health-check/1.1" },
      });
      const text = await response.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch (error) {
        lastError = new Error(
          `${target.name} returned non-JSON HTTP ${response.status}`,
          { cause: error },
        );
      }
      if (response.ok && body !== undefined) {
        target.validate(body);
        return { name: target.name, status: response.status, durationMilliseconds: Date.now() - startedAt, attempts: attempt };
      }
      if (!lastError) lastError = new Error(`${target.name} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error(`${target.name} health check failed after ${Date.now() - startedAt}ms`, { cause: lastError });
}

for (const target of targets) results.push(await checkTarget(target));

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
