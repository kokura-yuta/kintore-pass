// OpenAIで使うモデル名・回答上限・Tool上限を環境変数から安全に読み込む
function readPositiveInteger(
  name: string,
  fallback: number,
  maximum: number,
) {
  const parsed = Number.parseInt(
    process.env[name] ?? "",
    10,
  );

  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

export const openAiChatModel =
  process.env.OPENAI_CHAT_MODEL?.trim() ||
  "gpt-5.6-luna";

export const openAiMenuModel =
  process.env.OPENAI_MENU_MODEL?.trim() ||
  openAiChatModel;

export const maxChatToolCalls =
  readPositiveInteger(
    "OPENAI_CHAT_MAX_TOOL_CALLS",
    3,
    5,
  );

export const maxChatOutputTokens =
  readPositiveInteger(
    "OPENAI_CHAT_MAX_OUTPUT_TOKENS",
    3000,
    8000,
  );

export const maxMenuOutputTokens =
  readPositiveInteger(
    "OPENAI_MENU_MAX_OUTPUT_TOKENS",
    4000,
    8000,
  );

export const maxChatAnswerCharacters =
  readPositiveInteger(
    "AI_CHAT_MAX_ANSWER_CHARACTERS",
    4000,
    8000,
  );

// DBとフロントへ保存する前に長すぎるAI回答を切り詰める
export function limitChatAnswer(
  answer: string,
) {
  if (
    answer.length <= maxChatAnswerCharacters
  ) {
    return answer;
  }

  return `${answer.slice(
    0,
    maxChatAnswerCharacters - 1,
  )}…`;
}
