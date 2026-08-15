// 認証済みユーザーをNeonへ登録または取得し、初回設定の状態を返すAPI
//この route.ts は、POST で呼ばれたときに「今ログインしているユーザーを Neon の users テーブルに登録するか、すでにあるならその状態を返す」処理をしています。


// usersテーブルから同じClerkユーザーIDを検索する比較機能
import { eq } from "drizzle-orm";

// 認証情報・DB接続・usersテーブルを初期化処理で使えるようにする場所
import {
  getClerkUserDetails,
  getClerkUserId,
} from "@/app/lib/auth/clerk-auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";

// POST通信を受け取り、ユーザー初期化処理を開始する場所
export async function POST(
  request: Request,
) {
  // 認証・DB検索・新規登録で発生したエラーをまとめて捕まえる
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

    // 検証済みのClerkユーザーIDと一致するNeonユーザーを最大1件検索する
    const existingUsers = await db
      .select()
      .from(users)
      .where(
        eq(
          users.clerkUserId,
          clerkUserId,
        ),
      )
      .limit(1);

    // 検索結果の先頭を取り出し、未登録ならnullに統一する
    const existingUser = existingUsers[0] ?? null;

    // 登録済みならClerkユーザーIDと初回設定の完了状態を返して処理を終了する
    if (existingUser) {
      return Response.json({
        userId: clerkUserId,
        onboardingCompleted:
          existingUser.onboardingCompleted,
      });
    }

    // Neonに未登録の場合だけClerkからメールアドレスや名前を取得する
    const clerkUserDetails =
      await getClerkUserDetails(
        clerkUserId,
      );

    // Clerkの主要メールアドレスを取り出し、存在しなければnullに統一する
    const email =
      clerkUserDetails.primaryEmailAddress
        ?.emailAddress ?? null;

    // 必須のメールアドレスを取得できなければNeonへ登録せずHTTP 400を返す
    if (!email) {
      return Response.json(
        {
          error:
            "メールアドレスを取得できません。",
        },
        { status: 400 },
      );
    }

    // Clerkの姓名を表示名にまとめ、名前がなければメールアドレスを使う
    const displayName =
      [
        clerkUserDetails.firstName,
        clerkUserDetails.lastName,
      ]
        .filter(Boolean)
        .join(" ") || email;

    // 未登録なら認証情報を使ってusersテーブルへ新規登録する
    const createdUsers = await db
      .insert(users)
      .values({
        clerkUserId,
        email,
        displayName,
      })
      .returning();

    // PostgreSQLから配列で返された新規ユーザーを取り出す
    const createdUser = createdUsers[0];

    // ClerkユーザーIDと初回設定の完了状態をHTTP 201で返す
    return Response.json(
      {
        userId: clerkUserId,
        onboardingCompleted:
          createdUser.onboardingCompleted,
      },
      { status: 201 },
    );
  } catch (error) {
    // 詳しい原因は利用者へ返さず、開発者が確認するサーバーログへ残す
    console.error(
      "ユーザー初期化に失敗しました。",
      error,
    );

    // フロントエンドへ安全なメッセージとHTTP 500を返す
    return Response.json(
      {
        error:
          "ユーザー情報の初期化に失敗しました。",
      },
      { status: 500 },
    );
  }
}
