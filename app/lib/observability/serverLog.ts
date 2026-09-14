// APIの動作状況を、身体情報や秘密情報を含めず安全に記録する共通ファイル
type OpenAiUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
};

type ErrorWithCode = {
  name?: unknown;
  code?: unknown;
};

const safeCodePattern = /^[A-Za-z0-9_-]{1,64}$/;

// 受け取ったIDがログ追跡用として安全な文字列か確認する
export function isValidRequestId(
  value: string | null,
) {
  return Boolean(
    value &&
      value.length >= 8 &&
      value.length <= 64 &&
      safeCodePattern.test(value),
  );
}

// フロントの安全なIDは引き継ぎ、不正または未設定なら新しいIDを作る
export function resolveRequestId(
  request: Request,
) {
  const receivedRequestId =
    request.headers.get("x-request-id");

  return isValidRequestId(receivedRequestId)
    ? receivedRequestId!
    : crypto.randomUUID();
}

// エラー本文やstackは記録せず、分類に必要な名前と安全なcodeだけを残す
export function logServerError(
  event: string,
  error: unknown,
  requestId?: string,
) {
  const errorData =
    error && typeof error === "object"
      ? (error as ErrorWithCode)
      : null;

  const errorName =
    typeof errorData?.name === "string" &&
    safeCodePattern.test(errorData.name)
      ? errorData.name
      : "UnknownError";

  const errorCode =
    typeof errorData?.code === "string" &&
    safeCodePattern.test(errorData.code)
      ? errorData.code
      : undefined;

  console.error(
    JSON.stringify({
      level: "error",
      event,
      requestId,
      errorName,
      errorCode,
    }),
  );
}

// OpenAIの質問内容や回答本文を残さず、使用トークン数だけを記録する
export function logOpenAiUsage(
  feature: "chat" | "menu",
  usage: OpenAiUsage | null | undefined,
  requestId?: string,
) {
  if (!usage) return;

  console.info(
    JSON.stringify({
      level: "info",
      event: "openai_usage",
      feature,
      requestId,
      inputTokens:
        usage.input_tokens ?? 0,
      outputTokens:
        usage.output_tokens ?? 0,
      totalTokens:
        usage.total_tokens ?? 0,
    }),
  );
}
