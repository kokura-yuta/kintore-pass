// AIメニューとAIチャットへ渡す本人データをNeonからまとめて取得する場所
// このファイルではOpenAIを呼ばず、AIへ渡す前の事実データだけを準備する
import {
  and,
  desc,
  eq,
} from "drizzle-orm";

import { getDb } from "@/db";

import {
  aiGeneratedMenuExercises,
  aiGeneratedMenus,
  bodyAnalyses,
  bodyAnalysisAreas,
  trainingExercises,
  trainingSessions,
  trainingSets,
  userProfiles,
  users,
} from "@/db/schema";

// AIへ渡す共通ユーザーデータの形を決める
export type UserAiContext = {
  userId: string;
  goalBodyType: string | null;

  profile: {
    heightCm: number;
    weightKg: number;
    bodyFatPercentage: number | null;
    weeklyTrainingDays: number | null;
    availableMinutes: number | null;
    trainingLocation: string | null;
    weakBodyParts: string[] | null;
  } | null;

  // 最新の身体分析結果と部位別評価
  latestBodyAnalysis: {
    id: string;
    summary: string | null;
    goalDifference: string | null;
    analyzedAt: Date | null;

    areas: {
      bodyPart: string;
      score: number | null;
      priority: string | null;
      observation: string | null;
      recommendation: string | null;
    }[];
  } | null;

  // AIが参考にする最近のトレーニング履歴
  recentTrainingSessions: {
    id: string;
    performedAt: Date;
    durationMinutes: number | null;
    conditionScore: number | null;
    memo: string | null;

    exercises: {
      exerciseName: string;
      bodyPart: string;
      bodyArea: string | null;

      sets: {
        setNumber: number;
        weightKg: number | null;
        reps: number | null;
      }[];
    }[];
  }[];

  // 同じ内容が続きすぎないようにAIが比較する直近の生成メニュー
  recentAiMenus: {
    id: string;
    recommendedBodyPart: string;
    reason: string;
    createdAt: Date;

    exercises: {
      exerciseName: string;
      bodyPart: string;
      bodyArea: string | null;
    }[];
  }[];
};

// 1種目に記録されたセット番号・重量・回数を取得する
async function getSetsForExercise(
  trainingExerciseId: string,
) {
  const db = getDb();

  const sets = await db
    .select({
      setNumber: trainingSets.setNumber,
      weightKg: trainingSets.weightKg,
      reps: trainingSets.reps,
    })
    .from(trainingSets)
    .where(
      eq(
        trainingSets.trainingExerciseId,
        trainingExerciseId,
      ),
    )
    .orderBy(trainingSets.setNumber);

  return sets;
}

// 認証済みのClerkユーザーIDからAI用の本人データを取得する
export async function getUserAiContext(
  clerkUserId: string,
): Promise<UserAiContext | null> {
  const db = getDb();

  // 本人の理想体型とプロフィールを1回の検索で取得する
  const matchedUsers = await db
    .select({
      userId: users.id,
      goalBodyType: users.goalBodyType,
      profileId: userProfiles.id,
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
    return null;
  }
  // 本人の完了済み身体分析を新しい順で最大1件取得する
  const matchedAnalyses = await db
    .select({
      id: bodyAnalyses.id,
      summary: bodyAnalyses.summary,
      goalDifference:
        bodyAnalyses.goalDifference,
      analyzedAt: bodyAnalyses.analyzedAt,
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
    .orderBy(
      desc(bodyAnalyses.analyzedAt),
    )
    .limit(1);

  const latestAnalysis =
    matchedAnalyses[0] ?? null;
  // 最新分析がある場合だけ肩・胸・背中などの部位別評価を取得する
  const latestAnalysisAreas =
    latestAnalysis
      ? await db
          .select({
            bodyPart:
              bodyAnalysisAreas.bodyPart,
            score:
              bodyAnalysisAreas.score,
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
              latestAnalysis.id,
            ),
          )
      : [];
  // 本人の最近10回のトレーニング記録を新しい順で取得する
  const recentSessions = await db
    .select({
      id: trainingSessions.id,
      performedAt:
        trainingSessions.performedAt,
      durationMinutes:
        trainingSessions.durationMinutes,
      conditionScore:
        trainingSessions.conditionScore,
      memo: trainingSessions.memo,
    })
    .from(trainingSessions)
    .where(
      eq(
        trainingSessions.userId,
        user.userId,
      ),
    )
    .orderBy(
      desc(trainingSessions.performedAt),
    )
    .limit(10);
  // 各トレーニング記録へ、その日に実施した種目を追加する
  const sessionsWithExercises =
    await Promise.all(
      recentSessions.map(
        async (session) => {
          const exercises = await db
            .select({
              id: trainingExercises.id,
              exerciseName:
                trainingExercises.exerciseName,
              bodyPart:
                trainingExercises.bodyPart,
              bodyArea:
                trainingExercises.bodyArea,
              displayOrder:
                trainingExercises.displayOrder,
            })
            .from(trainingExercises)
            .where(
              eq(
                trainingExercises.sessionId,
                session.id,
              ),
            )
            .orderBy(
              trainingExercises.displayOrder,
            );

          return {
            session,
            exercises,
          };
        },
      ),
    );
  // 各種目へセット番号・重量・回数を追加する
  const recentTrainingSessions =
    await Promise.all(
      sessionsWithExercises.map(
        async ({ session, exercises }) => {
          const exercisesWithSets =
            await Promise.all(
              exercises.map(
                async (exercise) => {
                  const sets =
                    await getSetsForExercise(
                      exercise.id,
                    );

                  return {
                    exerciseName:
                      exercise.exerciseName,
                    bodyPart:
                      exercise.bodyPart,
                    bodyArea:
                      exercise.bodyArea,
                    sets,
                  };
                },
              ),
            );

          return {
            ...session,
            exercises: exercisesWithSets,
          };
        },
      ),
    );
  // 本人が直近に生成したAIメニュー本体を新しい順で3件取得する
  const recentMenus = await db
    .select({
      id: aiGeneratedMenus.id,
      recommendedBodyPart:
        aiGeneratedMenus.recommendedBodyPart,
      reason: aiGeneratedMenus.reason,
      createdAt: aiGeneratedMenus.createdAt,
    })
    .from(aiGeneratedMenus)
    .where(
      eq(
        aiGeneratedMenus.userId,
        user.userId,
      ),
    )
    .orderBy(
      desc(aiGeneratedMenus.createdAt),
      desc(aiGeneratedMenus.id),
    )
    .limit(3);

  // 各メニューへ、比較に必要な種目名と部位を追加する
  const recentAiMenus =
    await Promise.all(
      recentMenus.map(
        async (menu) => {
          const exercises = await db
            .select({
              exerciseName:
                aiGeneratedMenuExercises.exerciseName,
              bodyPart:
                aiGeneratedMenuExercises.bodyPart,
              bodyArea:
                aiGeneratedMenuExercises.bodyArea,
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

          return {
            ...menu,
            exercises,
          };
        },
      ),
    );

  // Neonから集めた本人情報をAI用の1つのデータにまとめて返す
  return {
    userId: user.userId,
    goalBodyType: user.goalBodyType,

    profile:
      user.profileId !== null &&
      user.heightCm !== null &&
      user.weightKg !== null
        ? {
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
          }
        : null,

    latestBodyAnalysis: latestAnalysis
      ? {
          ...latestAnalysis,
          areas: latestAnalysisAreas,
        }
      : null,

    recentTrainingSessions,
    recentAiMenus,
  };
}
