// ログイン中の本人が食事記録を保存・取得・変更・削除するAPI
import { and, asc, eq } from "drizzle-orm";

import {
  getClerkUserId,
} from "@/app/lib/auth/clerk-auth";
import { logServerError } from "@/app/lib/observability/serverLog";
import {
  calendarDateSchema,
  foodRecordCreateSchema,
  foodRecordUpdateSchema,
  uuidSchema,
} from "@/app/lib/validation/apiSchemas";
import { getDb } from "@/db";
import {
  foodRecords,
  users,
} from "@/db/schema";

// 日本時間の今日をYYYY-MM-DD形式で返す
function getJapanToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// ClerkのIDと一致するNeon内のユーザーIDを取得する
async function findCurrentUserId(
  clerkUserId: string,
) {
  const db = getDb();
  const matchedUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  return matchedUsers[0]?.id ?? null;
}

// 新しい食事記録を本人のデータとしてNeonへ保存する
export async function POST(request: Request) {
  try {
    const clerkUserId = await getClerkUserId(request);

    if (!clerkUserId) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    const parsedBody = foodRecordCreateSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!parsedBody.success) {
      return Response.json(
        { error: "食事記録の入力内容を確認してください。" },
        { status: 400 },
      );
    }

    const userId = await findCurrentUserId(clerkUserId);

    if (!userId) {
      return Response.json(
        { error: "ユーザーが見つかりません。" },
        { status: 404 },
      );
    }

    const createdRecords = await getDb()
      .insert(foodRecords)
      .values({
        userId,
        ...parsedBody.data,
      })
      .returning();

    return Response.json(
      { record: createdRecords[0] },
      { status: 201 },
    );
  } catch (error) {
    logServerError("food_record_create_failed", error);
    return Response.json(
      { error: "食事記録の保存に失敗しました。" },
      { status: 500 },
    );
  }
}

// 指定日または日本時間の今日の食事記録を本人分だけ取得する
export async function GET(request: Request) {
  try {
    const clerkUserId = await getClerkUserId(request);

    if (!clerkUserId) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    const requestUrl = new URL(request.url);
    const parsedDate = calendarDateSchema.safeParse(
      requestUrl.searchParams.get("date") ?? getJapanToday(),
    );

    if (!parsedDate.success) {
      return Response.json(
        { error: "日付を確認してください。" },
        { status: 400 },
      );
    }

    const userId = await findCurrentUserId(clerkUserId);

    if (!userId) {
      return Response.json(
        { error: "ユーザーが見つかりません。" },
        { status: 404 },
      );
    }

    const records = await getDb()
      .select({
        id: foodRecords.id,
        recordedDate: foodRecords.recordedDate,
        mealType: foodRecords.mealType,
        name: foodRecords.name,
        calories: foodRecords.calories,
        proteinGrams: foodRecords.proteinGrams,
        createdAt: foodRecords.createdAt,
        updatedAt: foodRecords.updatedAt,
      })
      .from(foodRecords)
      .where(
        and(
          eq(foodRecords.userId, userId),
          eq(foodRecords.recordedDate, parsedDate.data),
        ),
      )
      .orderBy(asc(foodRecords.createdAt))
      .limit(100);

    const totalCalories = records.reduce(
      (total, record) => total + record.calories,
      0,
    );
    const totalProteinGrams = records.reduce(
      (total, record) => total + record.proteinGrams,
      0,
    );

    return Response.json({
      date: parsedDate.data,
      records,
      summary: {
        totalCalories: Number(totalCalories.toFixed(1)),
        totalProteinGrams: Number(
          totalProteinGrams.toFixed(1),
        ),
        recordCount: records.length,
      },
    });
  } catch (error) {
    logServerError("food_records_get_failed", error);
    return Response.json(
      { error: "食事記録の取得に失敗しました。" },
      { status: 500 },
    );
  }
}

// 本人が所有する食事記録だけを変更する
export async function PATCH(request: Request) {
  try {
    const clerkUserId = await getClerkUserId(request);

    if (!clerkUserId) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    const parsedBody = foodRecordUpdateSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!parsedBody.success) {
      return Response.json(
        { error: "食事記録の入力内容を確認してください。" },
        { status: 400 },
      );
    }

    const userId = await findCurrentUserId(clerkUserId);

    if (!userId) {
      return Response.json(
        { error: "ユーザーが見つかりません。" },
        { status: 404 },
      );
    }

    const { recordId, ...recordValues } = parsedBody.data;
    const updatedRecords = await getDb()
      .update(foodRecords)
      .set({
        ...recordValues,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(foodRecords.id, recordId),
          eq(foodRecords.userId, userId),
        ),
      )
      .returning();

    const updatedRecord = updatedRecords[0] ?? null;

    if (!updatedRecord) {
      return Response.json(
        { error: "食事記録が見つかりません。" },
        { status: 404 },
      );
    }

    return Response.json({ record: updatedRecord });
  } catch (error) {
    logServerError("food_record_update_failed", error);
    return Response.json(
      { error: "食事記録の更新に失敗しました。" },
      { status: 500 },
    );
  }
}

// URLで指定した本人の食事記録を1件削除する
export async function DELETE(request: Request) {
  try {
    const clerkUserId = await getClerkUserId(request);

    if (!clerkUserId) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    const requestUrl = new URL(request.url);
    const parsedRecordId = uuidSchema.safeParse(
      requestUrl.searchParams.get("recordId"),
    );

    if (!parsedRecordId.success) {
      return Response.json(
        { error: "食事記録IDを確認してください。" },
        { status: 400 },
      );
    }

    const userId = await findCurrentUserId(clerkUserId);

    if (!userId) {
      return Response.json(
        { error: "ユーザーが見つかりません。" },
        { status: 404 },
      );
    }

    const deletedRecords = await getDb()
      .delete(foodRecords)
      .where(
        and(
          eq(foodRecords.id, parsedRecordId.data),
          eq(foodRecords.userId, userId),
        ),
      )
      .returning({ id: foodRecords.id });

    const deletedRecord = deletedRecords[0] ?? null;

    if (!deletedRecord) {
      return Response.json(
        { error: "食事記録が見つかりません。" },
        { status: 404 },
      );
    }

    return Response.json({
      message: "食事記録を削除しました。",
      deletedRecordId: deletedRecord.id,
    });
  } catch (error) {
    logServerError("food_record_delete_failed", error);
    return Response.json(
      { error: "食事記録の削除に失敗しました。" },
      { status: 500 },
    );
  }
}
