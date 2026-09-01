// ログイン中の本人が過去に生成したAIメニューの一覧・詳細取得・削除・実施状態更新を行うAPI
// 一覧は新しい順とページ分け、詳細・削除・更新は本人のメニューだけを対象にする
// 履歴の本人条件・件数・新しい順の検索に使う
import {
  and,
  count,
  desc,
  eq,
  isNull,
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
  trainingSessions,
  users,
} from "@/db/schema";
import { markAiMenuPerformedSchema } from "@/app/lib/validation/apiSchemas";

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
    // 本人確認できたAIメニューをNeonから削除する
    const deletedMenus = await db
      .delete(aiGeneratedMenus)
      .where(
        eq(
          aiGeneratedMenus.id,
          matchedMenu.id,
        ),
      )
      .returning({
        id: aiGeneratedMenus.id,
      });

    // 削除結果の先頭を取り出し、なければnullにする
    const deletedMenu =
      deletedMenus[0] ?? null;

    // 確認後に対象がなくなった場合は404を返す
    if (!deletedMenu) {
      return Response.json(
        {
          error:
            "AIメニューが見つかりません。",
        },
        { status: 404 },
      );
    }

    // 削除したメニューIDをフロントへ返す
    return Response.json({
      message:
        "AIメニューを削除しました。",
      deletedMenuId:
        deletedMenu.id,
    });
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
// 本人のAIメニューとトレーニング記録を結び付けて実施済みにする
export async function PATCH(
  request: Request,
) {
  try {
    // Clerkトークンを検証してログイン中の本人IDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // 未ログインならNeonを操作しない
    if (!clerkUserId) {
      return Response.json(
        {
          error:
            "ログインが必要です。",
        },
        { status: 401 },
      );
    }

    // フロントから送られたJSONを読み取る
    const parsedBody =
      markAiMenuPerformedSchema.safeParse(
        await request.json().catch(() => null),
      );

    // メニューIDと記録IDが両方UUID形式か確認する
    if (
      !parsedBody.success
    ) {
      return Response.json(
        {
          error:
            "AIメニューIDとトレーニング記録IDを確認してください。",
        },
        { status: 400 },
      );
    }

    const body = parsedBody.data;

    // Neonを操作するDB接続を取得する
    const db = getDb();

    // ClerkユーザーIDに対応するNeon内部のユーザーIDを取得する
    const matchedUsers = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(
        eq(
          users.clerkUserId,
          clerkUserId,
        ),
      )
      .limit(1);

    // 検索結果の先頭を取り出し、未登録ならnullにする
    const user =
      matchedUsers[0] ?? null;

    // Neonに本人のユーザー情報がなければ更新しない
    if (!user) {
      return Response.json(
        {
          error:
            "ユーザー情報が見つかりません。",
        },
        { status: 404 },
      );
    }

    // AIメニューとトレーニング記録を本人IDで同時に確認する
    const [
      matchedMenus,
      matchedTrainingSessions,
    ] = await db.batch([
      db
        .select({
          id: aiGeneratedMenus.id,
          trainingSessionId:
            aiGeneratedMenus.trainingSessionId,
          performedAt:
            aiGeneratedMenus.performedAt,
        })
        .from(aiGeneratedMenus)
        .where(
          and(
            eq(
              aiGeneratedMenus.id,
              body.menuId,
            ),
            eq(
              aiGeneratedMenus.userId,
              user.id,
            ),
          ),
        )
        .limit(1),

      db
        .select({
          id: trainingSessions.id,
        })
        .from(trainingSessions)
        .where(
          and(
            eq(
              trainingSessions.id,
              body.trainingSessionId,
            ),
            eq(
              trainingSessions.userId,
              user.id,
            ),
          ),
        )
        .limit(1),
    ]);

    // それぞれの検索結果から先頭の1件を取り出す
    const menu =
      matchedMenus[0] ?? null;

    const trainingSession =
      matchedTrainingSessions[0] ??
      null;

    // どちらかが本人のデータでなければ結び付けない
    if (
      !menu ||
      !trainingSession
    ) {
      return Response.json(
        {
          error:
            "AIメニューまたはトレーニング記録が見つかりません。",
        },
        { status: 404 },
      );
    }
    // すでに実施済みなら二重更新を防ぐ
    if (
      menu.trainingSessionId !== null
    ) {
      // 同じ記録による再送信なら成功済みの結果を返す
      if (
        menu.trainingSessionId ===
        trainingSession.id
      ) {
        return Response.json({
          message:
            "AIメニューは実施済みです。",
          menu: {
            id: menu.id,
            trainingSessionId:
              menu.trainingSessionId,
            performedAt:
              menu.performedAt,
            isPerformed: true,
          },
        });
      }

      // 別の記録へ結び替える操作は拒否する
      return Response.json(
        {
          error:
            "このAIメニューは別のトレーニング記録で実施済みです。",
        },
        { status: 409 },
      );
    }

    // 同じトレーニング記録が別メニューで使用済みか確認する
    const linkedMenus = await db
      .select({
        id: aiGeneratedMenus.id,
      })
      .from(aiGeneratedMenus)
      .where(
        eq(
          aiGeneratedMenus.trainingSessionId,
          trainingSession.id,
        ),
      )
      .limit(1);

    if (linkedMenus.length > 0) {
      return Response.json(
        {
          error:
            "このトレーニング記録は別のAIメニューと結び付いています。",
        },
        { status: 409 },
      );
    }

    // 本人の未実施メニューへ記録IDと現在日時を保存する
    const updatedMenus = await db
      .update(aiGeneratedMenus)
      .set({
        trainingSessionId:
          trainingSession.id,
        performedAt: new Date(),
      })
      .where(
        and(
          eq(
            aiGeneratedMenus.id,
            menu.id,
          ),
          eq(
            aiGeneratedMenus.userId,
            user.id,
          ),
          isNull(
            aiGeneratedMenus.trainingSessionId,
          ),
        ),
      )
      .returning({
        id: aiGeneratedMenus.id,
        trainingSessionId:
          aiGeneratedMenus.trainingSessionId,
        performedAt:
          aiGeneratedMenus.performedAt,
      });

    const updatedMenu =
      updatedMenus[0] ?? null;

    // 同時更新などで更新できなかった場合は競合として返す
    if (!updatedMenu) {
      return Response.json(
        {
          error:
            "AIメニューの状態が変更されています。再読み込みしてください。",
        },
        { status: 409 },
      );
    }

    // 更新後の実施状態をフロントへ返す
    return Response.json({
      message:
        "AIメニューを実施済みにしました。",
      menu: {
        ...updatedMenu,
        isPerformed: true,
      },
    });
  } catch (error) {
    console.error(
      "AIメニューの実施状態更新に失敗しました。",
      error,
    );

    return Response.json(
      {
        error:
          "AIメニューの実施状態更新に失敗しました。",
      },
      { status: 500 },
    );
  }
}
