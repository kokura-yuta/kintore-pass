// フロントエンドから受け取った1回分のトレーニング記録をNeonへ保存するAPI
// ClerkユーザーIDと一致するNeonユーザーを検索する比較機能
// 本人の記録検索・新しい順の並び替えに使うDrizzle機能
import {
  desc,
  eq,
} from "drizzle-orm";

// 認証確認とNeon接続をトレーニング記録APIで使えるようにする
import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import { getDb } from "@/db";

// ユーザー・トレーニング・種目・セットのテーブルを保存処理で使えるようにする
import {
  trainingExercises,
  trainingSessions,
  trainingSets,
  users,
} from "@/db/schema";

type TrainingSetInput = {
  setNumber: number;
  weightKg?: number | null;
  reps?: number | null;
};

type TrainingExerciseInput = {
  exerciseId: string;
  exerciseName: string;
  bodyPart: string;
  bodyArea?: string | null;
  displayOrder: number;
  sets: TrainingSetInput[];
};

type CreateTrainingRecordInput = {
  performedAt?: string;
  durationMinutes?: number | null;
  conditionScore?: number | null;
  memo?: string | null;
  exercises: TrainingExerciseInput[];
};

// 任意入力の数値が、nullまたは指定範囲内の数値か確認する
function isOptionalNumberInRange(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= minimum &&
      value <= maximum)
  );
}

// 任意入力の値が、nullまたは指定範囲内の整数か確認する
function isOptionalIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= minimum &&
      value <= maximum)
  );
}


// GET通信を受け取り、ログイン中のユーザーのトレーニング履歴を取得する
export async function GET(request: Request) {
  try {
    const clerkUserId =
      await getClerkUserId(request);

    if (!clerkUserId) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    const db = getDb();

    // ClerkユーザーIDから本人のトレーニング履歴を新しい順で取得する
    const sessions = await db
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
    .innerJoin(
        users,
        eq(
        trainingSessions.userId,
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
        desc(trainingSessions.performedAt),
    )
    .limit(50);

    // 各トレーニングに、その日に実施した種目を追加する
    const records = await Promise.all(
        sessions.map(async (session) => {
            const exercises = await db
            .select()
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

     const exercisesWithSets =
        await Promise.all(
            exercises.map(async (exercise) => {
            const sets = await db
                .select()
                .from(trainingSets)
                .where(
                    eq(
                        trainingSets.trainingExerciseId,
                        exercise.id,
                        ),
                        )
                .orderBy(trainingSets.setNumber);

                return {
                     ...exercise,
                    sets,
                };
    }),
  );

return {
  ...session,
  exercises: exercisesWithSets,
};
        }),
        );

    return Response.json({
    records,
    });
  } catch (error) {
    console.error(
      "トレーニング履歴の取得に失敗しました。",
      error,
    );

    return Response.json(
      {
        error:
          "トレーニング履歴の取得に失敗しました。",
      },
      { status: 500 },
    );
  }
}
// POST通信を受け取り、ログイン中のユーザーのトレーニング記録を保存する
export async function POST(request: Request) {
  try {
    const clerkUserId = await getClerkUserId(request);

    if (!clerkUserId) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    const input =
      (await request.json()) as CreateTrainingRecordInput;
    // 種目が1件以上あり、時間・調子・メモが許可範囲内か確認する
    if (
    !Array.isArray(input.exercises) ||
    input.exercises.length === 0 ||
    !isOptionalIntegerInRange(
        input.durationMinutes,
        1,
        300,
    ) ||
    !isOptionalIntegerInRange(
        input.conditionScore,
        1,
        10,
    ) ||
    (input.memo !== undefined &&
        input.memo !== null &&
        (typeof input.memo !== "string" ||
        input.memo.length > 1000))
    ) {
    return Response.json(
        {
        error:
            "トレーニング記録の入力内容を確認してください。",
        },
        { status: 400 },
    );
    }

    // 各種目に必要な文字・表示順・セット一覧が正しく入っているか確認する
const hasInvalidExercise = input.exercises.some(
  (exercise) =>
    typeof exercise.exerciseId !== "string" ||
    exercise.exerciseId.trim() === "" ||
    typeof exercise.exerciseName !== "string" ||
    exercise.exerciseName.trim() === "" ||
    typeof exercise.bodyPart !== "string" ||
    exercise.bodyPart.trim() === "" ||
    !Number.isInteger(exercise.displayOrder) ||
    exercise.displayOrder < 0 ||
    !Array.isArray(exercise.sets) ||
    exercise.sets.length === 0,
);

if (hasInvalidExercise) {
  return Response.json(
    {
      error:
        "種目またはセットの入力内容を確認してください。",
    },
    { status: 400 },
  );
}

// 全種目のセットを確認し、不正なセットが1件でもあるか調べる
const hasInvalidSet = input.exercises.some(
  (exercise) =>
    exercise.sets.some(
      (set) =>
        !Number.isInteger(set.setNumber) ||
        set.setNumber < 1 ||
        !isOptionalNumberInRange(
          set.weightKg,
          0,
          1000,
        ) ||
        !isOptionalIntegerInRange(
          set.reps,
          0,
          1000,
        ),
    ),
);

if (hasInvalidSet) {
  return Response.json(
    {
      error:
        "セット番号・重量・回数を確認してください。",
    },
    { status: 400 },
  );
}

// Neonへ接続し、ログイン中のClerkユーザーに対応するusers.idを検索する
const db = getDb();

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

const user = matchedUsers[0] ?? null;

if (!user) {
  return Response.json(
    {
      error:
        "ユーザー情報が見つかりません。",
    },
    { status: 404 },
  );
}

// 送信された実施日時をDateへ変換し、未指定なら現在日時を使用する
const performedAt =
  input.performedAt === undefined
    ? new Date()
    : typeof input.performedAt === "string"
      ? new Date(input.performedAt)
      : null;

if (
  performedAt === null ||
  Number.isNaN(performedAt.getTime())
) {
  return Response.json(
    {
      error:
        "トレーニングの実施日時を確認してください。",
    },
    { status: 400 },
  );
}

// 1回分のトレーニング全体をtraining_sessionsへ保存する
const createdSessions = await db
  .insert(trainingSessions)
  .values({
    userId: user.id,
    performedAt,
    durationMinutes:
      input.durationMinutes ?? null,
    conditionScore:
      input.conditionScore ?? null,
    memo:
      input.memo?.trim() || null,
  })
  .returning({
    id: trainingSessions.id,
  });

const session = createdSessions[0] ?? null;

if (!session) {
  throw new Error(
    "トレーニング全体を保存できませんでした。",
  );
}

// 選択された種目を1件ずつtraining_exercisesへ保存する
for (const exercise of input.exercises) {
  const createdExercises = await db
    .insert(trainingExercises)
    .values({
      sessionId: session.id,
      exerciseId: exercise.exerciseId.trim(),
      exerciseName:
        exercise.exerciseName.trim(),
      bodyPart: exercise.bodyPart.trim(),
      bodyArea:
        exercise.bodyArea?.trim() || null,
      displayOrder: exercise.displayOrder,
    })
    .returning({
      id: trainingExercises.id,
    });

  const createdExercise =
    createdExercises[0] ?? null;

  if (!createdExercise) {
    throw new Error(
      "トレーニング種目を保存できませんでした。",
    );
  }

 // 現在の種目に含まれる全セットをtraining_setsへまとめて保存する
    await db
    .insert(trainingSets)
    .values(
        exercise.sets.map((set) => ({
        trainingExerciseId:
            createdExercise.id,
        setNumber: set.setNumber,
        weightKg: set.weightKg ?? null,
        reps: set.reps ?? null,
        })),
    );
}

    // 保存した親記録のIDをフロントエンドへ成功結果として返す
    return Response.json(
    {
        message:
        "トレーニング記録を保存しました。",
        trainingSessionId: session.id,
    },
    { status: 201 },
    );
  } catch (error) {
    console.error(
      "トレーニング記録の保存に失敗しました。",
      error,
    );

    

    return Response.json(
      {
        error:
          "トレーニング記録の保存に失敗しました。",
      },
      { status: 500 },
    );
  }
}