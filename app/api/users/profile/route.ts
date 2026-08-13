// 認証済みユーザーの身体プロフィールをNeonへ保存・取得するAPI
// メールアドレスやユーザーIDが一致するデータを検索する比較機能
import { eq } from "drizzle-orm";

// 認証情報・DB接続・usersとuser_profilesをAPIで使えるようにする場所
import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import { getDb } from "@/db";
import {
  userProfiles,
  users,
} from "@/db/schema";
const allowedTrainingLocations = [
  "home",
  "gym",
  "both",
];

// 任意入力の小数がnullまたは指定範囲内の通常の数値か確認する関数
function isOptionalNumberInRange(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= minimum &&
      value <= maximum)
  );
}

// 任意入力の整数がnullまたは指定範囲内か確認する関数
function isOptionalIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  return (
    value === null ||
    (Number.isInteger(value) &&
      typeof value === "number" &&
      value >= minimum &&
      value <= maximum)
  );
}


// GET通信を受け取り、ログイン中のユーザーの身体プロフィールを取得する場所
export async function GET(
  request: Request,
) {
  // 認証・DB検索で発生した予想外のエラーをまとめて捕まえる
  try {
    // リクエストのClerkトークンを検証してログイン中のユーザーIDを取得する
    const clerkUserId =
      await getClerkUserId(request);

    // ClerkユーザーIDを取得できなければDBを操作せずHTTP 401を返す
    if (!clerkUserId) {
      return Response.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    // Neon PostgreSQLを操作する共通のDB接続を取得する
    const db = getDb();

    // ClerkユーザーIDが一致するusersデータからアプリ内IDだけを最大1件取得する
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

    // 検索結果の先頭を取り出し、対象がなければnullに統一する
    const currentUser =
      matchedUsers[0] ?? null;

    // usersテーブルに対象ユーザーがいなければHTTP 404を返す
    if (!currentUser) {
      return Response.json(
        { error: "ユーザーが見つかりません。" },
        { status: 404 },
      );
    }

    // ログイン中のユーザーIDと一致する身体プロフィールを最大1件取得する
    const matchedProfiles = await db
      .select()
      .from(userProfiles)
      .where(
        eq(
          userProfiles.userId,
          currentUser.id,
        ),
      )
      .limit(1);

    // 検索結果の先頭を取り出し、プロフィール未作成ならnullにする
    const profile =
      matchedProfiles[0] ?? null;

    // プロフィールまたはnullをフロントエンドへJSONで返す
    return Response.json({
      profile,
    });
  } catch (error) {
    // 詳しい原因は利用者へ返さず、開発者向けサーバーログへ残す
    console.error(
      "身体プロフィールの取得に失敗しました。",
      error,
    );

    // フロントエンドへ安全なエラーとHTTP 500を返す
    return Response.json(
      {
        error:
          "身体プロフィールの取得に失敗しました。",
      },
      { status: 500 },
    );
  }
}

// PATCH通信を受け取り、ログイン中のユーザーの身体プロフィールを保存・更新する場所
export async function PATCH(
  request: Request,
) {
  // リクエストのClerkトークンを検証してログイン中のユーザーIDを取得する
  const clerkUserId =
    await getClerkUserId(request);

  // ClerkユーザーIDを取得できなければDBを操作せずHTTP 401を返す
  if (!clerkUserId) {
    return Response.json(
      { error: "ログインが必要です。" },
      { status: 401 },
    );
  }

  // フロントエンドから送られたJSONを読み、壊れていればnullにする
  const body = await request
    .json()
    .catch(() => null);

  // JSONが通常のオブジェクトでなければDBを操作せずHTTP 400を返す
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return Response.json(
      { error: "入力内容が不正です。" },
      { status: 400 },
    );
  }

  // JSONから必須の身長・体重と任意の体脂肪率を取り出す
  const {
    heightCm = null,
    weightKg = null,
    bodyFatPercentage = null,
  } = body;

  // JSONから任意入力の運動条件と苦手部位を取り出す
  const {
    weeklyTrainingDays = null,
    availableMinutes = null,
    trainingLocation = null,
    weakBodyParts = null,
  } = body;

  // 必須の身長・体重が入力済みで、すべての数値が現実的な範囲内か確認する
  if (
    heightCm === null ||
    weightKg === null ||
    !isOptionalNumberInRange(
      heightCm,
      50,
      250,
    ) ||
    !isOptionalNumberInRange(
      weightKg,
      20,
      500,
    ) ||
    !isOptionalNumberInRange(
      bodyFatPercentage,
      0,
      80,
    ) ||
    !isOptionalIntegerInRange(
      weeklyTrainingDays,
      0,
      7,
    ) ||
    !isOptionalIntegerInRange(
      availableMinutes,
      20,
      180,
    )
  ) {
    return Response.json(
      {
        error:
          "身体情報の数値が正しくありません。",
      },
      { status: 400 },
    );
  }
  // トレーニング場所が未入力または許可された選択肢か確認する
  if (
    trainingLocation !== null &&
    (typeof trainingLocation !== "string" ||
      !allowedTrainingLocations.includes(
        trainingLocation,
      ))
  ) {
    return Response.json(
      {
        error:
          "トレーニング場所が不正です。",
      },
      { status: 400 },
    );
  }

  // 苦手部位が未入力または文字列だけの配列か確認する
  if (
    weakBodyParts !== null &&
    (!Array.isArray(weakBodyParts) ||
      !weakBodyParts.every(
        (bodyPart: unknown) =>
          typeof bodyPart === "string",
      ))
  ) {
    return Response.json(
      {
        error:
          "苦手部位の形式が不正です。",
      },
      { status: 400 },
    );
  }
  // プロフィールを保存するためにNeon PostgreSQLへの接続を取得する
  const db = getDb();

  // 認証メールと一致するusersデータからIDだけを最大1件取得する
  // ClerkユーザーIDが一致するusersデータからアプリ内IDだけを最大1件取得する
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

  // 検索結果の先頭を取り出し、ユーザーがいなければnullに統一する
  const currentUser =
    matchedUsers[0] ?? null;

  // 保存先となるユーザーが見つからなければHTTP 404を返す
  if (!currentUser) {
    return Response.json(
      { error: "ユーザーが見つかりません。" },
      { status: 404 },
    );
  }

  // ログイン中のユーザーIDと入力内容をプロフィール保存用にまとめる
  const profileValues = {
    userId: currentUser.id,
    heightCm,
    weightKg,
    bodyFatPercentage,
    weeklyTrainingDays,
    availableMinutes,
    trainingLocation,
    weakBodyParts,
    updatedAt: new Date(),
  };

  // 初回はプロフィールを新規作成し、同じユーザーの2回目以降は内容を更新する
  const savedProfiles = await db
    .insert(userProfiles)
    .values(profileValues)
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: profileValues,
    })
    .returning();

  // 身体情報の保存が完了したことをユーザーの初回設定状態へ記録する
  await db
    .update(users)
    .set({
      profileCompleted: true,
      updatedAt: new Date(),
    })
    .where(
      eq(users.id, currentUser.id),
    );

  // DBから返された保存結果の先頭を取り出し、フロントエンドへ返す
  const savedProfile =
    savedProfiles[0] ?? null;

  // 保存済みプロフィールと身体情報入力の完了状態をJSONで返す
  return Response.json({
    profile: savedProfile,
    profileCompleted: true,
  });
}
