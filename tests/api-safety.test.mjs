import assert from "node:assert/strict";
import test from "node:test";

import {
  chatRequestSchema,
  profileSchema,
  trainingRecordSchema,
  weightRecordCreateSchema,
} from "../app/lib/validation/apiSchemas.ts";
import { bodyAnalysisResultSchema } from "../app/lib/ai/bodyAnalysisSchema.ts";
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
