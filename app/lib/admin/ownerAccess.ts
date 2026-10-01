import { getClerkUserDetails } from "@/app/lib/auth/clerk-auth";
import { isOwnerAccount } from "@/app/lib/admin/ownerPolicy";

export async function hasOwnerAccess(clerkUserId: string): Promise<boolean> {
  try {
    return isOwnerAccount(await getClerkUserDetails(clerkUserId));
  } catch {
    // Clerkで本人を確認できない場合は特別権限を付与しない。
    return false;
  }
}
