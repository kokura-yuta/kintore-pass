import { ApiError, apiRequest } from '@/lib/api';

export type AdminBreakdown = {
  name: string;
  calls: number;
  tokens: number;
  costYen: number;
};

export type AdminDashboardData = {
  generatedAt: string;
  summary: {
    paidUsers: number;
    revenueYen: number;
    estimatedAppleProceedsYen: number;
    openAiTodayYen: number;
    openAiMonthYen: number;
    neonYen: number;
    otherCostYen: number;
    appleFeeYen: number;
    totalCostYen: number;
    profitYen: number;
    profitMarginPercent: number;
    averageRevenuePerPaidUserYen: number;
    averageAiCostPerPaidUserYen: number;
    infrastructureCostPerPaidUserYen: number;
    profitPerPaidUserYen: number;
    totalTokens: number;
    apiCalls: number;
  };
  openAi: {
    byFeature: AdminBreakdown[];
    byModel: AdminBreakdown[];
    byUser: (AdminBreakdown & {
      userId: string;
      label: string;
    })[];
  };
  neon: {
    plan: string;
    databaseBytes: number;
    storagePercent: number | null;
    monthlyCostYen: number;
    monthlyCostKind: 'estimated';
    countsKind: 'measured';
    counts: {
      users: number;
      chatMessages: number;
      trainingLogs: number;
      bodyAnalyses: number;
    };
  };
  settings: {
    monthlyPriceYen: number;
    appleFeePercent: number;
    pricingSource: string;
  };
  trends: {
    month: string;
    revenueYen: number;
    openAiYen: number;
    neonYen: number;
    profitYen: number;
    paidUsers: number;
  }[];
  warnings: string[];
};

// 管理APIの403は通常ユーザーにとって正常なので、画面用のfalseへ変換する
export async function checkAdminAccess(token: string) {
  try {
    const response = await apiRequest<{ isAdmin: boolean }>(
      '/api/admin/access',
      { method: 'GET', token },
    );
    return response.isAdmin;
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      return false;
    }
    throw error;
  }
}

// 管理者本人のClerkトークンを付けて、集計済みの運営データを取得する
export function fetchAdminDashboard(token: string) {
  return apiRequest<AdminDashboardData>(
    '/api/admin/dashboard',
    { method: 'GET', token, timeoutMs: 60_000 },
  );
}
