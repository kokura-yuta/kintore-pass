// 認証済みユーザーの身体プロフィールをNeonへ保存・取得するAPI
// メールアドレスやユーザーIDが一致するデータを検索する比較機能
import { eq } from "drizzle-orm";

// 認証情報・DB接続・usersとuser_profilesをAPIで使えるようにする場所
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import {
  userProfiles,
  users,
} from "@/db/schema";

// GET通信を受け取り、ログイン中のユーザーの身体プロフィールを取得する場所
export async function GET() {
  // 認証・DB検索で発生した予想外のエラーをまとめて捕まえる
  try {
    // サーバー側で確認されたログイン中のユーザー情報を取得する
    const authenticatedUser =
      await getChatGPTUser();

    // 認証情報がない場合はDBを操作せずHTTP 401を返す
    if (!authenticatedUser) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    // Neon PostgreSQLを操作する共通のDB接続を取得する
    const db = getDb();

    // 認証メールと一致するusersデータからIDだけを最大1件取得する
    const matchedUsers = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(
        eq(
          users.email,
          authenticatedUser.email,
        ),
      )
      .limit(1);

    // 検索結果の先頭を取り出し、対象がなければnullに統一する
    const currentUser =
      matchedUsers[0] ?? null;

    // usersテーブルに対象ユーザーがいなければHTTP 404を返す
    if (!currentUser) {
      return Response.json(
        { error: "ユーザーが見つかりません。" },
        { status: 404 },
      );
    }

    // ログイン中のユーザーIDと一致する身体プロフィールを最大1件取得する
    const matchedProfiles = await db
      .select()
      .from(userProfiles)
      .where(
        eq(
          userProfiles.userId,
          currentUser.id,
        ),
      )
      .limit(1);

    // 検索結果の先頭を取り出し、プロフィール未作成ならnullにする
    const profile =
      matchedProfiles[0] ?? null;

    // プロフィールまたはnullをフロントエンドへJSONで返す
    return Response.json({
      profile,
    });
  } catch (error) {
    // 詳しい原因は利用者へ返さず、開発者向けサーバーログへ残す
    console.error(
      "身体プロフィールの取得に失敗しました。",
      error,
    );

    // フロントエンドへ安全なエラーとHTTP 500を返す
    return Response.json(
      {
        error:
          "身体プロフィールの取得に失敗しました。",
      },
      { status: 500 },
    );
  }
}
