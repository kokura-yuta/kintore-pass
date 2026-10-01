// 専用テストDBのみ。TEST_DATABASE_URLがない場合は実通信未確認としてスキップ。
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { PgDialect } from 'drizzle-orm/pg-core';
import { reserveQuotaSql, readQuotaSql, releaseQuotaSql } from '../app/lib/ai/dailyQuotaSql.ts';

test('実DB：同時要求・上限・枠返却・翌日・別ユーザーを検証', {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  const db = neon(process.env.TEST_DATABASE_URL);
  const schema = `quota_test_${randomUUID().replaceAll('-', '')}`;
  const dialect = new PgDialect();
  const run = (statement) => {
    const query = dialect.sqlToQuery(statement);
    return db.query(query.sql.replaceAll('ai_daily_quotas', `"${schema}".ai_daily_quotas`), query.params);
  };
  await db.query(`CREATE SCHEMA "${schema}"`);
  try {
    await db.query(`CREATE TABLE "${schema}".ai_daily_quotas (
      user_id uuid NOT NULL, feature text NOT NULL, day_start timestamptz NOT NULL,
      used integer NOT NULL CHECK (used >= 0), PRIMARY KEY (user_id, feature, day_start))`);
    const base = { userId: randomUUID(), start: new Date('2026-09-30T15:00:00Z') };
    for (const [feature, limit] of [['chat', 30], ['menu', 3]]) {
      const key = { ...base, feature };
      const results = await Promise.all(Array.from({ length: limit + 5 }, () => run(reserveQuotaSql(key, limit))));
      assert.equal(results.filter(rows => rows.length).length, limit);
      assert.equal(Number((await run(readQuotaSql(key)))[0].used), limit);
      await run(releaseQuotaSql(key));
      assert.equal(Number((await run(reserveQuotaSql(key, limit)))[0].used), limit);
      assert.equal((await run(reserveQuotaSql(key, limit))).length, 0);
      assert.equal(Number((await run(reserveQuotaSql({ ...key, start: new Date('2026-10-01T15:00:00Z') }, limit)))[0].used), 1);
      assert.equal(Number((await run(reserveQuotaSql({ ...key, userId: randomUUID() }, limit)))[0].used), 1);
    }
  } finally {
    // このテストが作成したランダム名の専用スキーマだけ削除。
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
  }
});
