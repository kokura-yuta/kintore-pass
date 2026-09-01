// フロントから届くJSONを、APIで共通のルールに沿って検査する設計図
import { z } from "zod";

export const uuidSchema = z.string().trim().uuid();

const optionalNumber = (
  minimum: number,
  maximum: number,
) =>
  z
    .number()
    .finite()
    .min(minimum)
    .max(maximum)
    .nullable()
    .optional();

const optionalInteger = (
  minimum: number,
  maximum: number,
) =>
  z
    .number()
    .int()
    .min(minimum)
    .max(maximum)
    .nullable()
    .optional();

// YYYY-MM-DD形式で、実際に存在する日付だけを許可する
export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsedDate = new Date(
      `${value}T00:00:00.000Z`,
    );

    return (
      !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) ===
        value
    );
  }, "実在する日付を入力してください。")
  .refine((value) => {
    const japanNow = new Date(
      Date.now() + 9 * 60 * 60 * 1000,
    );
    const japanToday = [
      japanNow.getUTCFullYear(),
      String(
        japanNow.getUTCMonth() + 1,
      ).padStart(2, "0"),
      String(japanNow.getUTCDate()).padStart(
        2,
        "0",
      ),
    ].join("-");

    return value <= japanToday;
  }, "未来の日付は保存できません。");

const trainingSetSchema = z.object({
  setNumber: z.number().int().min(1).max(20),
  weightKg: optionalNumber(0, 1000),
  reps: optionalInteger(0, 1000),
});

const trainingExerciseSchema = z.object({
  exerciseId: z.string().trim().min(1).max(100),
  exerciseName: z.string().trim().min(1).max(100),
  bodyPart: z.string().trim().min(1).max(50),
  bodyArea: z
    .string()
    .trim()
    .max(50)
    .nullable()
    .optional(),
  displayOrder: z.number().int().min(0).max(29),
  sets: z.array(trainingSetSchema).min(1).max(20),
});

export const trainingRecordSchema = z.object({
  performedAt: z
    .string()
    .refine(
      (value) =>
        !Number.isNaN(new Date(value).getTime()),
      "正しい日時を入力してください。",
    )
    .refine(
      (value) =>
        new Date(value).getTime() <=
        Date.now() + 5 * 60 * 1000,
      "未来のトレーニング記録は保存できません。",
    )
    .optional(),
  durationMinutes: optionalInteger(1, 600),
  conditionScore: optionalInteger(1, 10),
  memo: z.string().trim().max(1000).nullable().optional(),
  exercises: z
    .array(trainingExerciseSchema)
    .min(1)
    .max(30),
});

export const updateTrainingRecordSchema =
  trainingRecordSchema.extend({
    trainingSessionId: uuidSchema,
  });

export const deleteTrainingRecordSchema = z.object({
  trainingSessionId: uuidSchema,
});

export const chatRequestSchema = z.object({
  conversationId: uuidSchema.nullable().optional(),
  message: z.string().trim().min(1).max(2000),
  requestId: uuidSchema,
});

export const deleteChatSchema = z.object({
  conversationId: uuidSchema,
});

export const profileSchema = z.object({
  heightCm: z.number().finite().min(50).max(250),
  weightKg: z.number().finite().min(20).max(500),
  bodyFatPercentage: optionalNumber(0, 80),
  weeklyTrainingDays: optionalInteger(0, 7),
  availableMinutes: optionalInteger(20, 180),
  trainingLocation: z
    .enum(["home", "gym", "both"])
    .nullable()
    .optional(),
  weakBodyParts: z
    .array(z.string().trim().min(1).max(50))
    .max(20)
    .nullable()
    .optional(),
});

export const goalBodyTypeSchema = z.enum([
  "細マッチョ",
  "逆三角形",
  "フィジーク",
  "バルクアップ",
]);

export const goalInputSchema = z.object({
  goalBodyType: goalBodyTypeSchema,
});

export const weightRecordCreateSchema = z.object({
  recordedDate: calendarDateSchema,
  weightKg: z.number().finite().min(20).max(500),
});

export const weightRecordUpdateSchema = z.object({
  recordId: uuidSchema,
  weightKg: z.number().finite().min(20).max(500),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export const markAiMenuPerformedSchema = z.object({
  menuId: uuidSchema,
  trainingSessionId: uuidSchema,
});

export type TrainingRecordInput = z.infer<
  typeof trainingRecordSchema
>;
