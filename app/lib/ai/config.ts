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
  "gpt-5.6-luna";

export const maxChatToolCalls =
  readPositiveInteger(
    "OPENAI_CHAT_MAX_TOOL_CALLS",
    3,
    5,
  );

export const maxChatOutputTokens =
  readPositiveInteger(
    "OPENAI_CHAT_MAX_OUTPUT_TOKENS",
    600,
    1200,
  );

export const maxMenuOutputTokens =
  readPositiveInteger(
    "OPENAI_MENU_MAX_OUTPUT_TOKENS",
    1800,
    4000,
  );

export const maxChatAnswerCharacters =
  readPositiveInteger(
    "AI_CHAT_MAX_ANSWER_CHARACTERS",
    400,
    800,
  );

// OpenAIへ渡す通常会話は直近5往復（利用者5件＋AI5件）までにする
export const recentChatMessageLimit = 10;

// 古い会話をまとめたDB要約が大きくなり続けないよう上限を決める
export const maxChatSummaryCharacters = 800;

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
