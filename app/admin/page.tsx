"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

type Breakdown = { name: string; calls: number; tokens: number; costYen: number };
type DashboardData = {
  generatedAt: string;
  summary: Record<string, number> & { paidUsers: number; totalTokens: number; apiCalls: number };
  openAi: { byFeature: Breakdown[]; byModel: Breakdown[]; byUser: Array<Breakdown & { userId: string; label: string }> };
  neon: {
    plan: string;
    databaseBytes: number;
    storagePercent: number | null;
    monthlyCostKind: "estimated";
    countsKind: "measured";
    counts: { users: number; chatMessages: number; trainingLogs: number; bodyAnalyses: number };
  };
  settings: { monthlyPriceYen: number; appleFeePercent: number; pricingSource: string };
  trends: Array<{ month: string; revenueYen: number; openAiYen: number; neonYen: number; profitYen: number; paidUsers: number }>;
  warnings: string[];
};

const money = (value: number) => `¥${Math.round(value).toLocaleString("ja-JP")}`;
const number = (value: number) => Math.round(value).toLocaleString("ja-JP");
const featureNames: Record<string, string> = { chat: "AIチャット", menu: "メニュー生成", "body-analysis": "身体分析", summary: "会話要約", other: "その他" };

async function fetchDashboard() {
  const response = await fetch("/api/admin/dashboard", { cache: "no-store", credentials: "include" });
  const result = await response.json() as DashboardData & { error?: string };
  if (!response.ok) throw new Error(result.error || "管理データを取得できませんでした。");
  return result;
}

function MetricCard({ label, value, tone = "normal", note }: { label: string; value: string; tone?: "normal" | "profit" | "cost"; note?: string }) {
  return <article className={`${styles.card} ${styles[tone]}`}><span>{label}</span><strong>{value}</strong>{note ? <small>{note}</small> : null}</article>;
}

function Bars({ data, valueKey, formatter }: { data: DashboardData["trends"]; valueKey: keyof DashboardData["trends"][number]; formatter: (value: number) => string }) {
  const maximum = Math.max(1, ...data.map((item) => Math.abs(Number(item[valueKey]))));
  return <div className={styles.bars}>{data.map((item) => {
    const value = Number(item[valueKey]);
    return <div className={styles.barColumn} key={item.month}><div className={styles.barValue}>{formatter(value)}</div><div className={styles.barTrack}><div className={value < 0 ? styles.negativeBar : styles.bar} style={{ height: `${Math.max(3, Math.abs(value) / maximum * 100)}%` }} /></div><span>{item.month.slice(5)}月</span></div>;
  })}</div>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchDashboard());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "管理データを取得できませんでした。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchDashboard()
      .then((result) => { if (active) setData(result); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "管理データを取得できませんでした。");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <main className={styles.center}><p>運営データを集計しています…</p></main>;
  if (error || !data) return <main className={styles.center}><p className={styles.error}>{error || "表示できません。"}</p><button onClick={() => void load()}>もう一度試す</button></main>;

  const s = data.summary;
  return <main className={styles.page}>
    <header className={styles.header}><div><p>OPERATIONS</p><h1>運営ダッシュボード</h1><span>{new Date(data.generatedAt).toLocaleString("ja-JP")} 時点</span></div><button onClick={() => void load()}>更新</button></header>

    {data.warnings.length ? <section className={styles.warning}><h2>コスト警告</h2>{data.warnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}</section> : null}

    <section className={styles.grid}>
      <MetricCard label="今月の売上" value={money(s.revenueYen)} note="推定値" />
      <MetricCard label="OpenAI" value={money(s.openAiMonthYen)} tone="cost" note={`今日 ${money(s.openAiTodayYen)}`} />
      <MetricCard label="Neon" value={money(s.neonYen)} tone="cost" note="推定値" />
      <MetricCard label="Apple手数料" value={money(s.appleFeeYen)} tone="cost" note={`${data.settings.appleFeePercent}%で計算`} />
      <MetricCard label="その他コスト" value={money(s.otherCostYen)} tone="cost" />
      <MetricCard label="合計運営コスト" value={money(s.totalCostYen)} tone="cost" />
      <MetricCard label="推定利益" value={money(s.profitYen)} tone="profit" note={`利益率 ${s.profitMarginPercent.toFixed(1)}%`} />
      <MetricCard label="有料ユーザー" value={`${number(s.paidUsers)}人`} note={`月額 ${money(data.settings.monthlyPriceYen)}`} />
      <MetricCard label="1人平均売上" value={money(s.averageRevenuePerPaidUserYen)} />
      <MetricCard label="1人平均AI原価" value={money(s.averageAiCostPerPaidUserYen)} />
      <MetricCard label="1人インフラ原価" value={money(s.infrastructureCostPerPaidUserYen)} />
      <MetricCard label="1人あたり利益" value={money(s.profitPerPaidUserYen)} tone="profit" />
    </section>

    <section className={styles.chartGrid}>
      <article className={styles.panel}><h2>月別売上推移</h2><Bars data={data.trends} valueKey="revenueYen" formatter={money} /></article>
      <article className={styles.panel}><h2>月別推定利益</h2><Bars data={data.trends} valueKey="profitYen" formatter={money} /></article>
      <article className={styles.panel}><h2>月別OpenAI料金</h2><Bars data={data.trends} valueKey="openAiYen" formatter={money} /></article>
      <article className={styles.panel}><h2>月別Neon料金</h2><Bars data={data.trends} valueKey="neonYen" formatter={money} /></article>
      <article className={styles.panel}><h2>有料ユーザー推移</h2><Bars data={data.trends} valueKey="paidUsers" formatter={(value) => `${number(value)}人`} /></article>
    </section>

    <section className={styles.detailGrid}>
      <article className={styles.panel}><h2>OpenAI利用状況</h2><div className={styles.statLine}><span>今月の総トークン</span><b>{number(s.totalTokens)}</b></div><div className={styles.statLine}><span>API呼び出し回数</span><b>{number(s.apiCalls)}回</b></div><h3>機能別</h3>{data.openAi.byFeature.map((item) => <div className={styles.statLine} key={item.name}><span>{featureNames[item.name] || item.name}</span><b>{money(item.costYen)}</b></div>)}<h3>モデル別</h3>{data.openAi.byModel.map((item) => <div className={styles.statLine} key={item.name}><span>{item.name}</span><b>{money(item.costYen)}</b></div>)}</article>
      <article className={styles.panel}><h2>Neon利用状況</h2><p className={styles.kind}>件数・容量は実測値／料金は推定値</p><div className={styles.statLine}><span>現在のプラン</span><b>{data.neon.plan}</b></div><div className={styles.statLine}><span>DBストレージ</span><b>{(data.neon.databaseBytes / 1024 / 1024).toFixed(1)} MB</b></div><div className={styles.statLine}><span>保存ユーザー</span><b>{number(data.neon.counts.users)}</b></div><div className={styles.statLine}><span>チャットメッセージ</span><b>{number(data.neon.counts.chatMessages)}</b></div><div className={styles.statLine}><span>トレーニングログ</span><b>{number(data.neon.counts.trainingLogs)}</b></div><div className={styles.statLine}><span>身体分析データ</span><b>{number(data.neon.counts.bodyAnalyses)}</b></div></article>
    </section>

    <section className={styles.panel}><h2>OpenAI利用料金が高いユーザー</h2>{data.openAi.byUser.length ? <div className={styles.table}><div className={styles.tableHeader}><span>ユーザー</span><span>回数</span><span>トークン</span><span>推定料金</span></div>{data.openAi.byUser.map((item, index) => <div className={styles.tableRow} key={item.userId}><span>{index + 1}. {item.label}</span><span>{number(item.calls)}</span><span>{number(item.tokens)}</span><strong>{money(item.costYen)}</strong></div>)}</div> : <p className={styles.empty}>今月のOpenAI利用データはありません。</p>}</section>
  </main>;
}
