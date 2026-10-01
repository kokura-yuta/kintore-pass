// 管理者と運営用無料Premiumは、Clerkが確認した主メールだけで判定する。
export function isOwnerAccount(user: {
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification: { status: string } | null;
  }>;
}): boolean {
  return user.emailAddresses.some((email) =>
    email.id === user.primaryEmailAddressId &&
    email.verification?.status === "verified" &&
    email.emailAddress.trim().toLowerCase() === "kintore505@gmail.com"
  );
}
