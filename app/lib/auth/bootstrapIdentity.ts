type StoredIdentity = { id: string; clerkUserId: string | null; email: string };
type ClerkDetails = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddress: { emailAddress: string; verification?: { status: string } | null } | null;
};
export class BootstrapIdentityConflict extends Error {
  constructor() {
    super('以前のアカウントとの紐づけを確認する必要があります。運営へお問い合わせください。');
    this.name = 'BootstrapIdentityConflict';
  }
}

// メール一致だけでは引き継がない。運営が確認済みの旧開発IDのみを対象とする。
export async function resolveBootstrapIdentity<T extends StoredIdentity>(
  clerkUserId: string,
  dependencies: {
    findByClerkId: (id: string) => Promise<T | null>;
    findByEmail: (email: string) => Promise<T | null>;
    getDetails: (id: string) => Promise<ClerkDetails>;
    insert: (values: { clerkUserId: string; email: string; displayName: string }) => Promise<T | null>;
    migrate: (old: T, newId: string) => Promise<T | null>;
    production: boolean;
    approvedLegacyIds: readonly string[];
    stage: (stage: string) => void;
  },
): Promise<{ user: T; created: boolean }> {
  const d = dependencies;
  d.stage('user_lookup');
  const existing = await d.findByClerkId(clerkUserId);
  if (existing) return { user: existing, created: false };
  d.stage('clerk_user_details');
  const details = await d.getDetails(clerkUserId);
  const primary = details.primaryEmailAddress;
  if (details.id !== clerkUserId || !primary?.emailAddress) throw new BootstrapIdentityConflict();
  const email = primary.emailAddress.trim();
  d.stage('email_lookup');
  const legacy = await d.findByEmail(email);
  if (legacy) {
    // 最初のID検索後に、同じ本人の別リクエストが移行を完了した場合。
    if (legacy.clerkUserId === clerkUserId) return { user: legacy, created: false };
    if (!d.production || primary.verification?.status !== 'verified' ||
        !legacy.clerkUserId || !d.approvedLegacyIds.includes(legacy.clerkUserId) ||
        legacy.email.toLowerCase() !== email.toLowerCase()) throw new BootstrapIdentityConflict();
    d.stage('legacy_identity_migration');
    // UUID・記録・契約・初回設定は維持し、旧IDのままである場合のみ原子的に更新。
    const migrated = await d.migrate(legacy, clerkUserId);
    const user = migrated ?? await d.findByClerkId(clerkUserId);
    if (!user || user.id !== legacy.id) throw new BootstrapIdentityConflict();
    return { user, created: false };
  }
  d.stage('user_insert');
  const created = await d.insert({ clerkUserId, email, displayName:
    [details.firstName, details.lastName].filter(Boolean).join(' ') || email });
  if (created) return { user: created, created: true };
  // 同じ本人の同時bootstrapだけは既存登録を返す。他人との衝突は紐づけない。
  const concurrent = await d.findByClerkId(clerkUserId);
  if (!concurrent) throw new BootstrapIdentityConflict();
  return { user: concurrent, created: false };
}
