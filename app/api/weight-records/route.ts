// ログイン中のユーザーが体重記録を保存・取得・変更・削除するAPI
// 次の作業から、処理を1つずつ追加します。
// DB検索で使う比較機能
import {
  and,
  desc,
  eq,
} from "drizzle-orm";

// Clerk認証とNeon接続を使えるようにする
import {
  getClerkUserId,
} from "@/app/lib/auth/clerk-auth";
import { getDb } from "@/db";

// usersとweight_recordsテーブルを使えるようにする
import {
  users,
  weightRecords,
} from "@/db/schema";
import {
  uuidSchema,
  weightRecordCreateSchema,
  weightRecordUpdateSchema,
} from "@/app/lib/validation/apiSchemas";

// 体重記録のJSONを受け取り、ログイン中の本人の履歴として保存する
export async function POST(
  request: Request,
) {
  try {
    // Clerkトークンを確認してログイン中のユーザーIDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // 未ログインならNeonを操作せずHTTP 401を返す
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
      weightRecordCreateSchema.safeParse(
        await request.json().catch(() => null),
      );

    if (!parsedBody.success) {
      return Response.json(
        {
          error:
            "日付または体重を確認してください。",
        },
        { status: 400 },
      );
    }

    const { recordedDate, weightKg } =
      parsedBody.data;

    // Neonを操作する共通のDB接続を取得する
    const db = getDb();

    // ClerkユーザーIDと一致するアプリ内ユーザーを検索する
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

    // 検索結果の先頭を取り出し、見つからなければnullにする
    const currentUser =
      matchedUsers[0] ?? null;

    // Neonにユーザーが登録されていなければHTTP 404を返す
    if (!currentUser) {
      return Response.json(
        {
          error:
            "ユーザーが見つかりません。",
        },
        { status: 404 },
      );
    }

    // 本人の体重記録をNeonへ追加する
    const createdRecords = await db
      .insert(weightRecords)
      .values({
        userId: currentUser.id,
        recordedDate,
        weightKg,
      })
      // 同じ日付が登録済みなら新しい行を追加しない
      .onConflictDoNothing({
        target: [
          weightRecords.userId,
          weightRecords.recordedDate,
        ],
      })
      .returning();

    // PostgreSQLから配列で返された作成結果を取り出す
    const createdRecord =
      createdRecords[0] ?? null;

    // 同じ日付が登録済みだった場合はHTTP 409を返す
    if (!createdRecord) {
      return Response.json(
        {
          error:
            "この日付の体重はすでに登録されています。",
        },
        { status: 409 },
      );
    }

    // 保存した体重記録をHTTP 201でフロントへ返す
    return Response.json(
      {
        record: createdRecord,
      },
      { status: 201 },
    );
  } catch (error) {
    // 詳しい原因はサーバーログだけへ残す
    console.error(
      "体重記録の保存に失敗しました。",
      error,
    );

    // 利用者には秘密情報を含まない共通エラーを返す
    return Response.json(
      {
        error:
          "体重記録の保存に失敗しました。",
      },
      { status: 500 },
    );
  }
}
// ログイン中の本人の体重履歴を取得する
export async function GET(
  request: Request,
) {
  try {
    // Clerkトークンからログイン中のユーザーIDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // 未ログインならNeonを検索せずHTTP 401を返す
    if (!clerkUserId) {
      return Response.json(
        {
          error:
            "ログインが必要です。",
        },
        { status: 401 },
      );
    }

    // Neonを操作するDB接続を取得する
    const db = getDb();

    // ClerkユーザーIDに一致するアプリ内ユーザーを検索する
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

    // 検索結果がなければnullに統一する
    const currentUser =
      matchedUsers[0] ?? null;

    // アプリ内ユーザーが存在しなければHTTP 404を返す
    if (!currentUser) {
      return Response.json(
        {
          error:
            "ユーザーが見つかりません。",
        },
        { status: 404 },
      );
    }

    // 本人の体重記録を新しい日付から最大365件取得する
    const newestRecords = await db
      .select({
        id: weightRecords.id,
        recordedDate:
          weightRecords.recordedDate,
        weightKg:
          weightRecords.weightKg,
        createdAt:
          weightRecords.createdAt,
        updatedAt:
          weightRecords.updatedAt,
      })
      .from(weightRecords)
      .where(
        eq(
          weightRecords.userId,
          currentUser.id,
        ),
      )
      .orderBy(
        desc(
          weightRecords.recordedDate,
        ),
      )
      .limit(365);

    // グラフ表示で使いやすい古い日付順へ並べ直す
    const records = [
      ...newestRecords,
    ].reverse();

    // 最も古い記録と最新記録を取り出す
    const firstRecord =
      records[0] ?? null;

    const latestRecord =
      records.at(-1) ?? null;

    // 最初の記録から最新記録までの体重変化を計算する
    const changeKg =
      firstRecord && latestRecord
        ? Number(
            (
              latestRecord.weightKg -
              firstRecord.weightKg
            ).toFixed(1),
          )
        : null;

    // 履歴とグラフ・概要表示用データをフロントへ返す
    return Response.json({
      records,
      summary: {
        firstWeightKg:
          firstRecord?.weightKg ?? null,
        latestWeightKg:
          latestRecord?.weightKg ?? null,
        changeKg,
        recordCount:
          records.length,
      },
    });
  } catch (error) {
    // 詳細な原因はサーバーログへ残す
    console.error(
      "体重履歴の取得に失敗しました。",
      error,
    );

    // 利用者へ安全な共通エラーを返す
    return Response.json(
      {
        error:
          "体重履歴の取得に失敗しました。",
      },
      { status: 500 },
    );
  }
}

// ログイン中の本人が持つ体重記録を更新する
export async function PATCH(
  request: Request,
) {
  try {
    // Clerkトークンからログイン中のユーザーIDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // 未ログインなら更新せずHTTP 401を返す
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
      weightRecordUpdateSchema.safeParse(
        await request.json().catch(() => null),
      );

    if (!parsedBody.success) {
      return Response.json(
        {
          error:
            "記録IDまたは体重を確認してください。",
        },
        { status: 400 },
      );
    }

    const { recordId, weightKg } =
      parsedBody.data;

    // Neonを操作するDB接続を取得する
    const db = getDb();

    // ClerkユーザーIDに一致するアプリ内ユーザーを検索する
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

    // 検索結果がなければnullに統一する
    const currentUser =
      matchedUsers[0] ?? null;

    // アプリ内ユーザーが存在しなければHTTP 404を返す
    if (!currentUser) {
      return Response.json(
        {
          error:
            "ユーザーが見つかりません。",
        },
        { status: 404 },
      );
    }

    // 記録IDと本人のユーザーIDが両方一致する記録だけを更新する
    const updatedRecords = await db
      .update(weightRecords)
      .set({
        weightKg,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(
            weightRecords.id,
            recordId,
          ),
          eq(
            weightRecords.userId,
            currentUser.id,
          ),
        ),
      )
      .returning();

    // PostgreSQLから返された更新結果を取り出す
    const updatedRecord =
      updatedRecords[0] ?? null;

    // 本人が持つ対象記録がなければHTTP 404を返す
    if (!updatedRecord) {
      return Response.json(
        {
          error:
            "体重記録が見つかりません。",
        },
        { status: 404 },
      );
    }

    // 更新後の体重記録をフロントへ返す
    return Response.json({
      record: updatedRecord,
    });
  } catch (error) {
    // 詳しい原因はサーバーログへ残す
    console.error(
      "体重記録の更新に失敗しました。",
      error,
    );

    // 利用者へ安全な共通エラーを返す
    return Response.json(
      {
        error:
          "体重記録の更新に失敗しました。",
      },
      { status: 500 },
    );
  }
}

// ログイン中の本人が持つ体重記録を1件削除する
export async function DELETE(
  request: Request,
) {
  try {
    // Clerkトークンからログイン中のユーザーIDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // 未ログインなら削除せずHTTP 401を返す
    if (!clerkUserId) {
      return Response.json(
        {
          error:
            "ログインが必要です。",
        },
        { status: 401 },
      );
    }

    // リクエストURLをURLオブジェクトへ変換する
    const requestUrl =
      new URL(request.url);

    // URLの?recordId=から削除対象の記録IDを取得する
    const recordId =
      requestUrl.searchParams.get(
        "recordId",
      );

    // 記録IDがUUID形式でなければHTTP 400を返す
    const parsedRecordId =
      uuidSchema.safeParse(recordId);

    if (!parsedRecordId.success) {
      return Response.json(
        {
          error:
            "記録IDを確認してください。",
        },
        { status: 400 },
      );
    }

    const validRecordId =
      parsedRecordId.data;

    // Neonを操作するDB接続を取得する
    const db = getDb();

    // ClerkユーザーIDに一致するアプリ内ユーザーを検索する
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

    // 検索結果がなければnullに統一する
    const currentUser =
      matchedUsers[0] ?? null;

    // アプリ内ユーザーが存在しなければHTTP 404を返す
    if (!currentUser) {
      return Response.json(
        {
          error:
            "ユーザーが見つかりません。",
        },
        { status: 404 },
      );
    }

    // 記録IDと本人のユーザーIDが一致する記録だけを削除する
    const deletedRecords = await db
      .delete(weightRecords)
      .where(
        and(
          eq(
            weightRecords.id,
            validRecordId,
          ),
          eq(
            weightRecords.userId,
            currentUser.id,
          ),
        ),
      )
      .returning({
        id: weightRecords.id,
      });

    // PostgreSQLから返された削除結果を取り出す
    const deletedRecord =
      deletedRecords[0] ?? null;

    // 対象がない、または本人の記録でなければHTTP 404を返す
    if (!deletedRecord) {
      return Response.json(
        {
          error:
            "体重記録が見つかりません。",
        },
        { status: 404 },
      );
    }

    // 削除に成功した記録IDをフロントへ返す
    return Response.json({
      message:
        "体重記録を削除しました。",
      deletedRecordId:
        deletedRecord.id,
    });
  } catch (error) {
    // 詳しい原因はサーバーログへ残す
    console.error(
      "体重記録の削除に失敗しました。",
      error,
    );

    // 利用者へ安全な共通エラーを返す
    return Response.json(
      {
        error:
          "体重記録の削除に失敗しました。",
      },
      { status: 500 },
    );
  }
}
