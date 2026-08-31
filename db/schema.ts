// PostgreSQLへユーザー情報と身体プロフィールを保存するテーブルの型を読み込む場所
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// 認証情報・理想体型・初回設定の進み具合をユーザーごとに管理するテーブル
export const users = pgTable("users", {
  // ユーザーを重複なく識別するためのID
  id: uuid("id").defaultRandom().primaryKey(),

  // ClerkのログインユーザーとNeon内のユーザーを重複なく結び付けるID
  clerkUserId: text("clerk_user_id")
    .unique(),

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
// ユーザーが日ごとに入力した体重を保存するテーブル
export const weightRecords = pgTable(
  "weight_records",
  {
    // 体重記録を重複なく識別するID
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    // この体重記録が誰のものかをusersテーブルと結び付ける
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    // 記録した日をYYYY-MM-DD形式で保存する
    recordedDate: date("recorded_date", {
      mode: "string",
    }).notNull(),

    // その日に入力した体重をkgで保存する
    weightKg: real("weight_kg")
      .notNull(),

    // 記録を作成・更新した日時
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
  (table) => [
    // 同じユーザーが同じ日に2件登録することを防ぐ
    uniqueIndex(
      "weight_records_user_date_unique",
    ).on(
      table.userId,
      table.recordedDate,
    ),
  ],
);

// 1回分のトレーニング日時・時間・調子・メモをユーザーごとに保存するテーブル
export const trainingSessions = pgTable("training_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  performedAt: timestamp("performed_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  durationMinutes: integer("duration_minutes"),

  conditionScore: integer("condition_score"),

  memo: text("memo"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

// 1回のトレーニングで実施した種目をtrainingSessionsと結び付けて保存するテーブル
export const trainingExercises = pgTable("training_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),

  sessionId: uuid("session_id")
    .notNull()
    .references(() => trainingSessions.id, {
      onDelete: "cascade",
    }),

  exerciseId: text("exercise_id").notNull(),

  exerciseName: text("exercise_name").notNull(),

  bodyPart: text("body_part").notNull(),

  bodyArea: text("body_area"),

  displayOrder: integer("display_order")
    .notNull()
    .default(0),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

// 各種目で行ったセット番号・重量・回数をtrainingExercisesと結び付けて保存するテーブル
export const trainingSets = pgTable("training_sets", {
  id: uuid("id").defaultRandom().primaryKey(),

  trainingExerciseId: uuid("training_exercise_id")
    .notNull()
    .references(() => trainingExercises.id, {
      onDelete: "cascade",
    }),

  setNumber: integer("set_number").notNull(),

  weightKg: real("weight_kg"),

  reps: integer("reps"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

// Pythonによる1回分の身体分析結果をユーザーごとに保存する親テーブル
export const bodyAnalyses = pgTable("body_analyses", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  status: text("status")
    .notNull()
    .default("pending"),

  summary: text("summary"),

  goalDifference: text("goal_difference"),

  analyzedAt: timestamp("analyzed_at", {
    withTimezone: true,
  }),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});
// 肩・胸・背中など、Pythonが返した部位別の分析結果を保存するテーブル
export const bodyAnalysisAreas = pgTable(
  "body_analysis_areas",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => bodyAnalyses.id, {
        onDelete: "cascade",
      }),

    bodyPart: text("body_part").notNull(),

    score: integer("score"),

    priority: text("priority"),

    observation: text("observation"),

    recommendation: text("recommendation"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
);

// OpenAIが生成した1回分のトレーニングメニューをユーザーごとに保存する親テーブル
export const aiGeneratedMenus = pgTable(
  "ai_generated_menus",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    // このAIメニューから保存されたトレーニング記録を結び付ける
    trainingSessionId: uuid(
      "training_session_id",
    )
      .unique()
      .references(
        () => trainingSessions.id,
        {
          onDelete: "set null",
        },
      ),

    // このAIメニューを実際に行った日時を保存する
    performedAt: timestamp(
      "performed_at",
      {
        withTimezone: true,
      },
    ),

    recommendedBodyPart: text(
      "recommended_body_part",
    ).notNull(),

    reason: text("reason").notNull(),

    estimatedMinutes: integer(
      "estimated_minutes",
    ).notNull(),

    advice: text("advice").array().notNull(),

    conditionScore: integer("condition_score"),

    requestNote: text("request_note"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // 本人の最新メニューを新しい順で探しやすくする索引
    index("ai_generated_menus_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

// AIメニューに含まれる種目・重量・回数・セット数を保存する子テーブル
export const aiGeneratedMenuExercises = pgTable(
  "ai_generated_menu_exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    menuId: uuid("menu_id")
      .notNull()
      .references(() => aiGeneratedMenus.id, {
        onDelete: "cascade",
      }),

    exerciseName: text("exercise_name").notNull(),

    bodyPart: text("body_part").notNull(),

    bodyArea: text("body_area"),

    targetWeightKg: real("target_weight_kg"),

    targetReps: text("target_reps").notNull(),

    sets: integer("sets").notNull(),

    restSeconds: integer("rest_seconds").notNull(),

    note: text("note").notNull(),

    displayOrder: integer("display_order")
      .notNull()
      .default(0),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // 1つのメニューに属する種目を表示順で取得しやすくする索引
    index("ai_menu_exercises_menu_order_idx").on(
      table.menuId,
      table.displayOrder,
    ),
  ],
);

// ユーザーごとのAIチャットルームを保存する親テーブル
export const chatConversations = pgTable(
  "chat_conversations",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    title: text("title")
      .notNull()
      .default("新しい相談"),

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
  (table) => [
    index("chat_conversations_user_updated_idx").on(
      table.userId,
      table.updatedAt,
    ),
  ],
);
// チャット内の利用者とAIのメッセージを保存する子テーブル
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => chatConversations.id, {
        onDelete: "cascade",
      }),

    role: text("role").notNull(),

    content: text("content").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

// AIチャット・AIメニューの二重送信を防ぐため、処理開始済みのリクエストを保存する
export const aiRequestGuards = pgTable(
  "ai_request_guards",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    // どの利用者のリクエストかを保存する
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    // chatまたはmenuのどちらの処理かを保存する
    requestType: text("request_type")
      .notNull(),

    // フロントが送るリクエスト固有のUUIDを保存する
    requestId: uuid("request_id")
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // 同じ利用者・処理・リクエストIDを2回登録できなくする
    uniqueIndex(
      "ai_request_guards_user_type_request_uidx",
    ).on(
      table.userId,
      table.requestType,
      table.requestId,
    ),

    // 本人の古い管理記録を探しやすくする
    index(
      "ai_request_guards_user_created_idx",
    ).on(
      table.userId,
      table.createdAt,
    ),
  ],
);
