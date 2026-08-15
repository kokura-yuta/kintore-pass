// iPhoneアプリから届くClerk認証トークンを検証し、ログイン中のユーザーIDを取得する共通ファイル
// Clerkのバックエンド接続機能を使えるようにする
import { createClerkClient } from "@clerk/backend";

// Clerk環境を識別する公開可能キーをサーバー環境変数から読み取る
const publishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// トークン検証に使う秘密鍵をサーバー環境変数から読み取る
const secretKey =
  process.env.CLERK_SECRET_KEY;

// 必要なClerkキーが1つでも未設定なら認証処理を開始せず停止する
if (!publishableKey || !secretKey) {
  throw new Error(
    "Clerkの環境変数が設定されていません。",
  );
}

// 設定済みのキーを使ってトークン検証を行うClerkクライアントを作る
const clerkClient = createClerkClient({
  publishableKey,
  secretKey,
});

// HTTPリクエストのClerkトークンを検証し、本人のClerkユーザーIDまたはnullを返す
export async function getClerkUserId(
  request: Request,
): Promise<string | null> {
  // リクエスト内のユーザー用セッショントークンをClerkで検証する
  const requestState =
    await clerkClient.authenticateRequest(
      request,
      {
        acceptsToken: "session_token",
      },
    );

  // 未ログイン・期限切れ・不正なトークンならユーザーIDを返さない
  if (!requestState.isAuthenticated) {
    return null;
  }

  // 検証済みの認証情報から固定のClerkユーザーIDを返す
  return requestState.toAuth().userId;
}

// 初回ユーザー登録に必要なメールアドレスや名前をClerkから取得する
export async function getClerkUserDetails(
  clerkUserId: string,
) {
  return clerkClient.users.getUser(
    clerkUserId,
  );
}
