// ログイン中の本人がClerkアカウントとNeon内の全データを削除するAPI
// 誤操作・他人の削除・途中失敗を防ぎ、再実行できる形で削除する
// 同じClerkユーザーIDを持つ本人だけをNeonから削除する
import { eq } from "drizzle-orm";

// 最近本人確認していない場合にClerk用の403エラーを返す
import {
  reverificationErrorResponse,
} from "@clerk/backend/internal";

// 詳しい本人確認とClerkアカウント削除を使う
import {
  deleteClerkUser,
  getClerkSessionAuth,
} from "@/app/lib/auth/clerk-auth";

// Neon接続とusersテーブルを使う
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { deleteAccountSchema } from "@/app/lib/validation/apiSchemas";

// DELETE通信を受け取り、本人確認と削除確認文字を検査する
export async function DELETE(
  request: Request,
) {
  try {
    // Clerkトークンからログイン中の本人情報を取得する
    const auth =
      await getClerkSessionAuth(request);

    // 未ログインなら削除処理を開始しない
    if (!auth) {
      return Response.json(
        {
          error:
            "ログインが必要です。",
        },
        { status: 401 },
      );
    }

    // 直近10分以内に本人確認していなければ再確認を要求する
    if (
      !auth.has({
        reverification: "strict",
      })
    ) {
      return reverificationErrorResponse(
        "strict",
      );
    }

    // JSONが壊れている場合もnullとして安全に扱う
    const parsedInput =
      deleteAccountSchema.safeParse(
        await request.json().catch(() => null),
      );

    // 確認文字がDELETEと完全一致しなければ削除しない
    if (
      !parsedInput.success
    ) {
      return Response.json(
        {
          error:
            "確認文字としてDELETEを入力してください。",
        },
        { status: 400 },
      );
    }

    // Neonを操作するDB接続を取得する
    const db = getDb();

    // ClerkユーザーIDが一致する本人のusers行だけを削除する
    const deletedUsers = await db
      .delete(users)
      .where(
        eq(
          users.clerkUserId,
          auth.userId,
        ),
      )
      .returning({
        id: users.id,
      });

    try {
      // Neon削除後にClerkのログインアカウントを削除する
      await deleteClerkUser(
        auth.userId,
      );
    } catch (clerkError) {
      // Clerkだけ失敗した場合は再実行できることを利用者へ伝える
      console.error(
        "Neon削除後にClerkアカウント削除が失敗しました。",
        clerkError,
      );

      return Response.json(
        {
          error:
            "保存データは削除されましたが、ログインアカウントの削除を完了できませんでした。もう一度お試しください。",
          retryable: true,
        },
        { status: 502 },
      );
    }

    // 両方の削除が完了したことを返す
    return Response.json({
      message:
        "アカウントと保存データを削除しました。",
      neonUserDeleted:
        deletedUsers.length > 0,
    });
  } catch (error) {
    // 詳細を利用者へ見せずサーバーログへ残す
    console.error(
      "アカウント削除の処理に失敗しました。",
      error,
    );

    return Response.json(
      {
        error:
          "アカウント削除の処理に失敗しました。",
      },
      { status: 500 },
    );
  }
}
