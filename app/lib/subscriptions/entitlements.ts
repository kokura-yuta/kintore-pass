// Neonに保存したApple課金状態から、有料機能を使えるか判断する共通ファイル
import { and, eq, gt, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { users, userSubscriptions } from "@/db/schema";
import {
  premiumBodyAnalysisMonthlyLimit,
  premiumDailyChatLimit,
  premiumDailyMenuLimit,
  premiumRequiredResponse,
  resolveAppAccessLevel,
  trialBodyAnalysisTotalLimit,
  trialDailyChatLimit,
  trialDailyMenuLimit,
  trialDurationDays,
} from "@/app/lib/subscriptions/policy";

export {
  decideBodyAnalysisAccess,
  premiumBodyAnalysisMonthlyLimit,
  premiumDailyChatLimit,
  premiumDailyMenuLimit,
  premiumMonthlyPriceYen,
  premiumRequiredResponse,
  resolveAppAccessLevel,
  trialBodyAnalysisTotalLimit,
  trialDailyChatLimit,
  trialDailyMenuLimit,
  trialDurationDays,
} from "@/app/lib/subscriptions/policy";
import type { AppAccessLevel } from "@/app/lib/subscriptions/policy";
import type { AiFeature } from "@/app/lib/subscriptions/policy";

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

export type AppAccess = PremiumAccess & {
  accessLevel: AppAccessLevel;
  canUseAiFeatures: boolean;
  trialChoiceCompleted: boolean;
  trialUsed: boolean;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  trialDays: number;
  chatDailyLimit: number;
  menuDailyLimit: number;
  bodyAnalysisLimit: number;
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

// 月額契約を優先し、未契約ならNeonに保存した7日間の体験期限を確認する
export async function getAppAccess(
  userId: string,
  now = new Date(),
): Promise<AppAccess> {
  const [premium, matchedUsers] = await Promise.all([
    getPremiumAccess(userId, now),
    getDb()
      .select({
        trialStartedAt: users.trialStartedAt,
        trialEndsAt: users.trialEndsAt,
        trialChoiceCompleted: users.trialChoiceCompleted,
        trialUsed: users.trialUsed,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  ]);

  const user = matchedUsers[0];

  if (!user) {
    throw new Error("User not found while checking app access");
  }

  const accessLevel = resolveAppAccessLevel({
    isPremium: premium.isPremium,
    trialUsed: user.trialUsed,
    trialStartedAt: user.trialStartedAt,
    trialEndsAt: user.trialEndsAt,
    now,
  });

  return {
    ...premium,
    accessLevel,
    canUseAiFeatures: accessLevel !== "free",
    trialChoiceCompleted: user.trialChoiceCompleted,
    trialUsed: user.trialUsed,
    trialStartedAt: user.trialStartedAt,
    trialEndsAt: user.trialEndsAt,
    trialDays: trialDurationDays,
    chatDailyLimit:
      accessLevel === "premium"
        ? premiumDailyChatLimit
        : accessLevel === "trial"
          ? trialDailyChatLimit
          : 0,
    menuDailyLimit:
      accessLevel === "premium"
        ? premiumDailyMenuLimit
        : accessLevel === "trial"
          ? trialDailyMenuLimit
          : 0,
    bodyAnalysisLimit:
      accessLevel === "premium"
        ? premiumBodyAnalysisMonthlyLimit
        : accessLevel === "trial"
          ? trialBodyAnalysisTotalLimit
          : 0,
  };
}

// 保存やAI実行の直前に呼び、体験・契約の両方が切れていれば共通402を返す
export async function getAiFeatureBlockResponse(
  userId: string,
  feature: AiFeature,
  now = new Date(),
): Promise<Response | null> {
  const access = await getAppAccess(userId, now);

  return access.canUseAiFeatures
    ? null
    : premiumRequiredResponse(feature);
}
