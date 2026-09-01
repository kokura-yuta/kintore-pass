// TypeScriptで認証済みユーザーが選んだ理想体型をNeon PostgreSQLへ保存するAPI
// 検証済みのClerkユーザーIDと一致するユーザーだけを更新する比較機能
import { eq } from "drizzle-orm";

// 認証情報・DB接続・usersテーブルを理想体型の保存処理で使えるようにする場所
import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { goalInputSchema } from "@/app/lib/validation/apiSchemas";

// GET通信を受け取り、ログイン中の本人が設定した理想体型を取得する
export async function GET(
  request: Request,
) {
  // 認証・DB検索中に発生したエラーをまとめて捕まえる
  try {
    // リクエストのClerk認証情報からログイン中のユーザーIDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // ログインを確認できなければNeonを操作せず401を返す
    if (!clerkUserId) {
      return Response.json(
        {
          error: "ログインが必要です。",
        },
        {
          status: 401,
        },
      );
    }

    // 保存済みの理想体型を取得するためにNeonへの接続を取得する
    const db = getDb();

    // ClerkユーザーIDが一致する本人の理想体型を最大1件取得する
    const matchedUsers = await db
      .select({
        userId: users.id,
        goalBodyType:
          users.goalBodyType,
      })
      .from(users)
      .where(
        eq(
          users.clerkUserId,
          clerkUserId,
        ),
      )
      .limit(1);

    // 検索結果の先頭を取り出し、見つからなければnullにする
    const user =
      matchedUsers[0] ?? null;

    // Neonに本人が登録されていなければ404を返す
    if (!user) {
      return Response.json(
        {
          error:
            "ユーザー情報が見つかりません。",
        },
        {
          status: 404,
        },
      );
    }

    // 保存済みの理想体型をフロントエンドへJSONで返す
    return Response.json({
      goalBodyType:
        user.goalBodyType,
    });
  } catch (error) {
    // 詳しいエラーを開発者用ログへ記録する
    console.error(
      "理想体型の取得に失敗しました。",
      error,
    );

    // フロントエンドへ安全な共通エラーを返す
    return Response.json(
      {
        error:
          "理想体型を取得できませんでした。",
      },
      {
        status: 500,
      },
    );
  }
}

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
    const parsedBody = goalInputSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!parsedBody.success) {
      return Response.json(
        {
          error:
            "正しい理想体型を選択してください。",
        },
        { status: 400 },
      );
    }

    const { goalBodyType } = parsedBody.data;

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
