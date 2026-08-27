// 本人情報を使って今日のAIトレーニングメニューを生成するAPI
// OpenAI APIと通信するための公式ライブラリを読み込む
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { desc, eq } from "drizzle-orm";
// ログイン中の本人を確認する機能を読み込む
import { getClerkUserId } from "@/app/lib/auth/clerk-auth";

// NeonからAI用の本人情報を集める機能を読み込む
import { getUserAiContext } from "@/app/lib/ai/getUserAiContext";
// 今日のメニューを作るためのAI専用指示書を読み込む
import { menuPrompt } from "@/app/lib/ai/menuPrompt";
// フロント入力とOpenAI出力のデータ形式を検証する設計図を読み込む
import {
  aiMenuRequestSchema,
  aiMenuSchema,
} from "@/app/lib/ai/menuSchema";
import { getDb } from "@/db";
import {
  aiGeneratedMenuExercises,
  aiGeneratedMenus,
  users,
} from "@/db/schema";

// 環境変数の秘密鍵を使ってOpenAIとの接続を準備する
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      todayCondition:
        parsedRequest.data,
    };

    // 共通指示・本人情報・出力形式をOpenAIへ送り今日のメニューを生成する
    const aiResponse =
      await openai.responses.parse({
        model: "gpt-5.6-luna",
        instructions: menuPrompt,
        input: `# 利用者データ

${JSON.stringify(aiInput, null, 2)}`,
        text: {
          format: zodTextFormat(
            aiMenuSchema,
            "training_menu",
          ),
        },
      });

    // 決めた形式として検証済みのOpenAI生成結果を取り出す
    const generatedMenu =
      aiResponse.output_parsed;

    // OpenAIから有効なメニューを取得できなければ不完全な結果を返さない
    if (!generatedMenu) {
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

    const db = getDb();
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

    // 保存済みIDと日時も含め、検証済みAIメニューをフロントへ返す
    return Response.json({
      menu: {
        id: menuId,
        ...generatedMenu,
        conditionScore,
        requestNote,
        createdAt,
      },
    });
  } catch (error) {
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
