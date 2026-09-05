import assert from "node:assert/strict";
import test from "node:test";

import {
  chatRequestSchema,
  deleteAccountSchema,
  deleteTrainingRecordSchema,
  goalInputSchema,
  markAiMenuPerformedSchema,
  profileSchema,
  trainingRecordSchema,
  updateTrainingRecordSchema,
  uuidSchema,
  weightRecordCreateSchema,
  weightRecordUpdateSchema,
} from "../app/lib/validation/apiSchemas.ts";
import { bodyAnalysisResultSchema } from "../app/lib/ai/bodyAnalysisSchema.ts";
import {
  aiMenuRequestSchema,
  aiMenuSchema,
} from "../app/lib/ai/menuSchema.ts";
import { chatTools } from "../app/lib/ai/chatTools.ts";
import {
  limitChatAnswer,
  maxChatAnswerCharacters,
  maxChatToolCalls,
} from "../app/lib/ai/config.ts";
import { validateJson } from "../app/lib/validation/jsonValidation.ts";
import { systemPrompt } from "../app/lib/ai/systemPrompt.js";
import { menuPrompt } from "../app/lib/ai/menuPrompt.ts";
import { decideModeration } from "../app/lib/ai/moderationDecision.ts";

const validTrainingRecord = {
  performedAt: "2026-08-30T03:00:00.000Z",
  durationMinutes: 60,
  conditionScore: 8,
  memo: "フォームを確認した",
  exercises: [
    {
      exerciseId: "bench-press",
      exerciseName: "ベンチプレス",
      bodyPart: "胸",
      bodyArea: "上部",
      displayOrder: 0,
      sets: [
        {
          setNumber: 1,
          weightKg: 60,
          reps: 10,
        },
      ],
    },
  ],
};

test("正しいトレーニング記録を受け付ける", () => {
  assert.equal(
    trainingRecordSchema.safeParse(
      validTrainingRecord,
    ).success,
    true,
  );
});

test("種目30件・1種目20セットを超える入力を拒否する", () => {
  const tooManyExercises = {
    ...validTrainingRecord,
    exercises: Array.from(
      { length: 31 },
      () => validTrainingRecord.exercises[0],
    ),
  };

  const tooManySets = {
    ...validTrainingRecord,
    exercises: [
      {
        ...validTrainingRecord.exercises[0],
        sets: Array.from(
          { length: 21 },
          (_, index) => ({
            setNumber: Math.min(index + 1, 20),
            weightKg: 60,
            reps: 10,
          }),
        ),
      },
    ],
  };

  assert.equal(
    trainingRecordSchema.safeParse(
      tooManyExercises,
    ).success,
    false,
  );
  assert.equal(
    trainingRecordSchema.safeParse(
      tooManySets,
    ).success,
    false,
  );
});

test("不正JSONの共通レスポンスはHTTP 400になる", async () => {
  const result = validateJson(
    { message: "", requestId: "invalid" },
    chatRequestSchema,
    "入力内容を確認してください。",
  );

  assert.equal(result.success, false);
  assert.equal(result.response.status, 400);
  assert.deepEqual(
    await result.response.json(),
    { error: "入力内容を確認してください。" },
  );
});

test("プロフィール・日付・文字数の上限を検査する", () => {
  assert.equal(
    profileSchema.safeParse({
      heightCm: 170,
      weightKg: 65,
      weakBodyParts: Array.from(
        { length: 21 },
        () => "胸",
      ),
    }).success,
    false,
  );
  assert.equal(
    weightRecordCreateSchema.safeParse({
      recordedDate: "2999-01-01",
      weightKg: 65,
    }).success,
    false,
  );
  assert.equal(
    weightRecordCreateSchema.safeParse({
      recordedDate: "2026-02-30",
      weightKg: 65,
    }).success,
    false,
  );
  assert.equal(
    chatRequestSchema.safeParse({
      message: "あ".repeat(2001),
      requestId:
        "11111111-1111-4111-8111-111111111111",
    }).success,
    false,
  );
});

test("Python分析結果の範囲外スコアと不正priorityを拒否する", () => {
  const invalidResult = {
    summary: "分析結果",
    goal_difference: "比較結果",
    areas: [
      {
        body_part: "胸",
        score: 11,
        priority: "urgent",
        observation: "観察",
        recommendation: "提案",
      },
    ],
  };

  assert.equal(
    bodyAnalysisResultSchema.safeParse(
      invalidResult,
    ).success,
    false,
  );
});

test("AIプロンプトに診断禁止と痛みへの安全ルールがある", () => {
  for (const prompt of [systemPrompt, menuPrompt]) {
    assert.match(prompt, /診断/);
    assert.match(prompt, /しびれ/);
    assert.match(prompt, /運動を中止|トレーニングを中止/);
    assert.match(prompt, /薬/);
  }
});

const safeModerationCategories = {
  harassment: false,
  "harassment/threatening": false,
  hate: false,
  "hate/threatening": false,
  illicit: false,
  "illicit/violent": false,
  "self-harm": false,
  "self-harm/instructions": false,
  "self-harm/intent": false,
  sexual: false,
  "sexual/minors": false,
  violence: false,
  "violence/graphic": false,
};

test("Moderation結果を安全・自傷支援・遮断へ分ける", () => {
  assert.deepEqual(
    decideModeration(
      safeModerationCategories,
    ),
    { status: "safe" },
  );

  assert.equal(
    decideModeration({
      ...safeModerationCategories,
      "self-harm/intent": true,
    }).status,
    "self_harm_support",
  );

  assert.equal(
    decideModeration({
      ...safeModerationCategories,
      "illicit/violent": true,
    }).status,
    "blocked",
  );
});

test("UUIDが必要な更新・削除入力を検査する", () => {
  const validId =
    "11111111-1111-4111-8111-111111111111";

  assert.equal(uuidSchema.safeParse(validId).success, true);
  assert.equal(uuidSchema.safeParse("not-a-uuid").success, false);
  assert.equal(
    deleteTrainingRecordSchema.safeParse({
      trainingSessionId: validId,
    }).success,
    true,
  );
  assert.equal(
    updateTrainingRecordSchema.safeParse({
      ...validTrainingRecord,
      trainingSessionId: validId,
    }).success,
    true,
  );
});

test("理想体型は用意した4種類だけを受け付ける", () => {
  for (const goalBodyType of [
    "細マッチョ",
    "逆三角形",
    "フィジーク",
    "バルクアップ",
  ]) {
    assert.equal(
      goalInputSchema.safeParse({ goalBodyType }).success,
      true,
    );
  }

  assert.equal(
    goalInputSchema.safeParse({
      goalBodyType: "未定義の体型",
    }).success,
    false,
  );
});

test("プロフィールは身長・体重だけ必須で任意項目は省略できる", () => {
  assert.equal(
    profileSchema.safeParse({
      heightCm: 170,
      weightKg: 65,
    }).success,
    true,
  );
  assert.equal(
    profileSchema.safeParse({ weightKg: 65 }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({ heightCm: 170 }).success,
    false,
  );
});

test("体重記録の保存・更新範囲を検査する", () => {
  const validId =
    "22222222-2222-4222-8222-222222222222";

  assert.equal(
    weightRecordCreateSchema.safeParse({
      recordedDate: "2026-08-30",
      weightKg: 20,
    }).success,
    true,
  );
  assert.equal(
    weightRecordCreateSchema.safeParse({
      recordedDate: "2026-08-30",
      weightKg: 501,
    }).success,
    false,
  );
  assert.equal(
    weightRecordUpdateSchema.safeParse({
      recordId: validId,
      weightKg: 70.5,
    }).success,
    true,
  );
});

test("アカウント削除は確認文字DELETEが完全一致した場合だけ許可する", () => {
  assert.equal(
    deleteAccountSchema.safeParse({
      confirmation: "DELETE",
    }).success,
    true,
  );
  assert.equal(
    deleteAccountSchema.safeParse({
      confirmation: "delete",
    }).success,
    false,
  );
});

test("AIメニュー実施済み更新はメニューIDと記録IDの両方を必要とする", () => {
  assert.equal(
    markAiMenuPerformedSchema.safeParse({
      menuId:
        "33333333-3333-4333-8333-333333333333",
      trainingSessionId:
        "44444444-4444-4444-8444-444444444444",
    }).success,
    true,
  );
  assert.equal(
    markAiMenuPerformedSchema.safeParse({
      menuId:
        "33333333-3333-4333-8333-333333333333",
    }).success,
    false,
  );
});

test("AIメニュー生成条件の調子・メモ・部位を検査する", () => {
  const validRequestId =
    "55555555-5555-4555-8555-555555555555";

  assert.equal(
    aiMenuRequestSchema.safeParse({
      requestId: validRequestId,
      conditionScore: 7,
      note: "今日は60分できます",
      requestedBodyPart: "胸",
    }).success,
    true,
  );
  assert.equal(
    aiMenuRequestSchema.safeParse({
      requestId: validRequestId,
      conditionScore: 11,
    }).success,
    false,
  );
  assert.equal(
    aiMenuRequestSchema.safeParse({
      requestId: validRequestId,
      requestedBodyPart: "首",
    }).success,
    false,
  );
});

test("OpenAIのAIメニュー回答が決めたJSON形式か検査する", () => {
  const validMenu = {
    recommendedBodyPart: "胸",
    reason: "最近の記録を参考にしたため",
    estimatedMinutes: 45,
    exercises: [
      {
        exerciseName: "ベンチプレス",
        bodyPart: "胸",
        bodyArea: "中部",
        targetWeightKg: 60,
        targetReps: "8〜10回",
        sets: 3,
        restSeconds: 120,
        note: "無理のない重量で行う",
      },
    ],
    advice: ["痛みが出た場合は中止してください"],
  };

  assert.equal(aiMenuSchema.safeParse(validMenu).success, true);
  assert.equal(
    aiMenuSchema.safeParse({
      ...validMenu,
      exercises: [],
    }).success,
    false,
  );
});

test("AIチャットToolは本人データ取得用の5種類だけを公開する", () => {
  assert.deepEqual(
    chatTools.map((tool) => tool.name),
    [
      "get_user_profile",
      "get_latest_body_analysis",
      "get_recent_training_records",
      "get_latest_ai_menu",
      "get_weight_history",
    ],
  );

  for (const tool of chatTools) {
    assert.equal(tool.strict, true);
    assert.equal(
      tool.parameters.additionalProperties,
      false,
    );
  }
});

test("AIチャットのTool回数と回答文字数に上限がある", () => {
  assert.ok(maxChatToolCalls >= 1 && maxChatToolCalls <= 5);

  const limited = limitChatAnswer(
    "あ".repeat(maxChatAnswerCharacters + 100),
  );
  assert.equal(limited.length, maxChatAnswerCharacters);
  assert.match(limited, /…$/);
});
