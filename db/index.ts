// APIからNeon PostgreSQLへ接続する共通の入口を作るファイル
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// ユーザー情報・記録・会話を永続保存するDB接続を必要な処理へ渡す場所
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URLが設定されていません。",
    );
  }

  return drizzle(databaseUrl, { schema });
}
