import { sql } from "drizzle-orm";

export type DailyQuota = { userId: string; feature: "chat" | "menu"; start: Date };

export function readQuotaSql(key: DailyQuota) {
  return sql`select used from ai_daily_quotas
    where user_id = ${key.userId} and feature = ${key.feature}
      and day_start = ${key.start.toISOString()}::timestamptz`;
}

export function reserveQuotaSql(key: DailyQuota, limit: number) {
  if (!Number.isInteger(limit) || limit <= 0) throw new Error("Invalid daily quota limit");
  return sql`insert into ai_daily_quotas (user_id, feature, day_start, used)
    values (${key.userId}, ${key.feature}, ${key.start.toISOString()}::timestamptz, 1)
    on conflict (user_id, feature, day_start) do update
      set used = ai_daily_quotas.used + 1
      where ai_daily_quotas.used < ${limit}
    returning used`;
}

export function releaseQuotaSql(key: DailyQuota) {
  return sql`update ai_daily_quotas set used = used - 1
    where user_id = ${key.userId} and feature = ${key.feature}
      and day_start = ${key.start.toISOString()}::timestamptz and used > 0`;
}
