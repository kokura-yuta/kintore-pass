// AIチャットへ送る文章をOpenAI Moderation APIで事前検査する場所
import { openai } from "@/app/lib/ai/openAiClient";
import { decideModeration } from "@/app/lib/ai/moderationDecision";

const moderationModel =
  process.env.OPENAI_MODERATION_MODEL?.trim() ||
  "omni-moderation-latest";

// 利用者の質問をModeration APIへ送り、アプリで使う判定へ変換する
export async function checkModeration(
  input: string,
) {
  const response =
    await openai.moderations.create({
      model: moderationModel,
      input,
    });

  const result = response.results[0];

  if (!result) {
    throw new Error(
      "Moderation APIから判定結果を取得できませんでした。",
    );
  }

  return decideModeration(
    result.categories,
  );
}
