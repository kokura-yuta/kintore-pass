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

test("AIチャットへ食事Toolの使用条件を明示する", async () => {
  const prompt = await readFile(
    path.join(
      projectRoot,
      "app/lib/ai/systemPrompt.js",
    ),
    "utf8",
  );

  assert.match(prompt, /get_recent_food_records/);
  assert.match(prompt, /摂取カロリー/);
  assert.match(prompt, /たんぱく質/);
});
