import { getClerkUserId } from "@/app/lib/auth/clerk-auth";

function configuredAdminIds() {
  return new Set(
    (process.env.ADMIN_CLERK_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

// 同じ環境変数を管理画面の認可と、運営者のPremium無償利用判定で共用する
export function isConfiguredAdminClerkUserId(
  clerkUserId: string | null | undefined,
) {
  return Boolean(
    clerkUserId && configuredAdminIds().has(clerkUserId),
  );
}

export async function getAdminIdentity(request: Request) {
  const clerkUserId = await getClerkUserId(request);
  if (!clerkUserId) return { allowed: false as const, status: 401 };
  if (!isConfiguredAdminClerkUserId(clerkUserId)) {
    return { allowed: false as const, status: 403 };
  }
  return { allowed: true as const, clerkUserId };
}
