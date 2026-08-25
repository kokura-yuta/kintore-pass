// 初回設定に必要な情報がそろっているか確認し、完了状態をNeonへ保存するAPI
// 本人のユーザー情報と完了済み分析を検索するための比較機能
import {
  and,
  eq,
} from "drizzle-orm";

// Clerk認証とNeon接続を使えるようにする
import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import { getDb } from "@/db";

// 初回設定の確認に必要なテーブルを読み込む
import {
  bodyAnalyses,
  userProfiles,
  users,
} from "@/db/schema";

// POST通信を受け取り、ログイン中の本人の初回設定完了処理を開始する
export async function POST(
  request: Request,
) {
  // 認証・DB確認・更新中に発生したエラーをまとめて捕まえる
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
        // 初回設定データを確認するためにNeonへの接続を取得する
    const db = getDb();

    // ClerkユーザーIDが一致する本人の理想体型・身長・体重を取得する
    const matchedUsers = await db
      .select({
        userId: users.id,
        goalBodyType: users.goalBodyType,
        heightCm: userProfiles.heightCm,
        weightKg: userProfiles.weightKg,
      })
      .from(users)
      .leftJoin(
        userProfiles,
        eq(
          userProfiles.userId,
          users.id,
        ),
      )
      .where(
        eq(
          users.clerkUserId,
          clerkUserId,
        ),
      )
      .limit(1);

    // 検索結果の先頭を取り出し、見つからなければnullに統一する
    const user =
      matchedUsers[0] ?? null;

    // Neonに本人のユーザーデータがなければ404を返す
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

        // 理想体型・身長・体重のどれかが未設定なら初回設定を完了させない
    if (
      user.goalBodyType === null ||
      user.heightCm === null ||
      user.weightKg === null
    ) {
      return Response.json(
        {
          error:
            "理想体型と身長・体重を先に設定してください。",
        },
        {
          status: 400,
        },
      );
    }
        // 本人の完了済み身体分析を最大1件取得する
    const completedAnalyses = await db
      .select({
        id: bodyAnalyses.id,
      })
      .from(bodyAnalyses)
      .where(
        and(
          eq(
            bodyAnalyses.userId,
            user.userId,
          ),
          eq(
            bodyAnalyses.status,
            "completed",
          ),
        ),
      )
      .limit(1);

    // 身体分析は任意なので、理想体型・身長・体重がそろっていれば初回設定を完了する
    const updatedUsers = await db
      .update(users)
      .set({
        initialAnalysisCompleted:
          completedAnalyses.length > 0,
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(
        eq(
          users.id,
          user.userId,
        ),
      )
      .returning({
        userId: users.id,
        onboardingCompleted:
          users.onboardingCompleted,
        initialAnalysisCompleted:
          users.initialAnalysisCompleted,
      });

    // 更新結果の先頭を取り出し、取得できなければnullにする
    const updatedUser =
      updatedUsers[0] ?? null;

    // 更新対象が見つからなければ404を返す
    if (!updatedUser) {
      return Response.json(
        {
          error:
            "初回設定を更新するユーザーが見つかりません。",
        },
        {
          status: 404,
        },
      );
    }

    // 完了後の状態をフロントエンドへ返す
    return Response.json({
      userId: updatedUser.userId,
      onboardingCompleted:
        updatedUser.onboardingCompleted,
      initialAnalysisCompleted:
        updatedUser.initialAnalysisCompleted,
    });
  } catch (error) {
    // 詳しいエラーを利用者へ見せず、開発者用ログへ記録する
    console.error(
      "初回設定の完了処理に失敗しました。",
      error,
    );

    // フロントエンドへ安全な共通エラーを返す
    return Response.json(
      {
        error:
          "初回設定を完了できませんでした。",
      },
      {
        status: 500,
      },
    );
  }
}
