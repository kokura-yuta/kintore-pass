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

// 身長・体重・運動条件などをusersテーブルの各ユーザーと1対1で管理するテーブル
export const userProfiles = pgTable(
  "user_profiles",
  {
    // 身体プロフィール自体を重複なく識別するID
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    // users.idと結び付け、1人につき1プロフィールだけ持てるようにするID
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    // 身長と体重を必須、体脂肪率を任意入力の小数として保存する項目
    heightCm: real("height_cm")
      .notNull(),

    weightKg: real("weight_kg")
      .notNull(),

    bodyFatPercentage: real(
      "body_fat_percentage",
    ),

    // 週の回数と1回に使える時間を任意入力の整数として保存する項目
    weeklyTrainingDays: integer(
      "weekly_training_days",
    ),

    availableMinutes: integer(
      "available_minutes",
    ),

    // トレーニング場所と苦手部位を任意入力で保存する項目
    trainingLocation: text(
      "training_location",
    ),

    weakBodyParts: text(
      "weak_body_parts",
    ).array(),
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
  },
);
