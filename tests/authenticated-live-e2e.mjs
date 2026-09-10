import assert from "node:assert/strict";

import { createClerkClient } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local", override: true });

const apiBaseUrl =
  process.env.AUTHENTICATED_TEST_API_BASE_URL ??
  "http://127.0.0.1:3000";

const requiredEnvironmentVariables = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
];

for (const variableName of requiredEnvironmentVariables) {
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

const createdClerkUserIds = [];
const createdDatabaseUserIds = [];
const results = [];

function record(name, status) {
  results.push({ name, status });
}

async function createAuthenticatedTestUser(label) {
  const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const user = await clerk.users.createUser({
    emailAddress: [
      `codex-${label}-${suffix}@example.com`,
    ],
    firstName: "Codex",
    lastName: label,
    skipPasswordRequirement: true,
    skipLegalChecks: true,
  });
  createdClerkUserIds.push(user.id);

  const session = await clerk.sessions.createSession({
    userId: user.id,
  });
  const token = await clerk.sessions.getToken(session.id);

  return {
    clerkUserId: user.id,
    token: token.jwt,
  };
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
    body:
      body === undefined
        ? undefined
        : JSON.stringify(body),
  });

  const responseBody = await response
    .json()
    .catch(() => null);

  return {
    status: response.status,
    body: responseBody,
  };
}

async function expectStatus(name, response, expectedStatus) {
  assert.equal(
    response.status,
    expectedStatus,
    `${name}: expected ${expectedStatus}, received ${response.status} (${JSON.stringify(response.body)})`,
  );
  record(name, expectedStatus);
}

async function run() {
  const userA = await createAuthenticatedTestUser("user-a");
  const userB = await createAuthenticatedTestUser("user-b");

  for (const testUser of [userA, userB]) {
    const bootstrap = await api("/api/users/bootstrap", {
      token: testUser.token,
      method: "POST",
    });
    await expectStatus("bootstrap", bootstrap, 201);

    const databaseUsers = await sql`
      select id
      from users
      where clerk_user_id = ${testUser.clerkUserId}
      limit 1
    `;
    assert.equal(databaseUsers.length, 1);
    createdDatabaseUserIds.push(databaseUsers[0].id);
  }

  await expectStatus(
    "goal setup",
    await api("/api/users/goal", {
      token: userA.token,
      method: "PATCH",
      body: { goalBodyType: "細マッチョ" },
    }),
    200,
  );

  await expectStatus(
    "profile setup",
    await api("/api/users/profile", {
      token: userA.token,
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

  const today = new Date().toISOString().slice(0, 10);
  const weightCreate = await api("/api/weight-records", {
    token: userA.token,
    method: "POST",
    body: {
      recordedDate: today,
      weightKg: 70,
    },
  });
  await expectStatus("weight create", weightCreate, 201);
  const weightRecordId = weightCreate.body.record.id;

  await expectStatus(
    "other user cannot update weight",
    await api("/api/weight-records", {
      token: userB.token,
      method: "PATCH",
      body: {
        recordId: weightRecordId,
        weightKg: 71,
      },
    }),
    404,
  );

  await expectStatus(
    "weight update",
    await api("/api/weight-records", {
      token: userA.token,
      method: "PATCH",
      body: {
        recordId: weightRecordId,
        weightKg: 70.5,
      },
    }),
    200,
  );

  await expectStatus(
    "other user cannot delete weight",
    await api(`/api/weight-records?recordId=${weightRecordId}`, {
      token: userB.token,
      method: "DELETE",
    }),
    404,
  );

  await expectStatus(
    "weight delete",
    await api(`/api/weight-records?recordId=${weightRecordId}`, {
      token: userA.token,
      method: "DELETE",
    }),
    200,
  );

  const trainingBody = {
    performedAt: new Date(Date.now() - 60_000).toISOString(),
    durationMinutes: 45,
    conditionScore: 7,
    memo: "authenticated live test",
    exercises: [
      {
        exerciseId: "bench-press",
        exerciseName: "ベンチプレス",
        bodyPart: "胸",
        bodyArea: "中部",
        displayOrder: 0,
        sets: [
          {
            setNumber: 1,
            weightKg: 50,
            reps: 10,
          },
        ],
      },
    ],
  };

  const trainingCreate = await api("/api/training-records", {
    token: userA.token,
    method: "POST",
    body: trainingBody,
  });
  await expectStatus("training create", trainingCreate, 201);
  const trainingSessionId =
    trainingCreate.body.trainingSessionId;

  await expectStatus(
    "duplicate training rejected",
    await api("/api/training-records", {
      token: userA.token,
      method: "POST",
      body: trainingBody,
    }),
    409,
  );

  await expectStatus(
    "other user cannot update training",
    await api("/api/training-records", {
      token: userB.token,
      method: "PATCH",
      body: {
        trainingSessionId,
        ...trainingBody,
        memo: "must not be saved",
      },
    }),
    404,
  );

  await expectStatus(
    "training update",
    await api("/api/training-records", {
      token: userA.token,
      method: "PATCH",
      body: {
        trainingSessionId,
        ...trainingBody,
        memo: "updated",
      },
    }),
    200,
  );

  const userAId = createdDatabaseUserIds[0];
  const menuId = crypto.randomUUID();
  await sql`
    insert into ai_generated_menus (
      id,
      user_id,
      recommended_body_part,
      reason,
      estimated_minutes,
      advice,
      condition_score,
      created_at
    ) values (
      ${menuId},
      ${userAId},
      '胸',
      'authenticated live test',
      45,
      array['安全に実施する'],
      7,
      now() - interval '10 seconds'
    )
  `;

  await expectStatus(
    "other user cannot mark menu performed",
    await api("/api/ai-menu/history", {
      token: userB.token,
      method: "PATCH",
      body: {
        menuId,
        trainingSessionId,
      },
    }),
    404,
  );

  await expectStatus(
    "menu performed update",
    await api("/api/ai-menu/history", {
      token: userA.token,
      method: "PATCH",
      body: {
        menuId,
        trainingSessionId,
      },
    }),
    200,
  );

  await expectStatus(
    "other user cannot delete menu",
    await api(`/api/ai-menu/history?menuId=${menuId}`, {
      token: userB.token,
      method: "DELETE",
    }),
    404,
  );

  await expectStatus(
    "menu delete",
    await api(`/api/ai-menu/history?menuId=${menuId}`, {
      token: userA.token,
      method: "DELETE",
    }),
    200,
  );

  await expectStatus(
    "other user cannot delete training",
    await api("/api/training-records", {
      token: userB.token,
      method: "DELETE",
      body: { trainingSessionId },
    }),
    404,
  );

  await expectStatus(
    "training delete",
    await api("/api/training-records", {
      token: userA.token,
      method: "DELETE",
      body: { trainingSessionId },
    }),
    200,
  );

  await sql`
    insert into ai_generated_menus (
      id,
      user_id,
      recommended_body_part,
      reason,
      estimated_minutes,
      advice,
      created_at
    )
    select
      gen_random_uuid(),
      ${userAId},
      '胸',
      'daily limit test',
      30,
      array['test'],
      now() - interval '10 seconds'
    from generate_series(1, 3)
  `;

  await expectStatus(
    "AI menu daily limit",
    await api("/api/ai-menu", {
      token: userA.token,
      method: "POST",
      body: {
        requestId: crypto.randomUUID(),
        conditionScore: 7,
      },
    }),
    429,
  );

  const conversationId = crypto.randomUUID();
  await sql`
    insert into chat_conversations (
      id,
      user_id,
      title,
      created_at,
      updated_at
    ) values (
      ${conversationId},
      ${userAId},
      'daily limit test',
      now() - interval '10 seconds',
      now() - interval '10 seconds'
    )
  `;
  await sql`
    insert into chat_messages (
      id,
      conversation_id,
      role,
      content,
      created_at
    )
    select
      gen_random_uuid(),
      ${conversationId},
      'user',
      'daily limit test',
      now() - interval '10 seconds'
    from generate_series(1, 100)
  `;

  await expectStatus(
    "AI chat daily limit",
    await api("/api/chat", {
      token: userA.token,
      method: "POST",
      body: {
        requestId: crypto.randomUUID(),
        conversationId,
        message: "今日のメニューを教えて",
      },
    }),
    429,
  );

  await sql`
    insert into body_analyses (
      id,
      user_id,
      status,
      summary,
      analyzed_at,
      created_at
    ) values (
      ${crypto.randomUUID()},
      ${userAId},
      'completed',
      'daily limit test',
      now(),
      now()
    )
  `;

  const bodyAnalysisResponse = await fetch(
    `${apiBaseUrl}/api/body-analysis`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${userA.token}`,
      },
      body: new FormData(),
    },
  );
  await expectStatus(
    "body analysis daily limit",
    {
      status: bodyAnalysisResponse.status,
      body: await bodyAnalysisResponse.json(),
    },
    429,
  );

  const beforeCascade = await sql`
    select
      (select count(*)::int from ai_generated_menus where user_id = ${userAId}) as menus,
      (select count(*)::int from chat_conversations where user_id = ${userAId}) as conversations,
      (select count(*)::int from body_analyses where user_id = ${userAId}) as analyses
  `;
  assert.ok(beforeCascade[0].menus > 0);
  assert.ok(beforeCascade[0].conversations > 0);
  assert.ok(beforeCascade[0].analyses > 0);

  await sql`delete from users where id = ${userAId}`;
  createdDatabaseUserIds.splice(
    createdDatabaseUserIds.indexOf(userAId),
    1,
  );

  const afterCascade = await sql`
    select
      (select count(*)::int from ai_generated_menus where user_id = ${userAId}) as menus,
      (select count(*)::int from chat_conversations where user_id = ${userAId}) as conversations,
      (select count(*)::int from body_analyses where user_id = ${userAId}) as analyses
  `;
  assert.deepEqual(afterCascade[0], {
    menus: 0,
    conversations: 0,
    analyses: 0,
  });
  record("Neon cascade delete", 200);
}

try {
  await run();
  console.log(
    JSON.stringify(
      {
        ok: true,
        apiBaseUrl,
        checks: results,
      },
      null,
      2,
    ),
  );
} finally {
  for (const databaseUserId of createdDatabaseUserIds) {
    await sql`delete from users where id = ${databaseUserId}`.catch(
      () => undefined,
    );
  }

  for (const clerkUserId of createdClerkUserIds) {
    await clerk.users
      .deleteUser(clerkUserId)
      .catch(() => undefined);
  }
}
