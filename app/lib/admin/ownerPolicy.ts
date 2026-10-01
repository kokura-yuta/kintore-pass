// サーバー設定の完全一致のみ許可。未設定の場合は権限を与えない。
export function isConfiguredAdminClerkUserId(
  clerkUserId: string | null | undefined,
  configuredIds = process.env.ADMIN_CLERK_USER_IDS ?? "",
): boolean {
  if (!clerkUserId) return false;
  return configuredIds.split(",").map((id) => id.trim()).filter(Boolean).includes(clerkUserId);
}
