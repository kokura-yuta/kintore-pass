import { and, eq, sql } from 'drizzle-orm';
import { getClerkUserDetails, getClerkUserId } from '@/app/lib/auth/clerk-auth';
import { BootstrapIdentityConflict, resolveBootstrapIdentity } from '@/app/lib/auth/bootstrapIdentity';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { logServerError } from '@/app/lib/observability/serverLog';
import { getAppAccess } from '@/app/lib/subscriptions/entitlements';
import { isConfiguredAdminClerkUserId } from '@/app/lib/admin/ownerPolicy';

function fallbackAccess(clerkUserId: string) {
  const isAdmin = isConfiguredAdminClerkUserId(clerkUserId);
  return {
    accessLevel: isAdmin ? 'premium' as const : 'free' as const,
    canUseAiFeatures: isAdmin,
    trialChoiceCompleted: isAdmin,
    trialUsed: false,
    trialEndsAt: null,
  };
}
async function getBootstrapAccess(userId: string, clerkUserId: string) {
  try { return await getAppAccess(userId); }
  catch (error) {
    logServerError('user_bootstrap_access_fallback', error);
    return fallbackAccess(clerkUserId);
  }
}
export async function POST(request: Request) {
  let failureStage = 'authentication';
  try {
    const clerkUserId = await getClerkUserId(request);
    if (!clerkUserId) return Response.json({ error: 'ログインが必要です。' }, { status: 401 });
    const db = getDb();
    const { user, created } = await resolveBootstrapIdentity(clerkUserId, {
      findByClerkId: async id => (await db.select().from(users)
        .where(eq(users.clerkUserId, id)).limit(1))[0] ?? null,
      findByEmail: async email => {
        const rows = await db.select().from(users)
          .where(sql`lower(${users.email}) = lower(${email})`).limit(2);
        // 大小文字だけ異なる複数登録が存在する場合も勝手に統合しない。
        if (rows.length > 1) throw new BootstrapIdentityConflict();
        return rows[0] ?? null;
      },
      getDetails: getClerkUserDetails,
      insert: async values => (await db.insert(users).values(values)
        .onConflictDoNothing().returning())[0] ?? null,
      migrate: async (old, newId) => (await db.update(users)
        .set({ clerkUserId: newId, updatedAt: new Date() })
        .where(and(eq(users.id, old.id), eq(users.clerkUserId, old.clerkUserId!), eq(users.email, old.email)))
        .returning())[0] ?? null,
      production: process.env.APP_ENV === 'production' &&
        Boolean(process.env.CLERK_SECRET_KEY?.startsWith('sk_live_')),
      approvedLegacyIds: (process.env.LEGACY_CLERK_MIGRATION_USER_IDS ?? '')
        .split(',').map(id => id.trim()).filter(Boolean),
      stage: stage => { failureStage = stage; },
    });
    failureStage = 'user_access';
    const access = await getBootstrapAccess(user.id, clerkUserId);
    return Response.json({
      userId: clerkUserId,
      onboardingCompleted: user.onboardingCompleted,
      goalBodyType: user.goalBodyType,
      profileCompleted: user.profileCompleted,
      initialAnalysisCompleted: user.initialAnalysisCompleted,
      accessLevel: access.accessLevel,
      canUseAiFeatures: access.canUseAiFeatures,
      trialChoiceCompleted: access.trialChoiceCompleted,
      trialUsed: access.trialUsed,
      trialEndsAt: access.trialEndsAt,
    }, { status: created ? 201 : 200, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    logServerError(`user_bootstrap_failed_${failureStage}`, error);
    return Response.json({ error: error instanceof BootstrapIdentityConflict
      ? error.message : 'ユーザー情報の初期化に失敗しました。' },
    { status: error instanceof BootstrapIdentityConflict ? 409 : 500,
      headers: { 'Cache-Control': 'private, no-store' } });
  }
}
