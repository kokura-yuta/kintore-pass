// ClerkユーザーIDを直接外部へ送らず、OpenAI用の匿名IDへ変換する場所
import { createRequestFingerprint } from "@/app/lib/idempotency/createRequestFingerprint";

// ClerkユーザーIDからOpenAIへ渡す匿名IDを作る
export async function createSafetyIdentifier(
  clerkUserId: string,
) {
  return createRequestFingerprint(
    `openai-safety:${clerkUserId}`,
  );
}