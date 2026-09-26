import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  isValidRequestId,
  logOpenAiUsage,
  logServerError,
  resolveRequestId,
} from "../app/lib/observability/serverLog.ts";
import { getAuthenticationMode } from "../app/lib/config/runtimeStatus.ts";

const projectRoot = process.cwd();

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(entryPath));
      continue;
    }

    if (/\.(?:js|jsx|ts|tsx|json)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

test("端末へ配るmobileコードにサーバー秘密情報を含めない", async () => {
  const mobileFiles = [
    ...await collectSourceFiles(
      path.join(projectRoot, "mobile", "src"),
    ),
    path.join(projectRoot, "mobile", "app.json"),
  ];

  const forbiddenPatterns = [
    /CLERK_SECRET_KEY/,
    /DATABASE_URL/,
    /OPENAI_API_KEY/,
    /ADMIN_CLERK_USER_IDS/,
    /APPLE_(?:ISSUER_ID|KEY_ID|PRIVATE_KEY)/,
    /APP_STORE_(?:ISSUER_ID|KEY_ID|PRIVATE_KEY)/,
    /postgres(?:ql)?:\/\//i,
    /\bsk-[A-Za-z0-9_-]{16,}/,
  ];

  for (const filePath of mobileFiles) {
    const source = await readFile(filePath, "utf8");

    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(
        source,
        pattern,
        `${path.relative(projectRoot, filePath)}に秘密情報の可能性があります`,
      );
    }
  }
});

test("環境変数ファイルをGitの対象外にする", async () => {
  const gitignore = await readFile(
    path.join(projectRoot, ".gitignore"),
    "utf8",
  );

  assert.match(gitignore, /^\.env\*$/m);
});

test("サーバーログへ画像・認証情報の変数を直接渡さない", async () => {
  const serverFiles = await collectSourceFiles(
    path.join(projectRoot, "app"),
  );
  const sensitiveLogPattern =
    /console\.(?:log|error|warn)\([\s\S]{0,260}\b(?:requestFormData|frontImage|sideImage|backImage|clerkUserId|token|password|apiKey)\b/;

  for (const filePath of serverFiles) {
    const source = await readFile(filePath, "utf8");
    assert.doesNotMatch(
      source,
      sensitiveLogPattern,
      `${path.relative(projectRoot, filePath)}で秘密情報をログへ渡している可能性があります`,
    );
  }
});

test("APIの追跡IDは安全な値だけを引き継ぐ", () => {
  const requestId =
    "request_12345678";
  const request = new Request(
    "https://example.com/api/health",
    {
      headers: {
        "x-request-id": requestId,
      },
    },
  );

  assert.equal(isValidRequestId(requestId), true);
  assert.equal(resolveRequestId(request), requestId);
  assert.equal(isValidRequestId("bad id"), false);
  assert.match(
    resolveRequestId(
      new Request("https://example.com/api/health"),
    ),
    /^[0-9a-f-]{36}$/,
  );
});

test("サーバーエラーログとOpenAI利用ログに本文や秘密値を残さない", () => {
  const writtenLogs = [];
  const originalError = console.error;
  const originalInfo = console.info;

  console.error = (value) => writtenLogs.push(String(value));
  console.info = (value) => writtenLogs.push(String(value));

  try {
    logServerError(
      "test_error",
      new Error("sk-secret 身体情報 写真本文"),
      "request_12345678",
    );
    logOpenAiUsage(
      "chat",
      {
        input_tokens: 100,
        output_tokens: 20,
        total_tokens: 120,
      },
      "request_12345678",
    );
    logOpenAiUsage(
      "other",
      {
        input_tokens: 10,
        output_tokens: 5,
        total_tokens: 15,
      },
      "request_other_12345678",
    );
  } finally {
    console.error = originalError;
    console.info = originalInfo;
  }

  const combinedLogs = writtenLogs.join("\n");
  assert.doesNotMatch(combinedLogs, /sk-secret/);
  assert.doesNotMatch(combinedLogs, /身体情報/);
  assert.doesNotMatch(combinedLogs, /写真本文/);
  assert.match(combinedLogs, /request_12345678/);
  assert.match(combinedLogs, /"totalTokens":120/);
  assert.match(combinedLogs, /"feature":"other"/);
});

test("運営ダッシュボードはDB集計前に管理者権限を確認する", async () => {
  const adminRoute = await readFile(
    path.join(
      projectRoot,
      "app/api/admin/dashboard/route.ts",
    ),
    "utf8",
  );
  const adminGuard = await readFile(
    path.join(
      projectRoot,
      "app/lib/admin/requireAdmin.ts",
    ),
    "utf8",
  );

  assert.match(adminRoute, /getAdminIdentity\(request\)/);
  assert.match(adminRoute, /if \(!admin\.allowed\)/);
  assert.ok(
    adminRoute.indexOf("if (!admin.allowed)") <
      adminRoute.indexOf("const db = getDb()"),
    "管理者確認はDB集計より前に実行する必要があります",
  );
  assert.match(adminGuard, /ADMIN_CLERK_USER_IDS/);
  assert.match(adminGuard, /status: 401/);
  assert.match(adminGuard, /status: 403/);
});

test("Expoの管理画面入口もサーバー側の管理者判定を使う", async () => {
  const accessRoute = await readFile(
    path.join(
      projectRoot,
      "app/api/admin/access/route.ts",
    ),
    "utf8",
  );
  const mobileAdminApi = await readFile(
    path.join(
      projectRoot,
      "mobile/src/lib/admin.ts",
    ),
    "utf8",
  );

  assert.match(accessRoute, /getAdminIdentity\(request\)/);
  assert.match(accessRoute, /status: admin\.status/);
  assert.match(mobileAdminApi, /Authorization|apiRequest/);
  assert.doesNotMatch(mobileAdminApi, /ADMIN_CLERK_USER_IDS/);
});

test("Clerkの開発用キーと本番用キーを値を見せず判定する", () => {
  assert.equal(
    getAuthenticationMode({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
      CLERK_SECRET_KEY: "sk_test_example",
    }),
    "development",
  );
  assert.equal(
    getAuthenticationMode({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_example",
      CLERK_SECRET_KEY: "sk_live_example",
    }),
    "production",
  );
  assert.equal(
    getAuthenticationMode({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_example",
      CLERK_SECRET_KEY: "sk_test_example",
    }),
    "mixed",
  );
});

test("アカウント削除は本人再確認と確認文字を必須にする", async () => {
  const accountRoute = await readFile(
    path.join(
      projectRoot,
      "app/api/users/account/route.ts",
    ),
    "utf8",
  );
  const accountScreen = await readFile(
    path.join(
      projectRoot,
      "mobile/src/app/my-page.tsx",
    ),
    "utf8",
  );

  assert.match(
    accountRoute,
    /reverification:\s*["']strict["']/,
  );
  assert.match(
    accountRoute,
    /deleteAccountSchema\.safeParse/,
  );
  assert.match(accountRoute, /users\.clerkUserId/);
  assert.match(accountScreen, /useReverification/);
  assert.match(accountScreen, /deleteConfirmation\s*!==\s*["']DELETE["']/);
});

test("AIチャットの短い要約へ食事情報を含める", async () => {
  const summarySource = await readFile(
    path.join(
      projectRoot,
      "app/lib/ai/chatSummary.ts",
    ),
    "utf8",
  );

  assert.match(summarySource, /recentFoodRecords/);
  assert.match(summarySource, /calories/);
  assert.match(summarySource, /たんぱく質/);
});

test("AI APIはサーバー側の利用権確認後だけAI処理へ進む", async () => {
  for (const relativePath of [
    "app/api/chat/route.ts",
    "app/api/ai-menu/route.ts",
    "app/api/body-analysis/route.ts",
  ]) {
    const source = await readFile(
      path.join(projectRoot, relativePath),
      "utf8",
    );
    assert.match(source, /getClerkUserId\(request\)/);
    assert.match(source, /getAppAccess\(/);
    assert.match(source, /premiumRequiredResponse\(/);
  }

  const chatSource = await readFile(
    path.join(projectRoot, "app/api/chat/route.ts"),
    "utf8",
  );
  assert.ok(
    chatSource.indexOf("getAppAccess(user.id)") <
      chatSource.indexOf("checkModeration(message)"),
    "無料ユーザーへModeration料金を発生させない必要があります",
  );
  assert.ok(
    chatSource.indexOf("checkModeration(message)") <
      chatSource.indexOf("openai.responses.create"),
    "回答生成前に安全確認する必要があります",
  );
});

test("Freeの基本記録APIにはPremium判定を置かない", async () => {
  for (const relativePath of [
    "app/api/training-records/route.ts",
    "app/api/weight-records/route.ts",
    "app/api/food-records/route.ts",
    "app/api/users/profile/route.ts",
    "app/api/users/goal/route.ts",
  ]) {
    const source = await readFile(
      path.join(projectRoot, relativePath),
      "utf8",
    );
    assert.doesNotMatch(source, /get(?:Paid|Ai)FeatureBlockResponse/);
  }
});

test("無料体験は本人操作かつ未使用アカウントだけ開始できる", async () => {
  const source = await readFile(
    path.join(
      projectRoot,
      "app/api/subscription/trial/route.ts",
    ),
    "utf8",
  );
  assert.match(source, /getClerkUserId\(request\)/);
  assert.match(source, /eq\(users\.trialUsed, false\)/);
  assert.match(source, /trialUsed: true/);
  assert.match(source, /trialChoiceCompleted: true/);
});

test("Python身体分析APIはTypeScriptバックエンドの内部秘密鍵を必須にする", async () => {
  const pythonSource = await readFile(
    path.join(
      projectRoot,
      "python-analysis/app/main.py",
    ),
    "utf8",
  );
  const bodyAnalysisRoute = await readFile(
    path.join(
      projectRoot,
      "app/api/body-analysis/route.ts",
    ),
    "utf8",
  );

  assert.match(
    pythonSource,
    /Depends\(\s*require_internal_api_key/,
  );
  assert.match(
    pythonSource,
    /hmac\.compare_digest/,
  );
  assert.match(
    bodyAnalysisRoute,
    /"X-Internal-API-Key"/,
  );
  assert.match(
    bodyAnalysisRoute,
    /PYTHON_INTERNAL_API_KEY/,
  );
});

test("身体写真はDBへ保存せずPython処理後に一時ファイルを閉じる", async () => {
  const pythonSource = await readFile(
    path.join(
      projectRoot,
      "python-analysis/app/main.py",
    ),
    "utf8",
  );
  const schemaSource = await readFile(
    path.join(projectRoot, "db/schema.ts"),
    "utf8",
  );

  assert.match(pythonSource, /store=False/);
  assert.match(
    pythonSource,
    /await front_image\.close\(\)/,
  );
  assert.match(
    pythonSource,
    /await side_image\.close\(\)/,
  );
  assert.match(
    pythonSource,
    /await back_image\.close\(\)/,
  );

  const bodyAnalysisSchema = schemaSource.slice(
    schemaSource.indexOf(
      "export const bodyAnalyses",
    ),
    schemaSource.indexOf(
      "export const bodyAnalysisAreas",
    ),
  );
  assert.doesNotMatch(
    bodyAnalysisSchema,
    /image|photo|url/i,
  );
});
