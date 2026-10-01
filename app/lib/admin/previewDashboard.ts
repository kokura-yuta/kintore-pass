// DB・Clerk未接続のローカル開発でも管理画面の見た目を確認するためのサンプル
export function createAdminPreviewDashboard() {
  const months = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
  const paidUsers = [52, 74, 103, 137, 168, 200];
  return {
    generatedAt: new Date().toISOString(),
    preview: true,
    summary: {
      paidUsers: 200,
      revenueYen: 200_000,
      estimatedAppleProceedsYen: 170_000,
      openAiTodayYen: 180,
      openAiMonthYen: 4_200,
      neonYen: 1_200,
      otherCostYen: 0,
      appleFeeYen: 30_000,
      totalCostYen: 35_400,
      profitYen: 164_600,
      profitMarginPercent: 82.3,
      averageRevenuePerPaidUserYen: 1_000,
      averageAiCostPerPaidUserYen: 21,
      infrastructureCostPerPaidUserYen: 27,
      profitPerPaidUserYen: 823,
      totalTokens: 8_420_000,
      apiCalls: 3_280,
    },
    openAi: {
      byFeature: [
        { name: "chat", calls: 2200, tokens: 4_600_000, costYen: 2100 },
        { name: "menu", calls: 780, tokens: 2_300_000, costYen: 1250 },
        { name: "body-analysis", calls: 300, tokens: 1_520_000, costYen: 850 },
      ],
      byModel: [{ name: "設定モデル", calls: 3280, tokens: 8_420_000, costYen: 4200 }],
      byUser: [
        { userId: "preview-1", label: "テストユーザーA", calls: 88, tokens: 230000, costYen: 126 },
        { userId: "preview-2", label: "テストユーザーB", calls: 64, tokens: 171000, costYen: 94 },
      ],
    },
    analytics: {
      users: {
        total: 248,
        activeThisMonth: 182,
        newThisMonth: 31,
        onboardingCompleted: 226,
        access: { operator: 1, premium: 200, trial: 12, free: 35 },
      },
      audience: {
        byGoalBodyType: [
          { name: "筋肉質", users: 112 },
          { name: "細マッチョ", users: 86 },
          { name: "未設定", users: 50 },
        ],
        byTrainingLocation: [
          { name: "gym", users: 121 },
          { name: "home", users: 73 },
          { name: "both", users: 35 },
          { name: "未設定", users: 19 },
        ],
        byTrainingStyle: [
          { name: "split", users: 116 },
          { name: "full-body", users: 72 },
          { name: "ai", users: 41 },
          { name: "未設定", users: 19 },
        ],
        byWeeklyTrainingDays: [
          { name: "3", users: 78 },
          { name: "4", users: 61 },
          { name: "2", users: 52 },
          { name: "未設定", users: 57 },
        ],
      },
      featureUsage: [
        { name: "training_records", month: 940, total: 4320 },
        { name: "weight_records", month: 1520, total: 6900 },
        { name: "food_records", month: 2810, total: 11200 },
        { name: "body_analyses", month: 142, total: 680 },
        { name: "ai_menus", month: 780, total: 2900 },
        { name: "chat_questions", month: 2200, total: 12480 },
      ],
    },
    neon: {
      plan: "Scale（サンプル）",
      databaseBytes: 82 * 1024 * 1024,
      storagePercent: 16.4,
      monthlyCostYen: 1_200,
      monthlyCostKind: "estimated",
      countsKind: "measured",
      counts: { users: 248, chatMessages: 12480, trainingLogs: 4320, bodyAnalyses: 680 },
    },
    settings: { monthlyPriceYen: 1_000, appleFeePercent: 15, pricingSource: "preview" },
    trends: months.map((month, index) => {
      const revenueYen = paidUsers[index] * 1_000;
      const openAiYen = [900, 1300, 1850, 2600, 3400, 4200][index];
      const neonYen = 1_200;
      const profitYen = revenueYen * 0.85 - openAiYen - neonYen;
      return { month, revenueYen, openAiYen, neonYen, profitYen, paidUsers: paidUsers[index] };
    }),
    warnings: ["これは開発用サンプルです。実データではありません。"],
  };
}
