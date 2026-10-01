import { getDb } from "@/db";
import { readQuotaSql, reserveQuotaSql, releaseQuotaSql, type DailyQuota } from "./dailyQuotaSql";
export type { DailyQuota } from "./dailyQuotaSql";

// 履歴とは独立した集計。会話削除では減らさない。
export async function readDailyQuota(key: DailyQuota) {
  const rows = await getDb().execute(readQuotaSql(key));
  return Number(rows.rows[0]?.used ?? 0);
}

// PostgreSQLの競合行ロック下で上限確認と加算を一度に実施する。
export async function reserveDailyQuota(key: DailyQuota, limit: number) {
  if (!Number.isInteger(limit) || limit <= 0) return null;
  const rows = await getDb().execute(reserveQuotaSql(key, limit));
  return rows.rows[0] ? Number(rows.rows[0].used) : null;
}

// このリクエストが確保した枠だけを、失敗時に一度返却する。
export async function releaseDailyQuota(key: DailyQuota) {
  await getDb().execute(releaseQuotaSql(key));
}
