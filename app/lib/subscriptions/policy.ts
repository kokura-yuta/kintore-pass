// 月額プランの価格と各機能の利用条件を、DB処理から分けて管理するファイル
const configuredMonthlyPrice = Number(process.env.PREMIUM_MONTHLY_PRICE_YEN);
export const premiumMonthlyPriceYen =
  Number.isFinite(configuredMonthlyPrice) && configuredMonthlyPrice > 0
    ? configuredMonthlyPrice
    : 1_000;
export const premiumBodyAnalysisMonthlyLimit = 4;

export type BodyAnalysisAccessDecision =
  | { allowed: true; firstAnalysisFree: boolean }
  | {
      allowed: false;
      reason: "premium_required" | "monthly_limit";
    };

// 完了済み回数と課金状態だけで身体分析の利用可否を決める
export function decideBodyAnalysisAccess(input: {
  totalCompleted: number;
  completedThisMonth: number;
  isPremium: boolean;
}): BodyAnalysisAccessDecision {
  if (input.totalCompleted === 0) {
    return {
      allowed: true,
      firstAnalysisFree: true,
    };
  }

  if (!input.isPremium) {
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
  feature: "calorie_tracking" | "body_analysis",
) {
  return Response.json(
    {
      error:
        feature === "calorie_tracking"
          ? "カロリー管理はプレミアムプランで利用できます。"
          : "2回目以降の身体分析はプレミアムプランで利用できます。",
      code: "PREMIUM_REQUIRED",
      feature,
      monthlyPriceYen: premiumMonthlyPriceYen,
    },
    { status: 402 },
  );
}
