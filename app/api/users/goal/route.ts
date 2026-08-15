// TypeScriptで認証済みユーザーが選んだ理想体型をNeon PostgreSQLへ保存するAPI
// 検証済みのClerkユーザーIDと一致するユーザーだけを更新する比較機能
import { eq } from "drizzle-orm";

// 認証情報・DB接続・usersテーブルを理想体型の保存処理で使えるようにする場所
import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";

// DBへの保存を許可する理想体型だけをまとめた一覧
const allowedGoalBodyTypes = [
  "細マッチョ",
  "逆三角形",
  "フィジーク",
  "バルクアップ",
];

// PATCH通信を受け取り、登録済みユーザーの理想体型を変更する場所
export async function PATCH(request: Request) {
  // 認証・JSON読取・DB更新で発生するエラーをまとめて捕まえる
  try {
    // リクエストのClerkトークンを検証してログイン中のユーザーIDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // ClerkユーザーIDを取得できなければDBを操作せずHTTP 401を返す
    if (!clerkUserId) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    // フロントエンドから送られたJSONを読み、壊れていればnullにする
    const body = await request
      .json()
      .catch(() => null);

    const goalBodyType = body?.goalBodyType;

    // 文字列かつ許可された4種類でなければHTTP 400を返す
    if (
      typeof goalBodyType !== "string" ||
      !allowedGoalBodyTypes.includes(goalBodyType)
    ) {
      return Response.json(
        {
          error:
            "正しい理想体型を選択してください。",
        },
        { status: 400 },
      );
    }

    // Neon PostgreSQLを操作する共通のDB接続を取得する
    const db = getDb();

    // ClerkユーザーIDが一致する本人だけの理想体型と更新日時を変更する
    const updatedUsers = await db
      .update(users)
      .set({
        goalBodyType,
        updatedAt: new Date(),
      })
      .where(
        eq(
          users.clerkUserId,
          clerkUserId,
        ),
      )
      .returning();

    // 更新結果の先頭を取り出し、対象がなければnullに統一する
    const updatedUser = updatedUsers[0] ?? null;

    // Neonに対象ユーザーがいなければHTTP 404を返す
    if (!updatedUser) {
      return Response.json(
        {
          error:
            "ユーザーが見つかりません。",
        },
        { status: 404 },
      );
    }

    // 更新後のユーザー情報をフロントエンドへJSONで返す
    return Response.json({
      user: updatedUser,
    });
  } catch (error) {
    // 詳しい原因は利用者へ見せず、開発者向けサーバーログへ残す
    console.error(
      "理想体型の保存に失敗しました。",
      error,
    );

    // フロントエンドへ安全なエラーメッセージとHTTP 500を返す
    return Response.json(
      {
        error:
          "理想体型の保存に失敗しました。",
      },
      { status: 500 },
    );
  }
}
