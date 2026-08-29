// OpenAIが生成する今日のトレーニングメニューのデータ形式を決める場所
// TypeScript上でデータ形式を定義・検証するZodを読み込む
import { z } from "zod";

// フロントから任意で受け取る今日の調子と補足情報を検証する
export const aiMenuRequestSchema = z.object({
  requestId: z.string().uuid(),
  conditionScore: z
    .number()
    .int()
    .min(1)
    .max(10)
    .nullable()
    .optional(),
  note: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional(),
  requestedBodyPart: z
    .enum(["胸", "背中", "肩", "腕", "脚", "腹筋"])
    .nullable()
    .optional(),
});

// AIが返す1種目分のデータ形式を決める
const aiMenuExerciseSchema = z.object({
  exerciseName: z.string().trim().min(1).max(100),
  bodyPart: z.string().trim().min(1).max(50),
  bodyArea: z.string().nullable(),
  targetWeightKg: z.number().min(0).max(1000).nullable(),
  targetReps: z.string().trim().min(1).max(50),
  sets: z.number().int().min(1).max(20),
  restSeconds: z.number().int().min(0).max(900),
  note: z.string().trim().max(500),
});

// AIが返す今日のメニュー全体のデータ形式を決める
export const aiMenuSchema = z.object({
  recommendedBodyPart: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(1).max(1000),
  estimatedMinutes: z.number().int().min(5).max(300),
  exercises: z
    .array(aiMenuExerciseSchema)
    .min(1)
    .max(20),
  advice: z
    .array(z.string().trim().min(1).max(500))
    .min(1)
    .max(10),
});

// Zodの設計図からTypeScriptの型を自動作成する
export type AiMenu = z.infer<
  typeof aiMenuSchema
>;

// フロントから届くAIメニュー生成条件のTypeScript型を自動作成する
export type AiMenuRequest = z.infer<
  typeof aiMenuRequestSchema
>;
