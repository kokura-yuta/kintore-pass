import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import { hasOwnerAccess } from "@/app/lib/admin/ownerAccess";

export async function getAdminIdentity(request: Request) {
  const clerkUserId = await getClerkUserId(request);
  if (!clerkUserId) return { allowed: false as const, status: 401 };
  if (!(await hasOwnerAccess(clerkUserId))) {
    return { allowed: false as const, status: 403 };
  }
  return { allowed: true as const, clerkUserId };
}
