// AIへ送る本人情報と古い相談を、追加API料金なしで短い要約にするファイル
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  users,
  weightRecords,
} from "@/db/schema";
import {
  getUserAiContext,
} from "@/app/lib/ai/getUserAiContext";
import {
  maxChatSummaryCharacters,
} from "@/app/lib/ai/config";

const consultationMarker =
  "過去の重要な相談:";

function compactText(
  value: string | null | undefined,
  maximum = 120,
) {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

// すでに保存した相談メモ部分だけを取り出す
function readExistingConsultations(
  summary: string,
) {
  const markerIndex = summary.indexOf(
    consultationMarker,
  );

  if (markerIndex < 0) return [];

  return summary
    .slice(
      markerIndex +
        consultationMarker.length,
    )
    .split(" / ")
    .map((item) => compactText(item))
    .filter(Boolean);
}

// プロフィール・最近の記録・古い相談を800文字以内へまとめる
export async function buildChatSummary({
  clerkUserId,
  existingSummary,
  newlyOldUserMessages,
}: {
  clerkUserId: string;
  existingSummary: string;
  newlyOldUserMessages: string[];
}) {
  const aiContext =
    await getUserAiContext(clerkUserId);

  if (!aiContext) return existingSummary;

  const db = getDb();
  const latestWeights = await db
    .select({
      weightKg: weightRecords.weightKg,
      recordedDate:
        weightRecords.recordedDate,
    })
    .from(weightRecords)
    .innerJoin(
      users,
      eq(weightRecords.userId, users.id),
    )
    .where(
      eq(users.clerkUserId, clerkUserId),
    )
    .orderBy(
      desc(weightRecords.recordedDate),
    )
    .limit(1);

  const profile = aiContext.profile;
  const priorityAreas =
    aiContext.latestBodyAnalysis?.areas
      .filter(
        (area) =>
          area.priority === "high",
      )
      .slice(0, 3)
      .map((area) => area.bodyPart) ?? [];

  const recentExercises = Array.from(
    new Set(
      aiContext.recentTrainingSessions
        .slice(0, 3)
        .flatMap((session) =>
          session.exercises.map(
            (exercise) =>
              exercise.exerciseName,
          ),
        ),
    ),
  ).slice(0, 8);

  const latestMenu =
    aiContext.recentAiMenus[0] ?? null;
  const latestWeight =
    latestWeights[0] ?? null;
  const recentFoodTotals =
    aiContext.recentFoodRecords.reduce(
      (totals, record) => ({
        calories:
          totals.calories + record.calories,
        proteinGrams:
          totals.proteinGrams +
          record.proteinGrams,
      }),
      {
        calories: 0,
        proteinGrams: 0,
      },
    );

  const factLines = [
    `目標:${aiContext.goalBodyType ?? "未設定"}`,
    profile
      ? `身体:${profile.heightCm}cm/${profile.weightKg}kg${profile.bodyFatPercentage === null ? "" : `/体脂肪${profile.bodyFatPercentage}%`}`
      : "身体:未設定",
    `頻度:${profile?.weeklyTrainingDays ?? "未設定"}日/週`,
    `利用環境・器具目安:${profile?.trainingLocation ?? "未設定"}`,
    `苦手部位:${profile?.weakBodyParts?.join("、") || "未設定"}`,
    priorityAreas.length
      ? `分析上の優先部位:${priorityAreas.join("、")}`
      : "",
    aiContext.latestBodyAnalysis
      ? `最新身体分析:${compactText(aiContext.latestBodyAnalysis.summary, 100)}／理想との差:${compactText(aiContext.latestBodyAnalysis.goalDifference, 100)}`
      : "",
    recentExercises.length
      ? `最近の種目:${recentExercises.join("、")}`
      : "",
    latestWeight
      ? `最新体重:${latestWeight.weightKg}kg(${latestWeight.recordedDate})`
      : "",
    aiContext.recentFoodRecords.length
      ? `最近7日間の食事:${recentFoodTotals.calories}kcal・たんぱく質${Math.round(recentFoodTotals.proteinGrams)}g（記録合計）`
      : "",
    latestMenu
      ? `最新AIメニュー:${compactText(latestMenu.recommendedBodyPart, 40)}・${compactText(latestMenu.reason, 100)}`
      : "",
  ].filter(Boolean);

  const consultationNotes = Array.from(
    new Set([
      ...readExistingConsultations(
        existingSummary,
      ),
      ...newlyOldUserMessages.map(
        (message) =>
          compactText(message),
      ),
    ]),
  )
    .filter(Boolean)
    .slice(-5);

  const summary = [
    ...factLines,
    consultationNotes.length
      ? `${consultationMarker}${consultationNotes.join(" / ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return summary.slice(
    0,
    maxChatSummaryCharacters,
  );
}
