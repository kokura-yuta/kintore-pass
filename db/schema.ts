// PostgreSQLへユーザー情報と身体プロフィールを保存するテーブルの型を読み込む場所
import {
  boolean,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// 認証情報・理想体型・初回設定の進み具合をユーザーごとに管理するテーブル
export const users = pgTable("users", {
  // ユーザーを重複なく識別するためのID
  id: uuid("id").defaultRandom().primaryKey(),

  // ログイン中のユーザーとDB内のデータを結び付ける認証情報
  email: text("email").notNull().unique(),

  displayName: text("display_name"),

  // 起動時に初回セットアップとホームのどちらへ進むか判断する情報
  onboardingCompleted: boolean("onboarding_completed")
    .notNull()
    .default(false),

  goalBodyType: text("goal_body_type"),

  profileCompleted: boolean("profile_completed")
    .notNull()
    .default(false),

  initialAnalysisCompleted: boolean(
    "initial_analysis_completed",
  )
    .notNull()
    .default(false),

  // ユーザー情報を作成した日時と最後に更新した日時
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});
