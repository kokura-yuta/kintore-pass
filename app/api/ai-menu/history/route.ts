// ログイン中の本人が過去に生成したAIメニューの一覧・詳細取得・削除を行うAPI
// 一覧は新しい順とページ分け、詳細は種目を含め、削除は本人のメニューだけを対象にする
// 履歴の本人条件・件数・新しい順の検索に使う
import {
  and,
  count,
  desc,
  eq,
} from "drizzle-orm";

// Clerk認証からログイン中の本人IDを取得する
import {
  getClerkUserId,
} from "@/app/lib/auth/clerk-auth";

// Neonへ接続する
import { getDb } from "@/db";

// AIメニュー本体・種目・ユーザーのテーブルを使う
import {
  aiGeneratedMenuExercises,
  aiGeneratedMenus,
  users,
} from "@/db/schema";

// AIメニュー履歴を1ページ20件、最大50件まで取得する
const defaultHistoryLimit = 20;
const maximumHistoryLimit = 50;

// URLのpageとlimitを安全な整数へ変換する
function parsePositiveInteger(
  value: string | null,
  fallback: number,
  maximum: number,
) {
  // 指定がなければ初期値を使う
  if (value === null) {
    return fallback;
  }

  const parsedValue = Number(value);

  // 0・負数・小数・文字なら無効にする
  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1
  ) {
    return null;
  }

  // 大きすぎる値は最大値までにする
  return Math.min(
    parsedValue,
    maximum,
  );
}

// AIメニューIDがPostgreSQLのUUID形式か確認する
function isValidUuid(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

// 本人のAIメニュー履歴一覧を取得する
export async function GET(
  request: Request,
) {
  try {
    // Clerkトークンからログイン中の本人IDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // 未ログインならNeonを検索しない
    if (!clerkUserId) {
      return Response.json(
        {
          error:
            "ログインが必要です。",
        },
        { status: 401 },
      );
    }

    // フロントがURLへ付けたページ条件を取得する
    const requestUrl = new URL(
      request.url,
    );

        // 詳細取得で使うAIメニューIDをURLから取得する
    const menuId =
      requestUrl.searchParams.get(
        "menuId",
      );

    // menuIdが指定されていてUUID形式でなければ拒否する
    if (
      menuId !== null &&
      !isValidUuid(menuId)
    ) {
      return Response.json(
        {
          error:
            "AIメニューIDを確認してください。",
        },
        { status: 400 },
      );
    }

    const page = parsePositiveInteger(
      requestUrl.searchParams.get(
        "page",
      ),
      1,
      100000,
    );

    const limit = parsePositiveInteger(
      requestUrl.searchParams.get(
        "limit",
      ),
      defaultHistoryLimit,
      maximumHistoryLimit,
    );

    // pageまたはlimitが不正ならNeonを検索しない
    if (
      page === null ||
      limit === null
    ) {
      return Response.json(
        {
          error:
            "履歴のページ条件を確認してください。",
        },
        { status: 400 },
      );
    }

    // 前ページまでのメニュー件数を計算する
    const offset =
      (page - 1) * limit;

    // 次の作業でここからNeonを検索する
        // Neonを操作するDB接続を取得する
    const db = getDb();

        // menuIdがある場合は一覧ではなく1件の詳細を取得する
    if (menuId !== null) {
      // メニューIDとClerkユーザーIDが両方一致する本人のメニューを探す
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
          requestNote:
            aiGeneratedMenus.requestNote,
          trainingSessionId:
            aiGeneratedMenus.trainingSessionId,
          performedAt:
            aiGeneratedMenus.performedAt,
          createdAt:
            aiGeneratedMenus.createdAt,
        })
        .from(aiGeneratedMenus)
        .innerJoin(
          users,
          eq(
            aiGeneratedMenus.userId,
            users.id,
          ),
        )
        .where(
          and(
            eq(
              aiGeneratedMenus.id,
              menuId,
            ),
            eq(
              users.clerkUserId,
              clerkUserId,
            ),
          ),
        )
        .limit(1);

      // 検索結果の先頭を取り出し、なければnullにする
      const menu =
        matchedMenus[0] ?? null;

      // 存在しないメニューと他人のメニューは同じ404を返す
      if (!menu) {
        return Response.json(
          {
            error:
              "AIメニューが見つかりません。",
          },
          { status: 404 },
        );
      }

      // 本人確認できたメニューに所属する全種目を取得する
      const exercises = await db
        .select({
          id:
            aiGeneratedMenuExercises.id,
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
          displayOrder:
            aiGeneratedMenuExercises.displayOrder,
        })
        .from(
          aiGeneratedMenuExercises,
        )
        .where(
          eq(
            aiGeneratedMenuExercises.menuId,
            menu.id,
          ),
        )
        .orderBy(
          aiGeneratedMenuExercises.displayOrder,
        );

      // メニュー本体と種目を詳細画面用JSONとして返す
      return Response.json({
        menu: {
          ...menu,
          isPerformed:
            menu.performedAt !== null,
          exercises,
        },
      });
    }

    // 総件数と現在ページのAIメニューをまとめて取得する
    const [
      totalResults,
      menus,
    ] = await db.batch([
      // 本人が生成したAIメニューの総件数を数える
      db
        .select({
          total: count(
            aiGeneratedMenus.id,
          ),
        })
        .from(aiGeneratedMenus)
        .innerJoin(
          users,
          eq(
            aiGeneratedMenus.userId,
            users.id,
          ),
        )
        .where(
          eq(
            users.clerkUserId,
            clerkUserId,
          ),
        ),

      // 現在ページに表示するAIメニューだけを取得する
      db
        .select({
          id: aiGeneratedMenus.id,
          recommendedBodyPart:
            aiGeneratedMenus.recommendedBodyPart,
          reason:
            aiGeneratedMenus.reason,
          estimatedMinutes:
            aiGeneratedMenus.estimatedMinutes,
          conditionScore:
            aiGeneratedMenus.conditionScore,
          trainingSessionId:
            aiGeneratedMenus.trainingSessionId,
          performedAt:
            aiGeneratedMenus.performedAt,
          createdAt:
            aiGeneratedMenus.createdAt,
        })
        .from(aiGeneratedMenus)
        .innerJoin(
          users,
          eq(
            aiGeneratedMenus.userId,
            users.id,
          ),
        )
        .where(
          eq(
            users.clerkUserId,
            clerkUserId,
          ),
        )
        .orderBy(
          desc(
            aiGeneratedMenus.createdAt,
          ),
          desc(aiGeneratedMenus.id),
        )
        .limit(limit)
        .offset(offset),
    ]);

    // Neonの件数を通常のnumber型へ変換する
    const total = Number(
      totalResults[0]?.total ?? 0,
    );

    // 全ページ数を計算する
    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / limit);

    // フロントが表示しやすい一覧形式で返す
    return Response.json({
      menus: menus.map((menu) => ({
        ...menu,
        isPerformed:
          menu.performedAt !== null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    // 詳細はサーバーログへ残し、利用者には見せない
    console.error(
      "AIメニュー履歴の取得に失敗しました。",
      error,
    );

    return Response.json(
      {
        error:
          "AIメニュー履歴の取得に失敗しました。",
      },
      { status: 500 },
    );
  }
}
// ログイン中の本人が指定したAIメニュー履歴を削除する
export async function DELETE(
  request: Request,
) {
  try {
    // Clerkトークンを検証してログイン中の本人IDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // 未ログインならNeonを操作せず終了する
    if (!clerkUserId) {
      return Response.json(
        {
          error:
            "ログインが必要です。",
        },
        { status: 401 },
      );
    }

    // URLから削除対象のAIメニューIDを取得する
    const requestUrl = new URL(
      request.url,
    );

    const menuId =
      requestUrl.searchParams.get(
        "menuId",
      );

    // IDがない、またはUUID形式でなければ削除しない
    if (
      menuId === null ||
      !isValidUuid(menuId)
    ) {
      return Response.json(
        {
          error:
            "AIメニューIDを確認してください。",
        },
        { status: 400 },
      );
    }
        // Neonを操作するDB接続を取得する
    const db = getDb();

    // メニューIDとClerk IDが一致する本人のメニューだけを探す
    const matchedMenus = await db
      .select({
        id: aiGeneratedMenus.id,
      })
      .from(aiGeneratedMenus)
      .innerJoin(
        users,
        eq(
          aiGeneratedMenus.userId,
          users.id,
        ),
      )
      .where(
        and(
          eq(
            aiGeneratedMenus.id,
            menuId,
          ),
          eq(
            users.clerkUserId,
            clerkUserId,
          ),
        ),
      )
      .limit(1);

    // 検索結果の先頭を取り出し、見つからなければnullにする
    const matchedMenu =
      matchedMenus[0] ?? null;

    // 存在しないメニューと他人のメニューは同じ404を返す
    if (!matchedMenu) {
      return Response.json(
        {
          error:
            "AIメニューが見つかりません。",
        },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error(
      "AIメニュー履歴の削除に失敗しました。",
      error,
    );

    return Response.json(
      {
        error:
          "AIメニュー履歴の削除に失敗しました。",
      },
      { status: 500 },
    );
  }
  
}