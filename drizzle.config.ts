// Drizzle KitがNeon PostgreSQLへテーブル作成・変更を適用するための設定ファイル
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URLが設定されていません。",
  );
}

// スキーマの読込先・マイグレーション保存先・接続先をDrizzle Kitへ伝える場所
export default defineConfig({
  out: "./drizzle-postgres",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
