// 月額プランの価格と各機能の利用条件を、DB処理から分けて管理するファイル
const configuredMonthlyPrice = Number(process.env.PREMIUM_MONTHLY_PRICE_YEN);
export const premiumMonthlyPriceYen =
  Number.isFinite(configuredMonthlyPrice) && configuredMonthlyPrice > 0
    ? configuredMonthlyPrice
    : 1_000;
export const premiumBodyAnalysisMonthlyLimit = 4;
export const trialDurationDays = 7;
export const trialDailyChatLimit = 30;
export const premiumDailyChatLimit = 30;
export const trialDailyMenuLimit = 3;
export const premiumDailyMenuLimit = 3;
export const trialBodyAnalysisTotalLimit = 1;

export type AppAccessLevel =
  | "free"
  | "trial"
  | "premium";

export type AiFeature =
  | "chat"
  | "menu"
  | "calorie_ai"
  | "body_analysis";

// DBや画面に依存せず、月額契約と無料体験期限から現在の利用段階を決める
export function resolveAppAccessLevel(input: {
  isPremium: boolean;
  trialUsed: boolean;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  now: Date;
}): AppAccessLevel {
  if (input.isPremium) return "premium";

  if (
    input.trialUsed &&
    input.trialStartedAt !== null &&
    input.trialEndsAt !== null &&
    input.trialStartedAt.getTime() <= input.now.getTime() &&
    input.trialEndsAt.getTime() > input.now.getTime()
  ) {
    return "trial";
  }

  return "free";
}

export type BodyAnalysisAccessDecision =
  | { allowed: true; firstAnalysisFree: boolean }
  | {
      allowed: false;
      reason: "premium_required" | "monthly_limit";
    };

// 完了済み回数と課金状態だけで身体分析の利用可否を決める
export function decideBodyAnalysisAccess(input: {
  trialCompleted: number;
  completedThisMonth: number;
  accessLevel: AppAccessLevel;
}): BodyAnalysisAccessDecision {
  if (
    input.accessLevel === "trial" &&
    input.trialCompleted < trialBodyAnalysisTotalLimit
  ) {
    return {
      allowed: true,
      firstAnalysisFree: true,
    };
  }

  if (input.accessLevel !== "premium") {
    return {
      allowed: false,
      reason: "premium_required",
    };
  }

  if (
    input.completedThisMonth >=
    premiumBodyAnalysisMonthlyLimit
  ) {
    return {
      allowed: false,
      reason: "monthly_limit",
    };
  }

  return {
    allowed: true,
    firstAnalysisFree: false,
  };
}

// 有料機能へ無料ユーザーがアクセスしたときに返す共通レスポンス
export function premiumRequiredResponse(
  feature: AiFeature,
) {
  const featureNames = {
    chat: "AIチャット",
    menu: "AIメニュー生成",
    calorie_ai: "AI食事・カロリー分析",
    body_analysis: "身体分析",
  } as const;

  return Response.json(
    {
      error: `${featureNames[feature]}はPremium機能です。未使用の場合は7日間無料で試すか、月額プランをご契約ください。`,
      code: "PREMIUM_REQUIRED",
      feature,
      monthlyPriceYen: premiumMonthlyPriceYen,
    },
    { status: 402 },
  );
}
