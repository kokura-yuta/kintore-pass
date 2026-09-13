// Neonに保存したApple課金状態から、有料機能を使えるか判断する共通ファイル
import { and, eq, gt, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { userSubscriptions } from "@/db/schema";

export {
  decideBodyAnalysisAccess,
  premiumBodyAnalysisMonthlyLimit,
  premiumMonthlyPriceYen,
  premiumRequiredResponse,
} from "@/app/lib/subscriptions/policy";

const activeSubscriptionStatuses = [
  "active",
  "grace_period",
] as const;

export type PremiumAccess = {
  isPremium: boolean;
  status: string;
  productId: string | null;
  expiresAt: Date | null;
};

// Appleで有効と検証された期限内の月額プランだけを有料会員として扱う
export async function getPremiumAccess(
  userId: string,
  now = new Date(),
): Promise<PremiumAccess> {
  const subscriptions = await getDb()
    .select({
      status: userSubscriptions.status,
      productId: userSubscriptions.productId,
      expiresAt: userSubscriptions.expiresAt,
    })
    .from(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        inArray(
          userSubscriptions.status,
          [...activeSubscriptionStatuses],
        ),
        gt(userSubscriptions.expiresAt, now),
      ),
    )
    .limit(1);

  const subscription = subscriptions[0] ?? null;

  return {
    isPremium: Boolean(subscription),
    status: subscription?.status ?? "inactive",
    productId: subscription?.productId ?? null,
    expiresAt: subscription?.expiresAt ?? null,
  };
}
