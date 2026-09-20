// 運営費・料金・警告値を環境変数から安全に読み込む共通設定
type ModelPrice = {
  inputYenPerMillionTokens: number;
  outputYenPerMillionTokens: number;
};

function nonNegativeNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function percentage(name: string, fallback: number) {
  return Math.min(nonNegativeNumber(name, fallback), 100);
}

function loadModelPrices(): Record<string, ModelPrice> {
  try {
    const parsed = JSON.parse(process.env.OPENAI_MODEL_PRICING_JSON ?? "{}") as Record<string, Partial<ModelPrice>>;
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([model, value]) => {
        const input = Number(value.inputYenPerMillionTokens);
        const output = Number(value.outputYenPerMillionTokens);
        return Number.isFinite(input) && input >= 0 && Number.isFinite(output) && output >= 0
          ? [[model, { inputYenPerMillionTokens: input, outputYenPerMillionTokens: output }]]
          : [];
      }),
    );
  } catch {
    return {};
  }
}

export const adminCostConfig = {
  monthlyPriceYen: nonNegativeNumber("PREMIUM_MONTHLY_PRICE_YEN", 1_000),
  appleFeePercent: percentage("APPLE_COMMISSION_PERCENT", 15),
  neonMonthlyCostYen: nonNegativeNumber("NEON_MONTHLY_COST_YEN", 0),
  otherMonthlyCostYen: nonNegativeNumber("OTHER_INFRA_MONTHLY_COST_YEN", 0),
  neonPlanName: process.env.NEON_PLAN_NAME?.trim() || "未設定",
  neonStorageLimitBytes: nonNegativeNumber("NEON_STORAGE_LIMIT_BYTES", 0),
  warningOpenAiMonthlyYen: nonNegativeNumber("ADMIN_WARNING_OPENAI_MONTHLY_YEN", 5_000),
  warningOpenAiRevenuePercent: percentage("ADMIN_WARNING_OPENAI_REVENUE_PERCENT", 5),
  warningUserAiMonthlyYen: nonNegativeNumber("ADMIN_WARNING_USER_AI_MONTHLY_YEN", 100),
  warningNeonStoragePercent: percentage("ADMIN_WARNING_NEON_STORAGE_PERCENT", 80),
  modelPrices: loadModelPrices(),
};

export function estimateOpenAiCostMicrosYen(
  model: string,
  inputTokens: number,
  outputTokens: number,
  prices: Record<string, ModelPrice> = adminCostConfig.modelPrices,
) {
  const price = prices[model];
  if (!price) return 0;
  const yen =
    (inputTokens / 1_000_000) * price.inputYenPerMillionTokens +
    (outputTokens / 1_000_000) * price.outputYenPerMillionTokens;
  return Math.max(0, Math.round(yen * 1_000_000));
}
