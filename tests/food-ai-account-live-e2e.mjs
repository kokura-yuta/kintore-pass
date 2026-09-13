import assert from "node:assert/strict";

import { createClerkClient } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local", override: true });

// ローカルAPIを既定にし、必要なら公開APIへ切り替えられるようにする
const apiBaseUrl =
  process.env.AUTHENTICATED_TEST_API_BASE_URL ??
  "http://127.0.0.1:3000";

for (const variableName of [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "OPENAI_API_KEY",
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
let accountDeleted = false;
const checks = [];

function pass(name) {
  checks.push(name);
  console.log(`✓ ${name}`);
}

async function api(path, { token, method = "GET", body } = {}) {
  const headers = {
    authorization: `Bearer ${token}`,
  };

  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
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
  pass(name);
}

async function run() {
  const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const uniqueFoodName = `E2E鶏むね肉-${suffix}`;
  const today = new Date().toISOString().slice(0, 10);

  // 本物の利用者を触らないため、このテスト専用Clerkユーザーを作る
  const clerkUser = await clerk.users.createUser({
    emailAddress: [`codex-food-account-${suffix}@example.com`],
    firstName: "Codex",
    lastName: "FoodAccountE2E",
    skipPasswordRequirement: true,
    skipLegalChecks: true,
  });
  clerkUserId = clerkUser.id;

  const session = await clerk.sessions.createSession({
    userId: clerkUserId,
  });
  const tokenResponse = await clerk.sessions.getToken(session.id);
  let token = tokenResponse.jwt;

  expectStatus(
    "一時ユーザーをNeonへ登録",
    await api("/api/users/bootstrap", {
      token,
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
    await api("/api/users/goal", {
      token,
      method: "PATCH",
      body: { goalBodyType: "細マッチョ" },
    }),
    200,
  );

  expectStatus(
    "身体情報を保存",
    await api("/api/users/profile", {
      token,
      method: "PATCH",
      body: {
        heightCm: 170,
        weightKg: 70,
        bodyFatPercentage: 15,
        weeklyTrainingDays: 3,
        availableMinutes: 60,
        trainingLocation: "gym",
      },
    }),
    200,
  );

  const createdFood = await api("/api/food-records", {
    token,
    method: "POST",
    body: {
      recordedDate: today,
      mealType: "昼食",
      name: uniqueFoodName,
      calories: 777,
      proteinGrams: 55,
    },
  });
  expectStatus("食事をNeonへ保存", createdFood, 201);
  const foodRecordId = createdFood.body.record.id;

  // 別のGET通信で取得し直し、画面再読み込み後も残ることを確認する
  const reloadedFood = await api(
    `/api/food-records?date=${today}`,
    { token },
  );
  expectStatus("再読み込み後に食事を取得", reloadedFood, 200);
  assert.equal(reloadedFood.body.records.length, 1);
  assert.equal(reloadedFood.body.records[0].name, uniqueFoodName);
  assert.deepEqual(reloadedFood.body.summary, {
    totalCalories: 777,
    totalProteinGrams: 55,
    recordCount: 1,
  });
  pass("食事の内容と当日合計が一致");

  const chat = await api("/api/chat", {
    token,
    method: "POST",
    body: {
      requestId: crypto.randomUUID(),
      conversationId: null,
      message:
        "今日保存した食事の名前・カロリー・たんぱく質を、記録どおりに教えてください。",
    },
  });
  expectStatus("AIチャットが食事履歴を参照", chat, 200);
  assert.match(chat.body.reply, new RegExp(uniqueFoodName));
  assert.match(chat.body.reply, /777/);
  assert.match(chat.body.reply, /55/);
  pass("AIチャット回答へ保存済み食事が反映");

  const menu = await api("/api/ai-menu", {
    token,
    method: "POST",
    body: {
      requestId: crypto.randomUUID(),
      conditionScore: 7,
      note:
        "今日の食事記録も考慮し、一般的な栄養面の助言をadviceに1つ含めてください。",
    },
  });
  expectStatus("AIメニューが食事履歴を含む文脈で生成", menu, 200);
  assert.ok(menu.body.menu?.exercises?.length > 0);
  assert.ok(menu.body.menu?.advice?.length > 0);
  pass("AIメニューの形式と保存結果が正常");

  // OpenAIの回答待ちで短命なテスト用JWTが失効する場合があるため、
  // アプリ本体のgetToken()と同じように次の通信前に更新する
  token = (await clerk.sessions.getToken(session.id)).jwt;

  expectStatus(
    "食事を削除",
    await api(`/api/food-records?recordId=${foodRecordId}`, {
      token,
      method: "DELETE",
    }),
    200,
  );

  const afterFoodDelete = await api(
    `/api/food-records?date=${today}`,
    { token },
  );
  expectStatus("削除後の食事一覧を取得", afterFoodDelete, 200);
  assert.equal(afterFoodDelete.body.records.length, 0);
  const deletedFoodRows = await sql`
    select count(*)::int as count
    from food_records
    where id = ${foodRecordId}
  `;
  assert.equal(deletedFoodRows[0].count, 0);
  pass("食事がNeonから削除済み");

  // cascade確認用に、アカウント削除直前の食事をもう1件保存する
  expectStatus(
    "cascade確認用の食事を保存",
    await api("/api/food-records", {
      token,
      method: "POST",
      body: {
        recordedDate: today,
        mealType: "夕食",
        name: "アカウント削除確認用",
        calories: 500,
        proteinGrams: 30,
      },
    }),
    201,
  );

  const accountDeleteWithoutReverification = await api("/api/users/account", {
    token,
    method: "DELETE",
    body: { confirmation: "DELETE" },
  });
  expectStatus(
    "古い本人確認状態ではアカウント削除を拒否",
    accountDeleteWithoutReverification,
    403,
  );
  assert.equal(
    accountDeleteWithoutReverification.body?.clerk_error?.reason,
    "reverification-error",
  );
  pass("Clerk本人再確認を要求する安全機能が有効");

  // 自動作成セッションでは本人再確認モーダルを操作できないため、
  // 同じ削除順序をテスト用管理APIで実行して両サービスの削除結果を検証する
  await sql`delete from users where id = ${databaseUserId}`;
  await clerk.users.deleteUser(clerkUserId);
  accountDeleted = true;

  const databaseAfterAccountDelete = await sql`
    select
      (select count(*)::int from users where id = ${databaseUserId}) as users,
      (select count(*)::int from user_profiles where user_id = ${databaseUserId}) as profiles,
      (select count(*)::int from food_records where user_id = ${databaseUserId}) as foods,
      (select count(*)::int from ai_generated_menus where user_id = ${databaseUserId}) as menus,
      (select count(*)::int from chat_conversations where user_id = ${databaseUserId}) as conversations
  `;
  assert.deepEqual(databaseAfterAccountDelete[0], {
    users: 0,
    profiles: 0,
    foods: 0,
    menus: 0,
    conversations: 0,
  });
  pass("Neonの本人データがcascadeで全削除");

  await assert.rejects(
    () => clerk.users.getUser(clerkUserId),
    /not found|404/i,
  );
  pass("Clerkアカウントが削除済み");
}

try {
  await run();
  console.log(
    JSON.stringify(
      {
        ok: true,
        apiBaseUrl,
        checks,
      },
      null,
      2,
    ),
  );
} finally {
  // 失敗時にも一時テストデータだけを掃除する
  if (!accountDeleted && databaseUserId) {
    await sql`
      delete from users where id = ${databaseUserId}
    `.catch(() => undefined);
  }

  if (!accountDeleted && clerkUserId) {
    await clerk.users.deleteUser(clerkUserId).catch(() => undefined);
  }
}
