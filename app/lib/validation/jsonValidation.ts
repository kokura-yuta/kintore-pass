// Zod検査に失敗したJSONへ、API共通のHTTP 400レスポンスを作る
import type { ZodType } from "zod";

export function validateJson<T>(
  value: unknown,
  schema: ZodType<T>,
  errorMessage: string,
) {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    return {
      success: false as const,
      response: Response.json(
        { error: errorMessage },
        { status: 400 },
      ),
    };
  }

  return {
    success: true as const,
    data: parsed.data,
  };
}
