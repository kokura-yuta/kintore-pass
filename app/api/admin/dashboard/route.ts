import { and, count, gt, gte, inArray, sql } from "drizzle-orm";

import { adminCostConfig, estimateOpenAiCostMicrosYen } from "@/app/lib/admin/costConfig";
import { getAdminIdentity } from "@/app/lib/admin/requireAdmin";
import { createAdminPreviewDashboard } from "@/app/lib/admin/previewDashboard";
import { logServerError } from "@/app/lib/observability/serverLog";
import { getDb } from "@/db";
import {
  bodyAnalyses,
  chatMessages,
  openAiUsageRecords,
  trainingSessions,
  users,
  userSubscriptions,
} from "@/db/schema";

type UsageRow = {
  userId: string;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostMicrosYen: number;
  createdAt: Date;
};

const yen = (micros: number) => micros / 1_000_000;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const monthKey = (date: Date) => date.toISOString().slice(0, 7);

function beginningOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function groupCost(rows: UsageRow[], key: "feature" | "model") {
  const grouped = new Map<string, { calls: number; tokens: number; costYen: number }>();
  for (const row of rows) {
    const name = row[key];
    const current = grouped.get(name) ?? { calls: 0, tokens: 0, costYen: 0 };
    current.calls += 1;
    current.tokens += row.totalTokens;
    current.costYen += yen(row.estimatedCostMicrosYen);
    grouped.set(name, current);
  }
  return [...grouped.entries()]
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.costYen - a.costYen);
}

export async function GET(request: Request) {
  const localPreview =
    process.env.NODE_ENV !== "production" &&
    (!process.env.DATABASE_URL ||
      !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      !process.env.CLERK_SECRET_KEY);
  if (localPreview) {
    return Response.json(createAdminPreviewDashboard(), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const admin = await getAdminIdentity(request);
  if (!admin.allowed) {
    return Response.json(
      { error: admin.status === 401 ? "ログインが必要です。" : "管理者権限がありません。" },
      { status: admin.status },
    );
  }

  try {
    const db = getDb();
    const now = new Date();
    const monthStart = beginningOfMonth(now);
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const trendStart = addMonths(monthStart, -5);

    const [activeRows, usageRows, totalUsersRows, messageRows, trainingRows, analysisRows, databaseSizeResult, subscriptionRows] = await Promise.all([
      db.select({ userId: userSubscriptions.userId })
        .from(userSubscriptions)
        .where(and(
          inArray(userSubscriptions.status, ["active", "grace_period"]),
          gt(userSubscriptions.expiresAt, now),
        )),
      db.select({
        userId: openAiUsageRecords.userId,
        feature: openAiUsageRecords.feature,
        model: openAiUsageRecords.model,
        inputTokens: openAiUsageRecords.inputTokens,
        outputTokens: openAiUsageRecords.outputTokens,
        totalTokens: openAiUsageRecords.totalTokens,
        estimatedCostMicrosYen: openAiUsageRecords.estimatedCostMicrosYen,
        createdAt: openAiUsageRecords.createdAt,
      }).from(openAiUsageRecords).where(gte(openAiUsageRecords.createdAt, trendStart)),
      db.select({ value: count(users.id) }).from(users),
      db.select({ value: count(chatMessages.id) }).from(chatMessages),
      db.select({ value: count(trainingSessions.id) }).from(trainingSessions),
      db.select({ value: count(bodyAnalyses.id) }).from(bodyAnalyses),
      db.execute(sql`select pg_database_size(current_database())::bigint as bytes`),
      db.select({
        userId: userSubscriptions.userId,
        status: userSubscriptions.status,
        createdAt: userSubscriptions.createdAt,
        expiresAt: userSubscriptions.expiresAt,
      }).from(userSubscriptions),
    ]);

    // 移行前の行も、現在の単価設定があれば画面上では再計算して表示する
    const allUsage = (usageRows as UsageRow[]).map((row) => ({
      ...row,
      estimatedCostMicrosYen: row.estimatedCostMicrosYen || estimateOpenAiCostMicrosYen(row.model, row.inputTokens, row.outputTokens),
    }));
    const monthUsage = allUsage.filter((row) => row.createdAt >= monthStart);
    const todayUsage = monthUsage.filter((row) => row.createdAt >= todayStart);
    const openAiMonthYen = yen(sum(monthUsage.map((row) => row.estimatedCostMicrosYen)));
    const openAiTodayYen = yen(sum(todayUsage.map((row) => row.estimatedCostMicrosYen)));
    const paidUsers = activeRows.length;
    const revenueYen = paidUsers * adminCostConfig.monthlyPriceYen;
    const appleFeeYen = revenueYen * (adminCostConfig.appleFeePercent / 100);
    const totalCostYen = appleFeeYen + openAiMonthYen + adminCostConfig.neonMonthlyCostYen + adminCostConfig.otherMonthlyCostYen;
    const profitYen = revenueYen - totalCostYen;
    const dbSizeRaw = (databaseSizeResult as unknown as Array<{ bytes: string | number }>)[0]?.bytes ?? 0;
    const databaseBytes = Number(dbSizeRaw);

    const userIds = [...new Set(monthUsage.map((row) => row.userId))];
    const userRows = userIds.length
      ? await db.select({ id: users.id, email: users.email, displayName: users.displayName })
          .from(users).where(inArray(users.id, userIds))
      : [];
    const userLookup = new Map(userRows.map((user) => [user.id, user]));
    const byUser = new Map<string, { calls: number; tokens: number; costYen: number }>();
    for (const row of monthUsage) {
      const current = byUser.get(row.userId) ?? { calls: 0, tokens: 0, costYen: 0 };
      current.calls += 1;
      current.tokens += row.totalTokens;
      current.costYen += yen(row.estimatedCostMicrosYen);
      byUser.set(row.userId, current);
    }
    const userCosts = [...byUser.entries()].map(([userId, values]) => ({
      userId,
      label: userLookup.get(userId)?.displayName || userLookup.get(userId)?.email || userId,
      ...values,
    })).sort((a, b) => b.costYen - a.costYen);

    const trends = Array.from({ length: 6 }, (_, index) => {
      const start = addMonths(trendStart, index);
      const end = addMonths(start, 1);
      const rows = allUsage.filter((row) => row.createdAt >= start && row.createdAt < end);
      const openAiYen = yen(sum(rows.map((row) => row.estimatedCostMicrosYen)));
      const active = subscriptionRows.filter((subscription) =>
        ["active", "grace_period"].includes(subscription.status) &&
        subscription.createdAt < end &&
        Boolean(subscription.expiresAt && subscription.expiresAt > start),
      ).length;
      const revenue = active * adminCostConfig.monthlyPriceYen;
      const appleFee = revenue * (adminCostConfig.appleFeePercent / 100);
      const profit = revenue - appleFee - openAiYen - adminCostConfig.neonMonthlyCostYen - adminCostConfig.otherMonthlyCostYen;
      return { month: monthKey(start), revenueYen: revenue, openAiYen, neonYen: adminCostConfig.neonMonthlyCostYen, profitYen: profit, paidUsers: active };
    });

    const warnings: string[] = [];
    if (openAiMonthYen > adminCostConfig.warningOpenAiMonthlyYen) warnings.push(`OpenAI料金が月¥${adminCostConfig.warningOpenAiMonthlyYen.toLocaleString("ja-JP")}を超えています。`);
    if (revenueYen > 0 && (openAiMonthYen / revenueYen) * 100 > adminCostConfig.warningOpenAiRevenuePercent) warnings.push(`OpenAI料金が売上の${adminCostConfig.warningOpenAiRevenuePercent}%を超えています。`);
    if (userCosts[0]?.costYen > adminCostConfig.warningUserAiMonthlyYen) warnings.push(`1ユーザーのAI原価が月¥${adminCostConfig.warningUserAiMonthlyYen.toLocaleString("ja-JP")}を超えています。`);
    const storagePercent = adminCostConfig.neonStorageLimitBytes > 0 ? (databaseBytes / adminCostConfig.neonStorageLimitBytes) * 100 : null;
    if (storagePercent !== null && storagePercent >= adminCostConfig.warningNeonStoragePercent) warnings.push("Neonストレージが設定した上限に近づいています。");
    const unpricedModels = [...new Set(monthUsage.filter((row) => !adminCostConfig.modelPrices[row.model]).map((row) => row.model))];
    if (unpricedModels.length) warnings.push(`料金未設定のOpenAIモデルがあります: ${unpricedModels.join(", ")}`);

    return Response.json({
      generatedAt: now.toISOString(),
      summary: {
        paidUsers,
        revenueYen,
        openAiTodayYen,
        openAiMonthYen,
        neonYen: adminCostConfig.neonMonthlyCostYen,
        otherCostYen: adminCostConfig.otherMonthlyCostYen,
        appleFeeYen,
        totalCostYen,
        profitYen,
        profitMarginPercent: revenueYen > 0 ? (profitYen / revenueYen) * 100 : 0,
        averageRevenuePerPaidUserYen: paidUsers ? revenueYen / paidUsers : 0,
        averageAiCostPerPaidUserYen: paidUsers ? openAiMonthYen / paidUsers : 0,
        infrastructureCostPerPaidUserYen: paidUsers ? (openAiMonthYen + adminCostConfig.neonMonthlyCostYen + adminCostConfig.otherMonthlyCostYen) / paidUsers : 0,
        profitPerPaidUserYen: paidUsers ? profitYen / paidUsers : 0,
        totalTokens: sum(monthUsage.map((row) => row.totalTokens)),
        apiCalls: monthUsage.length,
      },
      openAi: { byFeature: groupCost(monthUsage, "feature"), byModel: groupCost(monthUsage, "model"), byUser: userCosts.slice(0, 20) },
      neon: {
        plan: adminCostConfig.neonPlanName,
        databaseBytes,
        storagePercent,
        monthlyCostYen: adminCostConfig.neonMonthlyCostYen,
        monthlyCostKind: "estimated",
        countsKind: "measured",
        counts: { users: totalUsersRows[0]?.value ?? 0, chatMessages: messageRows[0]?.value ?? 0, trainingLogs: trainingRows[0]?.value ?? 0, bodyAnalyses: analysisRows[0]?.value ?? 0 },
      },
      settings: {
        monthlyPriceYen: adminCostConfig.monthlyPriceYen,
        appleFeePercent: adminCostConfig.appleFeePercent,
        pricingSource: "environment",
      },
      trends,
      warnings,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("admin_dashboard_failed", error);
    return Response.json({ error: "管理データを取得できませんでした。" }, { status: 500 });
  }
}
