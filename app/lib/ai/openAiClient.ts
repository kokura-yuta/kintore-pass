// AIチャットとAIメニューが共通で使うOpenAI接続設定
import OpenAI from "openai";

function readPositiveInteger(
  value: string | undefined,
  fallback: number,
) {
  const parsedValue = Number.parseInt(
    value ?? "",
    10,
  );

  return Number.isInteger(parsedValue) &&
    parsedValue > 0
    ? parsedValue
    : fallback;
}

function readNonNegativeInteger(
  value: string | undefined,
  fallback: number,
) {
  const parsedValue = Number.parseInt(
    value ?? "",
    10,
  );

  return Number.isInteger(parsedValue) &&
    parsedValue >= 0
    ? parsedValue
    : fallback;
}

const openAiTimeoutMilliseconds =
  readPositiveInteger(
    process.env.OPENAI_TIMEOUT_MS,
    60_000,
  );

const openAiMaxRetries =
  readNonNegativeInteger(
    process.env.OPENAI_MAX_RETRIES,
    1,
  );

// タイムアウトと再試行回数を統一したOpenAIクライアントを1つ作る
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: openAiTimeoutMilliseconds,
  maxRetries: openAiMaxRetries,
});
