// 認証済みユーザーをNeonへ登録または取得し、初回設定の状態を返すAPI
// usersテーブルから同じメールアドレスを検索する比較機能
import { eq } from "drizzle-orm";

// 認証情報・DB接続・usersテーブルを初期化処理で使えるようにする場所
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";

// POST通信を受け取り、ユーザー初期化処理を開始する場所
export async function POST() {
  // 認証・DB検索・新規登録で発生したエラーをまとめて捕まえる
  try {
    // サーバー側で確認されたログイン中のユーザー情報を取得する
    const authenticatedUser = await getChatGPTUser();

    // 認証情報がない場合はDBを操作せず401エラーを返す
    if (!authenticatedUser) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    // Neon PostgreSQLを操作する共通のDB接続を取得する
    const db = getDb();

    // ログイン中のメールアドレスと一致するユーザーを最大1件検索する
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, authenticatedUser.email))
      .limit(1);

    // 検索結果の先頭を取り出し、未登録ならnullに統一する
    const existingUser = existingUsers[0] ?? null;

    // 登録済みなら現在のユーザー情報を返して初期化処理を終了する
    if (existingUser) {
      return Response.json({
        user: existingUser,
        isNewUser: false,
      });
    }

    // 未登録なら認証情報を使ってusersテーブルへ新規登録する
    const createdUsers = await db
      .insert(users)
      .values({
        email: authenticatedUser.email,
        displayName: authenticatedUser.displayName,
      })
      .returning();

    // PostgreSQLから配列で返された新規ユーザーを取り出す
    const createdUser = createdUsers[0];

    // 作成したユーザー情報と新規登録であることをHTTP 201で返す
    return Response.json(
      {
        user: createdUser,
        isNewUser: true,
      },
      { status: 201 },
    );
  } catch (error) {
    // 詳しい原因は利用者へ返さず、開発者が確認するサーバーログへ残す
    console.error(
      "ユーザー初期化に失敗しました。",
      error,
    );

    // フロントエンドへ安全なメッセージとHTTP 500を返す
    return Response.json(
      {
        error:
          "ユーザー情報の初期化に失敗しました。",
      },
      { status: 500 },
    );
  }
}
