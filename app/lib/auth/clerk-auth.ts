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

// Clerkトークンを検証し、本人確認の詳しい認証情報を返す
export async function getClerkSessionAuth(
  request: Request,
) {
  const requestState =
    await clerkClient.authenticateRequest(
      request,
      {
        acceptsToken: "session_token",
      },
    );

  if (!requestState.isAuthenticated) {
    return null;
  }

  return requestState.toAuth();
}

// HTTPリクエストのClerkトークンを検証し、本人のClerkユーザーIDまたはnullを返す
export async function getClerkUserId(
  request: Request,
): Promise<string | null> {
  // 共通認証処理からログイン中の本人情報を取得する
  const auth =
    await getClerkSessionAuth(request);

  // 未認証ならnull、認証済みならClerkユーザーIDを返す
  return auth?.userId ?? null;
}

// 初回ユーザー登録に必要なメールアドレスや名前をClerkから取得する
export async function getClerkUserDetails(
  clerkUserId: string,
) {
  return clerkClient.users.getUser(
    clerkUserId,
  );
}

// 認証済みのClerkユーザーアカウントを削除する
export async function deleteClerkUser(
  clerkUserId: string,
) {
  return clerkClient.users.deleteUser(
    clerkUserId,
  );
}
