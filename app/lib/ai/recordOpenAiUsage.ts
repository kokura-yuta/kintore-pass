// OpenAIの使用量を、本文を保存せずユーザー別にNeonへ記録するファイル
import { getDb } from "@/db";
import { openAiUsageRecords } from "@/db/schema";
import {
  logOpenAiUsage,
  logServerError,
} from "@/app/lib/observability/serverLog";

type OpenAiUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
};

type UsageFeature =
  | "chat"
  | "menu"
  | "body-analysis"
  | "summary";

// 月別集計に必要な数値だけを保存し、質問・回答・身体情報は記録しない
export async function recordOpenAiUsage({
  userId,
  feature,
  model,
  requestId,
  usage,
}: {
  userId: string;
  feature: UsageFeature;
  model: string;
  requestId: string;
  usage: OpenAiUsage | null | undefined;
}) {
  logOpenAiUsage(
    feature,
    usage,
    requestId,
    { userId, model },
  );

  if (!usage) return;

  try {
    await getDb()
      .insert(openAiUsageRecords)
      .values({
        userId,
        feature,
        model,
        requestId,
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0,
      });
  } catch (error) {
    // 使用量記録の失敗で、利用者へのAI回答まで失敗させない
    logServerError(
      "openai_usage_db_write_failed",
      error,
      requestId,
    );
  }
}
