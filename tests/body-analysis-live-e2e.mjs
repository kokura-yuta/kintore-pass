import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createClerkClient } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local", override: true });

// TypeScript API、Python、OpenAI、Neonを順番に通す実通信テストです。
const apiBaseUrl =
  process.env.AUTHENTICATED_TEST_API_BASE_URL ??
  "http://127.0.0.1:3000";

for (const variableName of [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
]) {
  if (!process.env[variableName]) {
    throw new Error(`${variableName} が設定されていません。`);
  }
}

const clerk = createClerkClient({
  publishableKey:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
});
const sql = neon(process.env.DATABASE_URL);

let clerkUserId = null;
let databaseUserId = null;

async function jsonApi(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined
        ? {}
        : { "content-type": "application/json" }),
    },
    body:
      body === undefined
        ? undefined
        : JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

function expectStatus(name, response, expectedStatus) {
  assert.equal(
    response.status,
    expectedStatus,
    `${name}: expected ${expectedStatus}, received ${response.status} (${JSON.stringify(response.body)})`,
  );
  console.log(`✓ ${name}`);
}

async function imageBlob(path) {
  return new Blob([await readFile(path)], {
    type: "image/png",
  });
}

async function run() {
  const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const user = await clerk.users.createUser({
    emailAddress: [`codex-body-analysis-${suffix}@example.com`],
    firstName: "Codex",
    lastName: "BodyAnalysisE2E",
    skipPasswordRequirement: true,
    skipLegalChecks: true,
  });
  clerkUserId = user.id;

  const session = await clerk.sessions.createSession({
    userId: clerkUserId,
  });
  const freshToken = async () =>
    (await clerk.sessions.getToken(session.id)).jwt;

  expectStatus(
    "一時ユーザーをNeonへ登録",
    await jsonApi("/api/users/bootstrap", {
      token: await freshToken(),
      method: "POST",
    }),
    201,
  );

  const databaseUsers = await sql`
    select id
    from users
    where clerk_user_id = ${clerkUserId}
    limit 1
  `;
  assert.equal(databaseUsers.length, 1);
  databaseUserId = databaseUsers[0].id;

  expectStatus(
    "理想体型を保存",
    await jsonApi("/api/users/goal", {
      token: await freshToken(),
      method: "PATCH",
      body: { goalBodyType: "細マッチョ" },
    }),
    200,
  );

  expectStatus(
    "身体情報を保存",
    await jsonApi("/api/users/profile", {
      token: await freshToken(),
      method: "PATCH",
      body: {
        heightCm: 170,
        weightKg: 70,
        bodyFatPercentage: 15,
      },
    }),
    200,
  );

  // 実在人物ではない合成画像だけを分析APIへ送ります。
  const formData = new FormData();
  formData.append(
    "front_image",
    await imageBlob("tmp/body-analysis-test/front.png"),
    "front.png",
  );
  formData.append(
    "side_image",
    await imageBlob("tmp/body-analysis-test/side.png"),
    "side.png",
  );
  formData.append(
    "back_image",
    await imageBlob("tmp/body-analysis-test/back.png"),
    "back.png",
  );

  const analysisResponse = await fetch(
    `${apiBaseUrl}/api/body-analysis`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${await freshToken()}`,
      },
      body: formData,
    },
  );
  const analysisBody = await analysisResponse
    .json()
    .catch(() => null);

  expectStatus(
    "TypeScriptからPython・OpenAIへ画像分析",
    {
      status: analysisResponse.status,
      body: analysisBody,
    },
    201,
  );
  assert.ok(analysisBody.bodyAnalysisId);
  assert.ok(analysisBody.analysis.summary.length > 0);
  assert.ok(analysisBody.analysis.areas.length > 0);
  console.log("✓ OpenAIの分析JSON形式が正常");

  const history = await jsonApi("/api/body-analysis", {
    token: await freshToken(),
  });
  expectStatus("身体分析履歴を再取得", history, 200);
  assert.equal(
    history.body.analyses[0].id,
    analysisBody.bodyAnalysisId,
  );

  const savedRows = await sql`
    select
      (select count(*)::int from body_analyses where id = ${analysisBody.bodyAnalysisId}) as analyses,
      (select count(*)::int from body_analysis_areas where analysis_id = ${analysisBody.bodyAnalysisId}) as areas
  `;
  assert.equal(savedRows[0].analyses, 1);
  assert.equal(
    savedRows[0].areas,
    analysisBody.analysis.areas.length,
  );
  console.log("✓ 分析本体と部位別結果がNeonへ保存済み");
}

try {
  await run();
  console.log("身体分析の実通信テストが完了しました。");
} finally {
  // 成否に関係なく、このテストが作ったデータだけを片付けます。
  if (databaseUserId) {
    await sql`delete from users where id = ${databaseUserId}`.catch(
      () => undefined,
    );
  }
  if (clerkUserId) {
    await clerk.users
      .deleteUser(clerkUserId)
      .catch(() => undefined);
  }
}
