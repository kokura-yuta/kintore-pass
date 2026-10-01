import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PgDialect } from 'drizzle-orm/pg-core';
import { reserveQuotaSql, readQuotaSql, releaseQuotaSql } from '../app/lib/ai/dailyQuotaSql.ts';

const dialect = new PgDialect();
const key = { userId: 'test-user', feature: 'chat', start: new Date('2026-09-30T15:00:00Z') };

test('枠確保は上限付き原子的UPSERTでユーザー・機能・日付を分離する', () => {
  const query = dialect.sqlToQuery(reserveQuotaSql(key, 30));
  assert.match(query.sql, /on conflict \(user_id, feature, day_start\) do update/);
  assert.match(query.sql, /where ai_daily_quotas.used < \$4/);
  assert.deepEqual(query.params, ['test-user', 'chat', key.start.toISOString(), 30]);
});

test('不正な上限では枠を確保しない', () => {
  for (const limit of [0, -1, 1.5, NaN, Infinity]) assert.throws(() => reserveQuotaSql(key, limit));
});

test('履歴に依存せず回数を読み、返却は元の日付の枠だけに適用する', () => {
  const read = dialect.sqlToQuery(readQuotaSql(key));
  const release = dialect.sqlToQuery(releaseQuotaSql(key));
  assert.doesNotMatch(read.sql, /chat_messages|chat_conversations|ai_generated_menus/);
  assert.deepEqual(read.params, release.params);
  assert.match(release.sql, /used > 0/);
});

test('両APIがAI生成前に確保し成功時は保持、失敗時はfinallyで返却する（ソース検査）', async () => {
  for (const file of ['chat', 'ai-menu']) {
    const source = await readFile(`app/api/${file}/route.ts`, 'utf8');
    assert.ok(source.indexOf('await reserveDailyQuota(') < source.indexOf('await openai.responses.'));
    assert.match(source, /const used(?:Chat|Menu)Count = await readDailyQuota/);
    assert.match(source, /reservedQuota = null;[\s\S]*?return Response.json\(\{/);
    assert.match(source, /finally \{[\s\S]*releaseDailyQuota\(reservedQuota\)/);
  }
});
