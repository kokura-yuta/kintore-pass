import { count, lte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { premiumTrialSlots } from "@/db/schema";
import { trialMaximumUsers } from "@/app/lib/subscriptions/policy";

export type TrialAvailability = {
  maximumUsers: number;
  claimedUsers: number;
  remainingSlots: number;
  available: boolean;
};

export async function getTrialAvailability(): Promise<TrialAvailability> {
  const rows = await getDb()
    .select({ claimedUsers: count(premiumTrialSlots.userId) })
    .from(premiumTrialSlots)
    .where(lte(premiumTrialSlots.slotNumber, trialMaximumUsers));
  const claimedUsers = Number(rows[0]?.claimedUsers ?? 0);
  const remainingSlots = Math.max(
    0,
    trialMaximumUsers - claimedUsers,
  );

  return {
    maximumUsers: trialMaximumUsers,
    claimedUsers,
    remainingSlots,
    available: remainingSlots > 0,
  };
}

// ユーザー行と未使用枠を同じSQL内でロックし、同時申込でも21人目を通さない。
export async function claimTrialSlot(input: {
  userId: string;
  startedAt: Date;
  endsAt: Date;
}) {
  const result = await getDb().execute(sql`
    with locked_user as (
      select id
      from users
      where id = ${input.userId}
        and trial_used = false
      for update
    ),
    available_slot as (
      select slot_number
      from premium_trial_slots
      where user_id is null
        and slot_number <= ${trialMaximumUsers}
        and exists (select 1 from locked_user)
      order by slot_number
      for update skip locked
      limit 1
    ),
    claimed_slot as (
      update premium_trial_slots as slots
      set user_id = ${input.userId},
          claimed_at = ${input.startedAt}
      from available_slot
      where slots.slot_number = available_slot.slot_number
      returning slots.slot_number
    ),
    updated_user as (
      update users
      set trial_choice_completed = true,
          trial_used = true,
          trial_started_at = ${input.startedAt},
          trial_ends_at = ${input.endsAt},
          updated_at = ${input.startedAt}
      where id = ${input.userId}
        and trial_used = false
        and exists (select 1 from claimed_slot)
      returning id
    )
    select claimed_slot.slot_number
    from claimed_slot
    where exists (select 1 from updated_user)
  `);

  const rows = result as unknown as Array<{
    slot_number: number;
  }>;
  return rows[0]?.slot_number ?? null;
}
