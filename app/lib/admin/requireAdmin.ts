import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import { isConfiguredAdminClerkUserId } from "@/app/lib/admin/ownerPolicy";

// 同じ環境変数を管理画面の認可と、運営者のPremium無償利用判定で共用する
export { isConfiguredAdminClerkUserId };

export async function getAdminIdentity(request: Request) {
  const clerkUserId = await getClerkUserId(request);
  if (!clerkUserId) return { allowed: false as const, status: 401 };
  if (!isConfiguredAdminClerkUserId(clerkUserId)) {
    return { allowed: false as const, status: 403 };
  }
  return { allowed: true as const, clerkUserId };
}
