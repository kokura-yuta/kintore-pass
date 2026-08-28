// OpenAIが選択したAIチャットToolを、認証済みの本人データを使って実行するファイル
import {
  and,
  desc,
  eq,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  getUserAiContext,
} from "@/app/lib/ai/getUserAiContext";
import {
  aiGeneratedMenuExercises,
  aiGeneratedMenus,
  bodyAnalyses,
  bodyAnalysisAreas,
  userProfiles,
  users,
  weightRecords,
} from "@/db/schema";

// OpenAIが選んだToolを認証済みの本人情報で実行する
export async function runChatTool(
  toolName: string,
  clerkUserId: string,
) {
    // 身体分析Toolが選ばれた場合は最新分析を取得する
  if (
    toolName ===
    "get_latest_body_analysis"
  ) {
    return getLatestBodyAnalysis(
      clerkUserId,
    );
  }
    // トレーニング履歴Toolが選ばれた場合は最近10回の記録を取得する
  if (
    toolName ===
    "get_recent_training_records"
  ) {
    const aiContext =
      await getUserAiContext(
        clerkUserId,
      );

    if (!aiContext) {
      return JSON.stringify({
        error:
          "ユーザー情報が見つかりません。",
      });
    }

    return JSON.stringify({
      recentTrainingRecords:
        aiContext.recentTrainingSessions,
    });
  }
    // 最新AIメニューToolが選ばれた場合は本人の最新メニューを取得する
  if (toolName === "get_latest_ai_menu") {
    return getLatestAiMenu(clerkUserId);
  }
    // 体重履歴Toolが選ばれた場合は本人の最近の体重を取得する
  if (
    toolName ===
    "get_weight_history"
  ) {
    return getWeightHistory(
      clerkUserId,
    );
  }
  if (toolName !== "get_user_profile") {
    return JSON.stringify({
      error:
        "指定されたToolは利用できません。",
    });
  }
  
  const db = getDb();

  // ClerkユーザーIDから本人のプロフィールを取得する
  const matchedUsers = await db
    .select({
      goalBodyType: users.goalBodyType,
      heightCm: userProfiles.heightCm,
      weightKg: userProfiles.weightKg,
      bodyFatPercentage:
        userProfiles.bodyFatPercentage,
      weeklyTrainingDays:
        userProfiles.weeklyTrainingDays,
      availableMinutes:
        userProfiles.availableMinutes,
      trainingLocation:
        userProfiles.trainingLocation,
      weakBodyParts:
        userProfiles.weakBodyParts,
    })
    .from(users)
    .leftJoin(
      userProfiles,
      eq(userProfiles.userId, users.id),
    )
    .where(
      eq(users.clerkUserId, clerkUserId),
    )
    .limit(1);

  const user = matchedUsers[0] ?? null;

  if (!user) {
    return JSON.stringify({
      error:
        "ユーザー情報が見つかりません。",
    });
  }

  // OpenAIへ渡せるJSON文字列へ変換する
  return JSON.stringify({
    goalBodyType: user.goalBodyType,
    profile: {
      heightCm: user.heightCm,
      weightKg: user.weightKg,
      bodyFatPercentage:
        user.bodyFatPercentage,
      weeklyTrainingDays:
        user.weeklyTrainingDays,
      availableMinutes:
        user.availableMinutes,
      trainingLocation:
        user.trainingLocation,
      weakBodyParts:
        user.weakBodyParts,
    },
  });
}
// 認証済みの本人の最新身体分析と部位別評価を取得する
async function getLatestBodyAnalysis(
  clerkUserId: string,
) {
  const db = getDb();

  const matchedAnalyses = await db
    .select({
      id: bodyAnalyses.id,
      summary: bodyAnalyses.summary,
      goalDifference:
        bodyAnalyses.goalDifference,
      analyzedAt: bodyAnalyses.analyzedAt,
    })
    .from(bodyAnalyses)
    .innerJoin(
      users,
      eq(bodyAnalyses.userId, users.id),
    )
    .where(
      and(
        eq(
          users.clerkUserId,
          clerkUserId,
        ),
        eq(
          bodyAnalyses.status,
          "completed",
        ),
      ),
    )
    .orderBy(
      desc(bodyAnalyses.analyzedAt),
    )
    .limit(1);

  const analysis =
    matchedAnalyses[0] ?? null;

  if (!analysis) {
    return JSON.stringify({
      analysis: null,
      message:
        "身体分析結果はまだありません。",
    });
  }

  // 最新分析に属する肩・胸などの評価を取得する
  const areas = await db
    .select({
      bodyPart:
        bodyAnalysisAreas.bodyPart,
      score: bodyAnalysisAreas.score,
      priority:
        bodyAnalysisAreas.priority,
      observation:
        bodyAnalysisAreas.observation,
      recommendation:
        bodyAnalysisAreas.recommendation,
    })
    .from(bodyAnalysisAreas)
    .where(
      eq(
        bodyAnalysisAreas.analysisId,
        analysis.id,
      ),
    );

  return JSON.stringify({
    analysis: {
      summary: analysis.summary,
      goalDifference:
        analysis.goalDifference,
      analyzedAt: analysis.analyzedAt,
      areas,
    },
  });
}
// 認証済みの本人に最後に生成されたAIメニューを取得する
async function getLatestAiMenu(
  clerkUserId: string,
) {
  const db = getDb();

  // ClerkユーザーIDに一致する本人の最新メニューを1件取得する
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
      requestNote:
        aiGeneratedMenus.requestNote,
      createdAt: aiGeneratedMenus.createdAt,
    })
    .from(aiGeneratedMenus)
    .innerJoin(
      users,
      eq(aiGeneratedMenus.userId, users.id),
    )
    .where(
      eq(users.clerkUserId, clerkUserId),
    )
    .orderBy(
      desc(aiGeneratedMenus.createdAt),
    )
    .limit(1);

  // 検索結果の先頭を取り出し、なければnullにする
  const menu = matchedMenus[0] ?? null;

  // まだAIメニューを作っていない場合の結果を返す
  if (!menu) {
    return JSON.stringify({
      menu: null,
      message:
        "生成されたAIメニューはまだありません。",
    });
  }

  // 最新メニューに含まれる種目を表示順で取得する
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
      displayOrder:
        aiGeneratedMenuExercises.displayOrder,
    })
    .from(aiGeneratedMenuExercises)
    .where(
      eq(
        aiGeneratedMenuExercises.menuId,
        menu.id,
      ),
    )
    .orderBy(
      aiGeneratedMenuExercises.displayOrder,
    );

  // メニュー全体と種目をJSON文字列にしてOpenAIへ返す
  return JSON.stringify({
    menu: {
      recommendedBodyPart:
        menu.recommendedBodyPart,
      reason: menu.reason,
      estimatedMinutes:
        menu.estimatedMinutes,
      advice: menu.advice,
      conditionScore:
        menu.conditionScore,
      requestNote: menu.requestNote,
      createdAt: menu.createdAt,
      exercises,
    },
  });
}

// 認証済みの本人の最近の体重履歴を取得する
async function getWeightHistory(
  clerkUserId: string,
) {
  // Neonを操作するDB接続を取得する
  const db = getDb();

  // ClerkユーザーIDが一致する本人の体重履歴を新しい順で取得する
  const newestRecords = await db
    .select({
      recordedDate:
        weightRecords.recordedDate,
      weightKg:
        weightRecords.weightKg,
    })
    .from(weightRecords)
    .innerJoin(
      users,
      eq(
        weightRecords.userId,
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
        weightRecords.recordedDate,
      ),
    )
    // AIへ渡すデータ量を増やしすぎないよう最大90件にする
    .limit(90);

  // 体重記録がまだない場合はデータなしを返す
  if (newestRecords.length === 0) {
    return JSON.stringify({
      records: [],
      message:
        "体重履歴はまだありません。",
    });
  }

  // AIが変化を読みやすいように古い日付順へ並べ直す
  const records = [
    ...newestRecords,
  ].reverse();

  // 最も古い記録と最新記録を取得する
  const firstRecord =
    records[0];

  const latestRecord =
    records.at(-1);

  // 念のため記録を取得できなければデータなしを返す
  if (
    !firstRecord ||
    !latestRecord
  ) {
    return JSON.stringify({
      records: [],
      message:
        "体重履歴はまだありません。",
    });
  }

  // 最初から最新までの体重変化を計算する
  const totalChangeKg = Number(
    (
      latestRecord.weightKg -
      firstRecord.weightKg
    ).toFixed(1),
  );

  // 最初と最新の記録が何日離れているか計算する
  const elapsedDays = Math.round(
    (
      Date.parse(
        latestRecord.recordedDate,
      ) -
      Date.parse(
        firstRecord.recordedDate,
      )
    ) /
      (1000 * 60 * 60 * 24),
  );

  // 1週間あたりの平均体重変化を計算する
  const weeklyChangeKg =
    elapsedDays > 0
      ? Number(
          (
            totalChangeKg /
            elapsedDays *
            7
          ).toFixed(2),
        )
      : null;

  // 履歴と変化の概要をOpenAIへ渡せるJSON文字列にする
  return JSON.stringify({
    records,
    summary: {
      firstWeightKg:
        firstRecord.weightKg,
      latestWeightKg:
        latestRecord.weightKg,
      totalChangeKg,
      elapsedDays,
      weeklyChangeKg,
      recordCount:
        records.length,
    },
  });
}