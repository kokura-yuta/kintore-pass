import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { users, userProfiles, weightRecords } from '@/db/schema';

type WeightMutation =
  | { kind: 'create'; recordedDate: string; weightKg: number }
  | { kind: 'update'; recordId: string; weightKg: number }
  | { kind: 'delete'; recordId: string };

type SavedWeight = typeof weightRecords.$inferSelect & { profileWeightKg: number | null };

// Serialize this user's weight writes, and change the record/profile in one transaction.
// A historical edit must not replace a newer measurement. An unsuccessful mutation
// must not update the profile; deleting the last measurement keeps its current value.
export async function mutateWeightRecord(db: ReturnType<typeof getDb>, userId: string, input: WeightMutation) {
  const mutation = input.kind === 'create'
    ? sql`insert into ${weightRecords} (user_id, recorded_date, weight_kg)
        values (${userId}, ${input.recordedDate}, ${input.weightKg})
        on conflict (user_id, recorded_date) do nothing returning *`
    : input.kind === 'update'
      ? sql`update ${weightRecords} set weight_kg = ${input.weightKg}, updated_at = now()
          where id = ${input.recordId} and user_id = ${userId} returning *`
      : sql`delete from ${weightRecords}
          where id = ${input.recordId} and user_id = ${userId} returning *`;

  // Data-modifying CTEs share a snapshot: merge returned rows into the old snapshot
  // explicitly instead of expecting a subsequent SELECT to see the write.
  const [, rows] = await db.batch([
    db.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update'),
    db.execute<SavedWeight>(sql`
      with changed as (${mutation}),
      remaining as (
        select weight_kg, recorded_date from ${weightRecords}
        where user_id = ${userId} and id not in (select id from changed)
        ${input.kind === 'delete' ? sql`` : sql`union all select weight_kg, recorded_date from changed`}
      ),
      synced as (
        update ${userProfiles}
        set weight_kg = coalesce((select weight_kg from remaining order by recorded_date desc limit 1), weight_kg),
            updated_at = now()
        where user_id = ${userId} and exists (select 1 from changed)
        returning weight_kg
      )
      select id, user_id as "userId", recorded_date as "recordedDate",
             weight_kg as "weightKg", created_at as "createdAt", updated_at as "updatedAt",
             (select weight_kg from synced) as "profileWeightKg"
      from changed
    `),
  ]);
  return rows.rows[0] ?? null;
}
