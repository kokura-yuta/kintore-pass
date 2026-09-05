// フロントエンドから受け取った1回分のトレーニング記録をNeonへ保存するAPI
// ClerkユーザーIDと一致するNeonユーザーを検索する比較機能
// 本人の記録検索・新しい順の並び替えに使うDrizzle機能
import {
  and,
  count,
  desc,
  eq,
  exists,
  gte,
  lt,
  sql,
} from "drizzle-orm";

// 認証確認とNeon接続をトレーニング記録APIで使えるようにする
import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import { createRequestFingerprint } from "@/app/lib/idempotency/createRequestFingerprint";
import {
  deleteTrainingRecordSchema,
  trainingRecordSchema,
  updateTrainingRecordSchema,
} from "@/app/lib/validation/apiSchemas";
import { getDb } from "@/db";

// ユーザー・トレーニング・種目・セットのテーブルを保存処理で使えるようにする
import {
  aiRequestGuards,
  trainingExercises,
  trainingSessions,
  trainingSets,
  users,
} from "@/db/schema";

// 履歴取得で一度に返せる最大件数
const maximumHistoryLimit = 50;

// 日本時間とUTCの差をミリ秒で表す
const japanTimeOffsetMilliseconds =
  9 * 60 * 60 * 1000;

// pageとlimitを1以上の整数へ変換する
function parsePositiveInteger(
  value: string | null,
  fallback: number,
  maximum: number,
) {
  // URLに値がなければ初期値を使用する
  if (value === null) {
    return fallback;
  }

  const parsedValue = Number(value);

  // 小数・0・負数・文字列なら無効にする
  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1
  ) {
    return null;
  }

  // 大きすぎる値は上限までにする
  return Math.min(
    parsedValue,
    maximum,
  );
}

// YYYY-MM-DDを日本時間の0時へ変換する
function parseJapanDate(
  value: string | null,
) {
  // 日付指定がなければ絞り込まない
  if (value === null) {
    return null;
  }

  const matchedDate =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  // YYYY-MM-DD形式でなければ無効にする
  if (!matchedDate) {
    return undefined;
  }

  const year = Number(matchedDate[1]);
  const month = Number(matchedDate[2]);
  const day = Number(matchedDate[3]);

  const utcCalendarDate = new Date(
    Date.UTC(year, month - 1, day),
  );

  // 2月31日など、存在しない日付を拒否する
  if (
    utcCalendarDate.getUTCFullYear() !==
      year ||
    utcCalendarDate.getUTCMonth() !==
      month - 1 ||
    utcCalendarDate.getUTCDate() !== day
  ) {
    return undefined;
  }

  // 日本時間0時をUTCの日時へ直して返す
  return new Date(
    utcCalendarDate.getTime() -
      japanTimeOffsetMilliseconds,
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

        // フロントから送られた履歴検索条件をURLから取得する
    const requestUrl = new URL(
      request.url,
    );

    const page = parsePositiveInteger(
      requestUrl.searchParams.get("page"),
      1,
      100000,
    );

    const limit = parsePositiveInteger(
      requestUrl.searchParams.get("limit"),
      maximumHistoryLimit,
      maximumHistoryLimit,
    );

    const dateFrom = parseJapanDate(
      requestUrl.searchParams.get(
        "dateFrom",
      ),
    );

    const dateTo = parseJapanDate(
      requestUrl.searchParams.get(
        "dateTo",
      ),
    );

    const bodyPart =
      requestUrl.searchParams
        .get("bodyPart")
        ?.trim() || null;

    // 数値・日付・部位が不正ならNeonを検索しない
    if (
      page === null ||
      limit === null ||
      dateFrom === undefined ||
      dateTo === undefined ||
      (
        dateFrom !== null &&
        dateTo !== null &&
        dateFrom.getTime() >
          dateTo.getTime()
      ) ||
      (
        bodyPart !== null &&
        bodyPart.length > 50
      )
    ) {
      return Response.json(
        {
          error:
            "履歴の検索条件を確認してください。",
        },
        { status: 400 },
      );
    }

    // 終了日は、その翌日の0時より前までを検索対象にする
    const dateToExclusive =
      dateTo === null
        ? null
        : new Date(
            dateTo.getTime() +
              24 * 60 * 60 * 1000,
          );

    // 1ページ目なら0件、2ページ目ならlimit件分を飛ばす
    const offset =
      (page - 1) * limit;

    const db = getDb();

    // 指定部位を含むトレーニング記録が存在するか確認する条件
    const bodyPartCondition =
      bodyPart === null
        ? undefined
        : exists(
            db
              .select({
                value: sql`1`,
              })
              .from(trainingExercises)
              .where(
                and(
                  eq(
                    trainingExercises.sessionId,
                    trainingSessions.id,
                  ),
                  eq(
                    trainingExercises.bodyPart,
                    bodyPart,
                  ),
                ),
              ),
          );

    // 本人・開始日・終了日・部位の検索条件をまとめる
    const historyWhereCondition =
      and(
        eq(
          users.clerkUserId,
          clerkUserId,
        ),
        dateFrom === null
          ? undefined
          : gte(
              trainingSessions.performedAt,
              dateFrom,
            ),
        dateToExclusive === null
          ? undefined
          : lt(
              trainingSessions.performedAt,
              dateToExclusive,
            ),
        bodyPartCondition,
      );

    // 総件数と現在ページの履歴をNeonからまとめて取得する
    const [
      totalResults,
      sessions,
    ] = await db.batch([
      // 検索条件に合う履歴の総件数を数える
      db
        .select({
          total: count(
            trainingSessions.id,
          ),
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
          historyWhereCondition,
        ),

      // 現在ページに表示する履歴だけを取得する
      db
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
          historyWhereCondition,
        )
        .orderBy(
          desc(
            trainingSessions.performedAt,
          ),
          desc(trainingSessions.id),
        )
        .limit(limit)
        .offset(offset),
    ]);

    // Neonの件数を通常のnumber型へ変換する
    const total = Number(
      totalResults[0]?.total ?? 0,
    );

    // 総件数から全部で何ページあるか計算する
    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / limit);

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
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
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
  // 失敗時に重複防止の受付記録を削除できるようIDを保持する
  let requestGuardId: string | null = null;

  try {
    const clerkUserId = await getClerkUserId(request);

    if (!clerkUserId) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    // JSONを型が未確認のデータとして受け取る
    const rawInput: unknown =
      await request
        .json()
        .catch(() => null);

    // 共通検査に失敗したらNeonへ保存しない
    const parsedInput =
      trainingRecordSchema.safeParse(rawInput);

    if (!parsedInput.success) {
      return Response.json(
        {
          error:
            "トレーニング記録の入力内容を確認してください。",
        },
        { status: 400 },
      );
    }

    // 検査後の安全な記録データを使用する
    const input = parsedInput.data;

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

// 同じ本人・日時・入力内容なら同じUUIDになる二重送信判定IDを作る
const requestId =
  await createRequestFingerprint(
    JSON.stringify({
      userId: user.id,
      performedAt:
        performedAt.toISOString(),
      durationMinutes:
        input.durationMinutes ?? null,
      conditionScore:
        input.conditionScore ?? null,
      memo: input.memo?.trim() || null,
      exercises: input.exercises.map(
        (exercise) => ({
          exerciseId:
            exercise.exerciseId.trim(),
          exerciseName:
            exercise.exerciseName.trim(),
          bodyPart:
            exercise.bodyPart.trim(),
          bodyArea:
            exercise.bodyArea?.trim() ||
            null,
          displayOrder:
            exercise.displayOrder,
          sets: exercise.sets.map(
            (set) => ({
              setNumber: set.setNumber,
              weightKg:
                set.weightKg ?? null,
              reps: set.reps ?? null,
            }),
          ),
        }),
      ),
    }),
  );

// 同じ保存要求は最初の1件だけ受付記録を作る
const insertedGuards = await db
  .insert(aiRequestGuards)
  .values({
    userId: user.id,
    requestType: "training-record",
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
        "同じトレーニング記録を処理中または保存済みです。",
      requestId,
    },
    { status: 409 },
  );
}

// Neonへ送る前に、記録全体を識別するUUIDを作る
const trainingSessionId =
  crypto.randomUUID();

// 各種目にも先にUUIDを付け、種目とセットの親子関係を準備する
const exercisesWithIds =
  input.exercises.map((exercise) => ({
    id: crypto.randomUUID(),
    exercise,
  }));

// 全種目をtraining_exercisesへ保存できる形へ変換する
const exerciseRows = exercisesWithIds.map(
  ({ id, exercise }) => ({
    id,
    sessionId: trainingSessionId,
    exerciseId: exercise.exerciseId.trim(),
    exerciseName:
      exercise.exerciseName.trim(),
    bodyPart: exercise.bodyPart.trim(),
    bodyArea:
      exercise.bodyArea?.trim() || null,
    displayOrder: exercise.displayOrder,
  }),
);

// 全種目の全セットを1つの配列へまとめ、親種目のUUIDを付ける
const setRows = exercisesWithIds.flatMap(
  ({ id, exercise }) =>
    exercise.sets.map((set) => ({
      id: crypto.randomUUID(),
      trainingExerciseId: id,
      setNumber: set.setNumber,
      weightKg: set.weightKg ?? null,
      reps: set.reps ?? null,
    })),
);

// 記録全体・全種目・全セットを1回のトランザクションで保存する
await db.batch([
  db.insert(trainingSessions).values({
    id: trainingSessionId,
    userId: user.id,
    performedAt,
    durationMinutes:
      input.durationMinutes ?? null,
    conditionScore:
      input.conditionScore ?? null,
    memo: input.memo?.trim() || null,
  }),
  db.insert(trainingExercises).values(
    exerciseRows,
  ),
  db.insert(trainingSets).values(setRows),
]);

    // 保存した親記録のIDをフロントエンドへ成功結果として返す
    return Response.json(
    {
        message:
        "トレーニング記録を保存しました。",
        trainingSessionId,
    },
    { status: 201 },
    );
  } catch (error) {
    // 保存失敗時は受付記録を消し、同じ内容を安全に再送できるようにする
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
          "トレーニング記録の二重送信管理を解除できませんでした。",
          cleanupError,
        );
      }
    }

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

// DELETEで受け取る削除対象IDの形
// ログイン中の本人が所有する記録だけを削除する
export async function DELETE(
  request: Request,
) {
  try {
    // Clerkトークンからログイン中の本人IDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // 未ログインなら削除しない
    if (!clerkUserId) {
      return Response.json(
        {
          error:
            "ログインが必要です。",
        },
        { status: 401 },
      );
    }

    // フロントから削除対象の記録IDを受け取る
    const parsedInput =
      deleteTrainingRecordSchema.safeParse(
        await request.json().catch(() => null),
      );

    // IDがUUID形式でなければNeonへ送らない
    if (
      !parsedInput.success
    ) {
      return Response.json(
        {
          error:
            "トレーニング記録IDを確認してください。",
        },
        { status: 400 },
      );
    }

    const input = parsedInput.data;

    // Neonへ接続する
    const db = getDb();

    // ClerkユーザーIDから本人のNeonユーザーIDを取得する
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

    const currentUser =
      matchedUsers[0] ?? null;

    // Neonに本人情報がなければ削除しない
    if (!currentUser) {
      return Response.json(
        {
          error:
            "ユーザー情報が見つかりません。",
        },
        { status: 404 },
      );
    }

    // 記録IDと本人IDが両方一致する記録だけを削除する
    const deletedSessions = await db
      .delete(trainingSessions)
      .where(
        and(
          eq(
            trainingSessions.id,
            input.trainingSessionId,
          ),
          eq(
            trainingSessions.userId,
            currentUser.id,
          ),
        ),
      )
      .returning({
        id: trainingSessions.id,
      });

    // 0件なら存在しないか他人の記録なので同じ404を返す
    if (deletedSessions.length === 0) {
      return Response.json(
        {
          error:
            "トレーニング記録が見つかりません。",
        },
        { status: 404 },
      );
    }

    // 削除できた本人の記録IDを返す
    return Response.json({
      message:
        "トレーニング記録を削除しました。",
      deletedTrainingSessionId:
        deletedSessions[0].id,
    });
  } catch (error) {
    // 詳しい原因は利用者へ返さずログへ残す
    console.error(
      "トレーニング記録の削除に失敗しました。",
      error,
    );

    return Response.json(
      {
        error:
          "トレーニング記録の削除に失敗しました。",
      },
      { status: 500 },
    );
  }
}

// PATCHで受け取る更新対象IDと新しい記録内容の形
// トレーニング記録の更新通信を受け取る
export async function PATCH(
  request: Request,
) {
  try {
    // Clerkトークンからログイン中の本人IDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // 未ログインなら更新しない
    if (!clerkUserId) {
      return Response.json(
        {
          error:
            "ログインが必要です。",
        },
        { status: 401 },
      );
    }

    // 更新対象IDと新しい記録内容をJSONで受け取る
    const parsedInput =
      updateTrainingRecordSchema.safeParse(
        await request.json().catch(() => null),
      );

    // JSONがない、または記録IDがUUID形式でなければ停止する
    if (
      !parsedInput.success
    ) {
      return Response.json(
        {
          error:
            "トレーニング記録IDを確認してください。",
        },
        { status: 400 },
      );
    }

    const input = parsedInput.data;

    // Neonへ接続する
    const db = getDb();

    // 記録IDとClerkユーザーIDを両方使い、本人の記録だけを取得する
    const matchedSessions = await db
      .select({
        id: trainingSessions.id,
        userId:
          trainingSessions.userId,
        performedAt:
          trainingSessions.performedAt,
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
        and(
          eq(
            trainingSessions.id,
            input.trainingSessionId,
          ),
          eq(
            users.clerkUserId,
            clerkUserId,
          ),
        ),
      )
      .limit(1);

    // 検索結果の先頭を取り出し、なければnullにする
    const currentSession =
      matchedSessions[0] ?? null;

    // 存在しない記録と他人の記録は、どちらも同じ404を返す
    if (!currentSession) {
      return Response.json(
        {
          error:
            "トレーニング記録が見つかりません。",
        },
        { status: 404 },
      );
    }

    // 新しい日時があれば変換し、未指定なら現在の保存日時を維持する
    const performedAt =
      input.performedAt === undefined
        ? currentSession.performedAt
        : new Date(
            input.performedAt,
          );

    // 新しい種目とセットをNeonへ保存できる行の形に変換する
    const preparedExercises =
      input.exercises.map((exercise) => {
        // 種目とセットを結び付けるため、保存前に種目IDを作る
        const trainingExerciseId =
          crypto.randomUUID();

        return {
          exerciseRow: {
            id: trainingExerciseId,
            sessionId: currentSession.id,
            exerciseId:
              exercise.exerciseId.trim(),
            exerciseName:
              exercise.exerciseName.trim(),
            bodyPart:
              exercise.bodyPart.trim(),
            bodyArea:
              exercise.bodyArea?.trim() ||
              null,
            displayOrder:
              exercise.displayOrder,
          },

          setRows: exercise.sets.map(
            (set) => ({
              trainingExerciseId,
              setNumber: set.setNumber,
              weightKg:
                set.weightKg ?? null,
              reps: set.reps ?? null,
            }),
          ),
        };
      });

    // 種目だけの配列を取り出す
    const newExerciseRows =
      preparedExercises.map(
        (exercise) =>
          exercise.exerciseRow,
      );

    // 各種目のセットを1つの配列にまとめる
    const newSetRows =
      preparedExercises.flatMap(
        (exercise) => exercise.setRows,
      );
    // 記録本体・種目・セットをNeonへまとめて反映する
    await db.batch([
      // 日時・時間・調子・メモを更新する
      db
        .update(trainingSessions)
        .set({
          performedAt,
          durationMinutes:
            input.durationMinutes ?? null,
          conditionScore:
            input.conditionScore ?? null,
          memo:
            input.memo?.trim() || null,
        })
        .where(
          and(
            eq(
              trainingSessions.id,
              currentSession.id,
            ),
            eq(
              trainingSessions.userId,
              currentSession.userId,
            ),
          ),
        ),

      // 更新前の種目を削除する
      db
        .delete(trainingExercises)
        .where(
          eq(
            trainingExercises.sessionId,
            currentSession.id,
          ),
        ),

      // 更新後の種目を保存する
      db
        .insert(trainingExercises)
        .values(newExerciseRows),

      // 更新後のセットを保存する
      db
        .insert(trainingSets)
        .values(newSetRows),
    ]);

    // 更新成功をフロントへ返す
    return Response.json({
      message:
        "トレーニング記録を更新しました。",
      trainingSessionId:
        currentSession.id,
    });
  } catch (error) {
    // 詳しい原因は利用者へ返さずログへ残す
    console.error(
      "トレーニング記録の更新に失敗しました。",
      error,
    );

    return Response.json(
      {
        error:
          "トレーニング記録の更新に失敗しました。",
      },
      { status: 500 },
    );
  }
}
