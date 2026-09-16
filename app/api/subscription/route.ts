// ログイン中の本人へ、現在の課金状態と利用できる有料機能を返すAPI
import { eq } from "drizzle-orm";

import { getClerkUserId } from "@/app/lib/auth/clerk-auth";
import {
  getPremiumAccess,
  premiumBodyAnalysisMonthlyLimit,
  premiumMonthlyPriceYen,
} from "@/app/lib/subscriptions/entitlements";
import { getDb } from "@/db";
import { users } from "@/db/schema";

export async function GET(request: Request) {
  const clerkUserId = await getClerkUserId(request);

  if (!clerkUserId) {
    return Response.json(
      { error: "ログインが必要です。" },
      { status: 401 },
    );
  }

  const matchedUsers = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  const user = matchedUsers[0] ?? null;

  if (!user) {
    return Response.json(
      { error: "ユーザー情報が見つかりません。" },
      { status: 404 },
    );
  }

  const access = await getPremiumAccess(user.id);

  return Response.json({
    appAccountToken: user.id,
    plan: access.isPremium ? "premium" : "free",
    status: access.status,
    productId: access.productId,
    expiresAt: access.expiresAt,
    price: {
      amount: premiumMonthlyPriceYen,
      currency: "JPY",
      interval: "month",
    },
    features: {
      calorieTracking: access.isPremium,
      bodyAnalysis: {
        firstAnalysisFree: true,
        monthlyLimitForPremium:
          premiumBodyAnalysisMonthlyLimit,
      },
    },
  });
}
