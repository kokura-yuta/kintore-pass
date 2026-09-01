// Python画像分析APIから返るJSONをTypeScript側でも再検査する設計図
import { z } from "zod";

export const bodyAnalysisResultSchema = z
  .object({
    summary: z.string().trim().min(1).max(2000),
    goal_difference: z
      .string()
      .trim()
      .min(1)
      .max(2000),
    areas: z
      .array(
        z.object({
          body_part: z
            .string()
            .trim()
            .min(1)
            .max(50),
          score: z.number().int().min(1).max(10),
          priority: z.enum([
            "high",
            "medium",
            "low",
          ]),
          observation: z
            .string()
            .trim()
            .min(1)
            .max(1000),
          recommendation: z
            .string()
            .trim()
            .min(1)
            .max(1000),
        }),
      )
      .min(1)
      .max(20),
  });

export type BodyAnalysisResult = z.infer<
  typeof bodyAnalysisResultSchema
>;
