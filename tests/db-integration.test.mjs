import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URLが.env.localに設定されていません。");
}

const sql = neon(databaseUrl);

async function expectDatabaseError(operation) {
  let failed = false;

  try {
    await operation();
  } catch {
    failed = true;
  }

  assert.equal(failed, true);
}

test("Neonの制約・更新・削除・cascadeを実DBで確認する", async () => {
  const suffix = randomUUID();
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const weightRecordId = randomUUID();
  const trainingSessionId = randomUUID();
  const trainingExerciseId = randomUUID();
  const bodyAnalysisId = randomUUID();
  const aiMenuId = randomUUID();
  const conversationId = randomUUID();
  const requestId = randomUUID();
  const rollbackTrainingId = randomUUID();
  const rollbackExerciseId = randomUUID();
  const rollbackAnalysisId = randomUUID();
  const rollbackMenuId = randomUUID();

  try {
    await sql`
      insert into users (
        id,
        clerk_user_id,
        email,
        display_name
      ) values (
        ${userId},
        ${`test_${suffix}`},
        ${`test_${suffix}@example.invalid`},
        '自動テスト'
      )
    `;

    await sql`
      insert into users (
        id,
        clerk_user_id,
        email,
        display_name
      ) values (
        ${otherUserId},
        ${`test_other_${suffix}`},
        ${`test_other_${suffix}@example.invalid`},
        '別ユーザー自動テスト'
      )
    `;

    await sql`
      insert into user_profiles (
        user_id,
        height_cm,
        weight_kg
      ) values (${userId}, 170, 65)
    `;

    await sql`
      insert into weight_records (
        id,
        user_id,
        recorded_date,
        weight_kg
      ) values (${weightRecordId}, ${userId}, '2026-09-01', 65)
    `;

    await expectDatabaseError(() => sql`
      insert into weight_records (
        user_id,
        recorded_date,
        weight_kg
      ) values (${userId}, '2026-09-01', 66)
    `);

    await sql`
      update weight_records
      set weight_kg = 65.5
      where user_id = ${userId}
        and recorded_date = '2026-09-01'
    `;

    const updatedWeight = await sql`
      select weight_kg
      from weight_records
      where user_id = ${userId}
    `;
    assert.equal(updatedWeight[0].weight_kg, 65.5);

    const otherUserWeights = await sql`
      select count(*)::int as count
      from weight_records
      where user_id = ${otherUserId}
    `;
    assert.equal(otherUserWeights[0].count, 0);

    const otherUserUpdate = await sql`
      update weight_records
      set weight_kg = 99
      where id = ${weightRecordId}
        and user_id = ${otherUserId}
      returning id
    `;
    assert.equal(otherUserUpdate.length, 0);

    await expectDatabaseError(() => sql`
      insert into training_sessions (
        user_id,
        condition_score
      ) values (${userId}, 11)
    `);

    await sql`
      insert into training_sessions (
        id,
        user_id,
        duration_minutes,
        condition_score,
        memo
      ) values (
        ${trainingSessionId},
        ${userId},
        45,
        8,
        '自動テスト'
      )
    `;

    await sql`
      insert into training_exercises (
        id,
        session_id,
        exercise_id,
        exercise_name,
        body_part,
        body_area,
        display_order
      ) values (
        ${trainingExerciseId},
        ${trainingSessionId},
        'test-bench-press',
        'テストベンチプレス',
        '胸',
        '中部',
        0
      )
    `;

    await sql`
      insert into training_sets (
        training_exercise_id,
        set_number,
        weight_kg,
        reps
      ) values (${trainingExerciseId}, 1, 60, 10)
    `;

    await expectDatabaseError(() => sql`
      insert into training_sets (
        training_exercise_id,
        set_number,
        weight_kg,
        reps
      ) values (${trainingExerciseId}, 1, 65, 8)
    `);

    await expectDatabaseError(() => sql`
      insert into body_analyses (
        user_id,
        status
      ) values (${userId}, 'unknown')
    `);

    await sql`
      insert into body_analyses (
        id,
        user_id,
        status,
        summary,
        goal_difference,
        analyzed_at
      ) values (
        ${bodyAnalysisId},
        ${userId},
        'completed',
        '自動テスト結果',
        '自動テスト差分',
        now()
      )
    `;

    await sql`
      insert into body_analysis_areas (
        analysis_id,
        body_part,
        score,
        priority,
        observation,
        recommendation
      ) values (
        ${bodyAnalysisId},
        '胸',
        7,
        'medium',
        '自動テスト観察',
        '自動テスト提案'
      )
    `;

    await expectDatabaseError(() => sql`
      insert into body_analysis_areas (
        analysis_id,
        body_part,
        score
      ) values (${bodyAnalysisId}, '背中', 11)
    `);

    await sql`
      insert into ai_generated_menus (
        id,
        user_id,
        recommended_body_part,
        reason,
        estimated_minutes,
        advice
      ) values (
        ${aiMenuId},
        ${userId},
        '胸',
        '自動テスト',
        45,
        array['自動テスト']
      )
    `;

    await sql`
      insert into ai_generated_menu_exercises (
        menu_id,
        exercise_name,
        body_part,
        target_reps,
        sets,
        rest_seconds,
        note,
        display_order
      ) values (
        ${aiMenuId},
        'テスト種目',
        '胸',
        '10回',
        3,
        90,
        '自動テスト',
        0
      )
    `;

    await sql`
      insert into chat_conversations (
        id,
        user_id,
        title
      ) values (${conversationId}, ${userId}, '自動テスト会話')
    `;

    await sql`
      insert into chat_messages (
        conversation_id,
        role,
        content
      ) values (${conversationId}, 'user', '自動テスト')
    `;

    await sql`
      insert into ai_request_guards (
        user_id,
        request_type,
        request_id
      ) values (${userId}, 'training-record', ${requestId})
    `;

    await expectDatabaseError(() => sql`
      insert into ai_request_guards (
        user_id,
        request_type,
        request_id
      ) values (${userId}, 'training-record', ${requestId})
    `);

    await expectDatabaseError(() => sql`
      insert into ai_request_guards (
        user_id,
        request_type,
        request_id
      ) values (${userId}, 'invalid-type', ${randomUUID()})
    `);

    await expectDatabaseError(() =>
      sql.transaction([
        sql`
          insert into training_sessions (id, user_id)
          values (${rollbackTrainingId}, ${userId})
        `,
        sql`
          insert into training_exercises (
            id,
            session_id,
            exercise_id,
            exercise_name,
            body_part,
            display_order
          ) values (
            ${rollbackExerciseId},
            ${rollbackTrainingId},
            'rollback-test',
            'ロールバックテスト',
            '胸',
            30
          )
        `,
      ]),
    );

    const rolledBackTraining = await sql`
      select count(*)::int as count
      from training_sessions
      where id = ${rollbackTrainingId}
    `;
    assert.equal(rolledBackTraining[0].count, 0);

    await expectDatabaseError(() =>
      sql.transaction([
        sql`
          insert into body_analyses (
            id,
            user_id,
            status
          ) values (
            ${rollbackAnalysisId},
            ${userId},
            'completed'
          )
        `,
        sql`
          insert into body_analysis_areas (
            analysis_id,
            body_part,
            score
          ) values (${rollbackAnalysisId}, '胸', 11)
        `,
      ]),
    );

    const rolledBackAnalysis = await sql`
      select count(*)::int as count
      from body_analyses
      where id = ${rollbackAnalysisId}
    `;
    assert.equal(rolledBackAnalysis[0].count, 0);

    await expectDatabaseError(() =>
      sql.transaction([
        sql`
          insert into ai_generated_menus (
            id,
            user_id,
            recommended_body_part,
            reason,
            estimated_minutes,
            advice
          ) values (
            ${rollbackMenuId},
            ${userId},
            '胸',
            'ロールバックテスト',
            30,
            array['テスト']
          )
        `,
        sql`
          insert into ai_generated_menu_exercises (
            menu_id,
            exercise_name,
            body_part,
            target_reps,
            sets,
            rest_seconds,
            note
          ) values (
            ${rollbackMenuId},
            'ロールバックテスト',
            '胸',
            null,
            3,
            90,
            'テスト'
          )
        `,
      ]),
    );

    const rolledBackMenu = await sql`
      select count(*)::int as count
      from ai_generated_menus
      where id = ${rollbackMenuId}
    `;
    assert.equal(rolledBackMenu[0].count, 0);

    const otherUserDelete = await sql`
      delete from training_sessions
      where id = ${trainingSessionId}
        and user_id = ${otherUserId}
      returning id
    `;
    assert.equal(otherUserDelete.length, 0);

    await sql`
      delete from training_sessions
      where id = ${trainingSessionId}
    `;

    const trainingChildren = await sql`
      select count(*)::int as count
      from training_sets
      where training_exercise_id = ${trainingExerciseId}
    `;
    assert.equal(trainingChildren[0].count, 0);

    await sql`
      delete from users
      where id = ${userId}
    `;

    await sql`
      delete from users
      where id = ${otherUserId}
    `;

    const remainingRows = await sql`
      select
        (select count(*) from user_profiles where user_id = ${userId})::int
          + (select count(*) from weight_records where user_id = ${userId})::int
          + (select count(*) from body_analyses where user_id = ${userId})::int
          + (select count(*) from ai_generated_menus where user_id = ${userId})::int
          + (select count(*) from chat_conversations where user_id = ${userId})::int
          + (select count(*) from ai_request_guards where user_id = ${userId})::int
          as count
    `;

    assert.equal(remainingRows[0].count, 0);
  } finally {
    await sql`
      delete from users
      where id in (${userId}, ${otherUserId})
    `;
  }
});
