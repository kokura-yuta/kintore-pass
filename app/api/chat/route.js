import OpenAI from "openai";
import { systemPrompt } from "../../lib/ai/systemPrompt";

// 環境変数のAPIキーを使ってOpenAIと通信する準備をする場所
const openai = new OpenAI();

// フロントエンドから送られたPOSTリクエストを受け取る場所
export async function POST(request) {
  const body = await request.json();

  // 利用者データから目標体型を安全に読み取る場所
  const goalBodyType =
    body.userData?.goalBodyType ?? "未設定";

  // システムプロンプト・目標体型・質問をOpenAIへ送り、回答を作る場所
  const aiResponse = await openai.responses.create({
    model: "gpt-5.6-luna",
    instructions: `${systemPrompt}

# 今回の利用者データ

目標体型：${goalBodyType}`,
    input: body.message,
  });

  // OpenAIが作った回答文をJSONにしてフロントエンドへ返す場所
  return Response.json({
    reply: aiResponse.output_text,
  });
}
