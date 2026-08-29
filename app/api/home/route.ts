// ホーム画面に必要な本人の目標体型と最新AIメニューをまとめて返すAPI
// AIメニュー未生成の場合はmenuとaiMessageをnullで返す
// 同じ値の検索と新しい順の並び替えに使う
import {
  desc,
  eq,
} from "drizzle-orm";

// Clerkトークンからログイン中の本人を確認する
import {
  getClerkUserId,
} from "@/app/lib/auth/clerk-auth";

// Neonを操作する共通のDB接続
import { getDb } from "@/db";

// ホームへ返すユーザー・AIメニュー・種目テーブル
import {
  aiGeneratedMenuExercises,
  aiGeneratedMenus,
  users,
} from "@/db/schema";

// ホーム画面からのGET通信を受け取る
export async function GET(
  request: Request,
) {
  try {
    // Clerkトークンを検証してログイン中のユーザーIDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // 未ログインならNeonを検索せずHTTP 401を返す
    if (!clerkUserId) {
      return Response.json(
        {
          error:
            "ログインが必要です。",
        },
        { status: 401 },
      );
    }

    // Neonを操作するDB接続を取得する
    const db = getDb();

    // ClerkユーザーIDに一致する本人のIDと目標体型を取得する
    const matchedUsers = await db
      .select({
        id: users.id,
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

    // 検索結果の先頭を取り出し、なければnullへ統一する
    const currentUser =
      matchedUsers[0] ?? null;

    // Neonに本人のユーザー情報がなければHTTP 404を返す
    if (!currentUser) {
      return Response.json(
        {
          error:
            "ユーザーが見つかりません。",
        },
        { status: 404 },
      );
    }

    // 本人が最後に生成したAIメニューを1件取得する
    const matchedMenus = await db
      .select({
        id: aiGeneratedMenus.id,
        recommendedBodyPart:
          aiGeneratedMenus.recommendedBodyPart,
        reason:
          aiGeneratedMenus.reason,
        estimatedMinutes:
          aiGeneratedMenus.estimatedMinutes,
        advice:
          aiGeneratedMenus.advice,
        conditionScore:
          aiGeneratedMenus.conditionScore,
        createdAt:
          aiGeneratedMenus.createdAt,
      })
      .from(aiGeneratedMenus)
      .where(
        eq(
          aiGeneratedMenus.userId,
          currentUser.id,
        ),
      )
      .orderBy(
        desc(aiGeneratedMenus.createdAt),
      )
      .limit(1);

    // 検索結果の先頭を取り出し、なければnullにする
    const latestMenu =
      matchedMenus[0] ?? null;

    // AIメニューが未生成なら、メニューなしの状態を返す
    if (!latestMenu) {
      return Response.json({
        goalBodyType:
          currentUser.goalBodyType,
        menu: null,
        aiMessage: null,
      });
    }

    // 最新AIメニューに含まれる種目を表示順に取得する
    const exercises = await db
      .select({
        exerciseName:
          aiGeneratedMenuExercises.exerciseName,
        bodyPart:
          aiGeneratedMenuExercises.bodyPart,
        bodyArea:
          aiGeneratedMenuExercises.bodyArea,
        targetWeightKg:
          aiGeneratedMenuExercises.targetWeightKg,
        targetReps:
          aiGeneratedMenuExercises.targetReps,
        sets:
          aiGeneratedMenuExercises.sets,
        restSeconds:
          aiGeneratedMenuExercises.restSeconds,
        note:
          aiGeneratedMenuExercises.note,
      })
      .from(aiGeneratedMenuExercises)
      .where(
        eq(
          aiGeneratedMenuExercises.menuId,
          latestMenu.id,
        ),
      )
      .orderBy(
        aiGeneratedMenuExercises.displayOrder,
      );

    // 目標体型・最新AIメニュー・種目をホーム画面へ返す
    return Response.json({
      goalBodyType:
        currentUser.goalBodyType,
      menu: {
        id:
          latestMenu.id,
        recommendedBodyPart:
          latestMenu.recommendedBodyPart,
        reason:
          latestMenu.reason,
        estimatedMinutes:
          latestMenu.estimatedMinutes,
        advice:
          latestMenu.advice,
        conditionScore:
          latestMenu.conditionScore,
        createdAt:
          latestMenu.createdAt,
        exercises,
      },
      aiMessage:
        latestMenu.advice[0] ??
        latestMenu.reason,
    });
  } catch (error) {
    // 詳しい原因は利用者へ返さずサーバーログへ残す
    console.error(
      "ホーム情報の取得に失敗しました。",
      error,
    );

    // フロントへ安全な共通エラーを返す
    return Response.json(
      {
        error:
          "ホーム情報の取得に失敗しました。",
      },
      { status: 500 },
    );
  }
}

