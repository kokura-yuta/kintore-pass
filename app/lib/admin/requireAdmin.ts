import { getClerkUserId } from "@/app/lib/auth/clerk-auth";

function configuredAdminIds() {
  return new Set(
    (process.env.ADMIN_CLERK_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export async function getAdminIdentity(request: Request) {
  const clerkUserId = await getClerkUserId(request);
  if (!clerkUserId) return { allowed: false as const, status: 401 };
  if (!configuredAdminIds().has(clerkUserId)) {
    return { allowed: false as const, status: 403 };
  }
  return { allowed: true as const, clerkUserId };
}
