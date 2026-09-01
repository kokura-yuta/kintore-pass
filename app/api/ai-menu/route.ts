// 本人情報を使って今日のAIトレーニングメニューを生成するAPI
// OpenAI APIのタイムアウトエラー型を読み込む
import {
  APIConnectionTimeoutError,
} from "openai";
import { createSafetyIdentifier } from "@/app/lib/ai/createSafetyIdentifier";
import { zodTextFormat } from "openai/helpers/zod";
import {
  and,
  count,
  desc,
  eq,
  gte,
  lt,
  max,
} from "drizzle-orm";
// ログイン中の本人を確認する機能を読み込む
import { getClerkUserId } from "@/app/lib/auth/clerk-auth";

// NeonからAI用の本人情報を集める機能を読み込む
import { getUserAiContext } from "@/app/lib/ai/getUserAiContext";
// 今日のメニューを作るためのAI専用指示書を読み込む
import { menuPrompt } from "@/app/lib/ai/menuPrompt";
import { openai } from "@/app/lib/ai/openAiClient";
import {
  maxMenuOutputTokens,
  openAiMenuModel,
} from "@/app/lib/ai/config";
// フロント入力とOpenAI出力のデータ形式を検証する設計図を読み込む
import {
  aiMenuRequestSchema,
  aiMenuSchema,
} from "@/app/lib/ai/menuSchema";
import { getDb } from "@/db";
import {
  aiGeneratedMenuExercises,
  aiGeneratedMenus,
  aiRequestGuards,
  users,
} from "@/db/schema";

// 1日と日本時間の時差をミリ秒で表す
const millisecondsPerDay =
  24 * 60 * 60 * 1000;

const japanTimeOffsetMilliseconds =
  9 * 60 * 60 * 1000;

// 環境変数からAIメニューの1日上限を読み取る
const parsedDailyMenuLimit =
  Number.parseInt(
    process.env.AI_MENU_DAILY_LIMIT ??
      "3",
    10,
  );

// 設定が不正な場合は1日3回を使用する
const dailyMenuLimit =
  Number.isInteger(
    parsedDailyMenuLimit,
  ) &&
  parsedDailyMenuLimit > 0
    ? parsedDailyMenuLimit
    : 3;

// AIへの連続送信を止める秒数を環境変数から読み取る
const parsedRequestCooldownSeconds =
  Number.parseInt(
    process.env.AI_REQUEST_COOLDOWN_SECONDS ??
      "5",
    10,
  );

const requestCooldownMilliseconds =
  (Number.isInteger(
    parsedRequestCooldownSeconds,
  ) && parsedRequestCooldownSeconds > 0
    ? parsedRequestCooldownSeconds
    : 5) * 1000;

// 日本時間の今日0時と明日0時を作る
function getJapanDayRange(now: Date) {
  const japanNow = new Date(
    now.getTime() +
      japanTimeOffsetMilliseconds,
  );

  const japanDayStartAsUtc = Date.UTC(
    japanNow.getUTCFullYear(),
    japanNow.getUTCMonth(),
    japanNow.getUTCDate(),
  );

  const start = new Date(
    japanDayStartAsUtc -
      japanTimeOffsetMilliseconds,
  );

  const end = new Date(
    start.getTime() +
      millisecondsPerDay,
  );

  return {
    start,
    end,
  };
}

// ログイン中の本人が最後に生成したAIメニューをNeonから取得する
export async function GET(request: Request) {
  try {
    const clerkUserId = await getClerkUserId(request);

    if (!clerkUserId) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    const db = getDb();

    // Clerkの本人IDと結び付く最新メニューを1件だけ取得する
    const matchedMenus = await db
      .select({
        id: aiGeneratedMenus.id,
        recommendedBodyPart:
          aiGeneratedMenus.recommendedBodyPart,
        reason: aiGeneratedMenus.reason,
        estimatedMinutes:
          aiGeneratedMenus.estimatedMinutes,
        advice: aiGeneratedMenus.advice,
        conditionScore:
          aiGeneratedMenus.conditionScore,
        requestNote: aiGeneratedMenus.requestNote,
        createdAt: aiGeneratedMenus.createdAt,
      })
      .from(aiGeneratedMenus)
      .innerJoin(
        users,
        eq(aiGeneratedMenus.userId, users.id),
      )
      .where(eq(users.clerkUserId, clerkUserId))
      .orderBy(desc(aiGeneratedMenus.createdAt))
      .limit(1);

    const latestMenu = matchedMenus[0] ?? null;

    // まだ生成履歴がない場合も正常な空状態として返す
    if (!latestMenu) {
      return Response.json({ menu: null });
    }

    // 最新メニューに含まれる種目を登録順で取得する
    const exercises = await db
      .select({
        exerciseName:
          aiGeneratedMenuExercises.exerciseName,
        bodyPart: aiGeneratedMenuExercises.bodyPart,
        bodyArea: aiGeneratedMenuExercises.bodyArea,
        targetWeightKg:
          aiGeneratedMenuExercises.targetWeightKg,
        targetReps:
          aiGeneratedMenuExercises.targetReps,
        sets: aiGeneratedMenuExercises.sets,
        restSeconds:
          aiGeneratedMenuExercises.restSeconds,
        note: aiGeneratedMenuExercises.note,
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

    return Response.json({
      menu: {
        ...latestMenu,
        exercises,
      },
    });
  } catch (error) {
    console.error("AIメニュー取得APIエラー:", error);

    return Response.json(
      {
        error:
          "AIメニューの取得に失敗しました。",
      },
      { status: 500 },
    );
  }
}

// フロントからAIメニュー生成の依頼を受け取る
export async function POST(
  request: Request,
) {
  let requestGuardId: string | null = null;

  // 本人確認中に発生したエラーを捕まえる
  try {
    // リクエストに含まれるClerk認証情報から本人のIDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // ログインを確認できない場合は処理を中止する
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
        // Clerk IDからOpenAIへ渡す匿名IDを作る
    const safetyIdentifier =
      await createSafetyIdentifier(
        clerkUserId,
      );
    // フロントから届いた今日の調子と補足メモをJSONとして受け取る
    const requestBody = await request
      .json()
      .catch(() => ({}));

    // 受け取った値が決められた形式と範囲を満たすか確認する
    const parsedRequest =
      aiMenuRequestSchema.safeParse(
        requestBody,
      );

    // 調子やメモの形式が不正な場合はOpenAIを呼ばずに終了する
    if (!parsedRequest.success) {
      return Response.json(
        {
          error:
            "今日の調子またはメモの形式が正しくありません。",
        },
        {
          status: 400,
        },
      );
    }

    const {
      requestId,
      ...todayCondition
    } = parsedRequest.data;

    const db = getDb();
    const { start, end } =
      getJapanDayRange(new Date());

    // 本人が今日生成したAIメニュー数をNeonから数える
    const dailyUsageResults = await db
      .select({
        usageCount: count(aiGeneratedMenus.id),
        latestCreatedAt: max(
          aiGeneratedMenus.createdAt,
        ),
      })
      .from(aiGeneratedMenus)
      .innerJoin(
        users,
        eq(aiGeneratedMenus.userId, users.id),
      )
      .where(
        and(
          eq(users.clerkUserId, clerkUserId),
          gte(aiGeneratedMenus.createdAt, start),
          lt(aiGeneratedMenus.createdAt, end),
        ),
      );

    const usedMenuCount = Number(
      dailyUsageResults[0]?.usageCount ?? 0,
    );

    const latestMenuCreatedAt =
      dailyUsageResults[0]?.latestCreatedAt ??
      null;

    // 最新の生成から5秒以内ならOpenAIを呼ばずに終了する
    if (latestMenuCreatedAt) {
      const nextRequestAt = new Date(
        latestMenuCreatedAt.getTime() +
          requestCooldownMilliseconds,
      );

      if (nextRequestAt.getTime() > Date.now()) {
        const cooldownRetryAfterSeconds =
          Math.max(
            1,
            Math.ceil(
              (nextRequestAt.getTime() -
                Date.now()) /
                1000,
            ),
          );

        return Response.json(
          {
            error:
              "連続生成を防ぐため、少し待ってから再実行してください。",
            retryAfterSeconds:
              cooldownRetryAfterSeconds,
            nextAvailableAt:
              nextRequestAt.toISOString(),
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                cooldownRetryAfterSeconds,
              ),
            },
          },
        );
      }
    }

    // 明日の日本時間0時までの待ち時間を秒で計算する
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (end.getTime() - Date.now()) / 1000,
      ),
    );

    // 上限に達していたらOpenAIを呼ばずに終了する
    if (usedMenuCount >= dailyMenuLimit) {
      return Response.json(
        {
          error:
            "本日のAIメニュー生成上限に達しました。",
          limit: dailyMenuLimit,
          used: usedMenuCount,
          remaining: 0,
          nextAvailableAt: end.toISOString(),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              retryAfterSeconds,
            ),
          },
        },
      );
    }

    // ClerkユーザーIDを使ってNeonから本人のAI用データを取得する
    const aiContext =
      await getUserAiContext(
        clerkUserId,
      );

    // Neonに本人情報が存在しない場合は処理を中止する
    if (!aiContext) {
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

    // 同じリクエストIDは1件目だけ登録し、二重生成を止める
    const insertedGuards = await db
      .insert(aiRequestGuards)
      .values({
        userId: aiContext.userId,
        requestType: "menu",
        requestId,
      })
      .onConflictDoNothing({
        target: [
          aiRequestGuards.userId,
          aiRequestGuards.requestType,
          aiRequestGuards.requestId,
        ],
      })
      .returning({
        id: aiRequestGuards.id,
      });

    requestGuardId =
      insertedGuards[0]?.id ?? null;

    if (!requestGuardId) {
      return Response.json(
        {
          error:
            "同じAIメニューを処理中または処理済みです。",
          requestId,
        },
        {
          status: 409,
        },
      );
    }

    // AIの判断に必要な情報だけを送信用データへまとめる
    const aiInput = {
      goalBodyType:
        aiContext.goalBodyType,
      profile:
        aiContext.profile,
      latestBodyAnalysis:
        aiContext.latestBodyAnalysis,
      recentTrainingSessions:
        aiContext.recentTrainingSessions,
      recentAiMenus:
        aiContext.recentAiMenus,
      todayCondition:
        todayCondition,
    };

    // 共通指示・本人情報・出力形式をOpenAIへ送り今日のメニューを生成する
    const aiResponse =
      await openai.responses.parse({
        model: openAiMenuModel,
        instructions: menuPrompt,
        input: `# 利用者データ

${JSON.stringify(aiInput, null, 2)}`,
        text: {
          format: zodTextFormat(
            aiMenuSchema,
            "training_menu",
          ),
        },
        max_output_tokens:
          maxMenuOutputTokens,
        safety_identifier:
          safetyIdentifier,
      });

    // 決めた形式として検証済みのOpenAI生成結果を取り出す
    const generatedMenu =
      aiResponse.output_parsed;

    // OpenAIから有効なメニューを取得できなければ不完全な結果を返さない
    if (!generatedMenu) {
      await db
        .delete(aiRequestGuards)
        .where(
          eq(
            aiRequestGuards.id,
            requestGuardId,
          ),
        );
      requestGuardId = null;

      return Response.json(
        {
          error:
            "AIメニューを正しい形式で生成できませんでした。",
        },
        {
          status: 502,
        },
      );
    }

    const menuId = crypto.randomUUID();
    const createdAt = new Date();
    const conditionScore =
      parsedRequest.data.conditionScore ?? null;
    const requestNote =
      parsedRequest.data.note?.trim() || null;

    // メニュー本体と全種目をNeonへまとめて保存し、片方だけ残る状態を防ぐ
    await db.batch([
      db.insert(aiGeneratedMenus).values({
        id: menuId,
        userId: aiContext.userId,
        recommendedBodyPart:
          generatedMenu.recommendedBodyPart,
        reason: generatedMenu.reason,
        estimatedMinutes:
          generatedMenu.estimatedMinutes,
        advice: generatedMenu.advice,
        conditionScore,
        requestNote,
        createdAt,
      }),
      db.insert(aiGeneratedMenuExercises).values(
        generatedMenu.exercises.map(
          (exercise, displayOrder) => ({
            id: crypto.randomUUID(),
            menuId,
            exerciseName: exercise.exerciseName,
            bodyPart: exercise.bodyPart,
            bodyArea: exercise.bodyArea,
            targetWeightKg:
              exercise.targetWeightKg,
            targetReps: exercise.targetReps,
            sets: exercise.sets,
            restSeconds: exercise.restSeconds,
            note: exercise.note,
            displayOrder,
            createdAt,
          }),
        ),
      ),
    ]);

    const updatedUsedMenuCount =
      usedMenuCount + 1;

    const remainingMenuCount = Math.max(
      0,
      dailyMenuLimit - updatedUsedMenuCount,
    );

    // 保存済みIDと日時も含め、検証済みAIメニューをフロントへ返す
    return Response.json({
      requestId,
      menu: {
        id: menuId,
        ...generatedMenu,
        conditionScore,
        requestNote,
        createdAt,
      },
      usage: {
        limit: dailyMenuLimit,
        used: updatedUsedMenuCount,
        remaining: remainingMenuCount,
        resetsAt: end.toISOString(),
      },
    });
  } catch (error) {
    // 処理失敗時は受付記録を削除し、同じ操作を再試行できるようにする
    if (requestGuardId) {
      try {
        await getDb()
          .delete(aiRequestGuards)
          .where(
            eq(
              aiRequestGuards.id,
              requestGuardId,
            ),
          );
      } catch (cleanupError) {
        console.error(
          "AIメニュー受付記録の削除エラー:",
          cleanupError,
        );
      }
    }

    if (
      error instanceof
      APIConnectionTimeoutError
    ) {
      console.error(
        "AIメニューOpenAIタイムアウト:",
        error,
      );

      return Response.json(
        {
          error:
            "AIメニュー生成に時間がかかっています。少し待ってからもう一度お試しください。",
        },
        {
          status: 504,
        },
      );
    }

    // 予想外のエラーをサーバー側へ記録する
    console.error(
      "AIメニューAPIエラー:",
      error,
    );

    // 詳細を利用者へ見せず共通エラーを返す
    return Response.json(
      {
        error:
          "AIメニューの処理に失敗しました。",
      },
      {
        status: 500,
      },
    );
  }
}
