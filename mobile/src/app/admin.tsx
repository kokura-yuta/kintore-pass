import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type AdminDashboardData,
  fetchAdminDashboard,
} from '@/lib/admin';

const money = (value: number) =>
  `¥${Math.round(value).toLocaleString('ja-JP')}`;
const number = (value: number) =>
  Math.round(value).toLocaleString('ja-JP');
const featureLabels: Record<string, string> = {
  chat: 'AIチャット',
  menu: 'メニュー生成',
  'body-analysis': '身体分析',
  summary: '会話要約',
  other: 'その他',
};

export default function AdminScreen() {
  const router = useRouter();
  const { getToken } = useAuth({ treatPendingAsSignedOut: false });
  const getTokenRef = useRef(getToken);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // Clerkトークンを取得し、管理者限定APIから最新の集計結果を読み込む
  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = await getTokenRef.current();
      if (!token) throw new Error('ログイン状態を確認できませんでした。');
      setData(await fetchAdminDashboard(token));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : '管理データを取得できませんでした。',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => clearTimeout(timerId);
  }, [loadDashboard]);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹ 戻る</Text>
          </Pressable>
          <View style={styles.headerTitle}>
            <Text style={styles.eyebrow}>ADMIN ONLY</Text>
            <Text style={styles.title}>運営ダッシュボード</Text>
          </View>
        </View>

        {isLoading && !data ? (
          <View style={styles.center}>
            <ActivityIndicator color="#73E7FF" size="large" />
            <Text style={styles.loadingText}>運営データを集計しています</Text>
          </View>
        ) : error && !data ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => void loadDashboard()} style={styles.retryButton}>
              <Text style={styles.retryText}>もう一度試す</Text>
            </Pressable>
          </View>
        ) : data ? (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                onRefresh={() => void loadDashboard()}
                refreshing={isLoading}
                tintColor="#73E7FF"
              />
            }
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.updatedAt}>
              {new Date(data.generatedAt).toLocaleString('ja-JP')} 時点
            </Text>

            {data.warnings.length > 0 ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>コスト警告</Text>
                {data.warnings.map((warning) => (
                  <Text key={warning} style={styles.warningText}>⚠ {warning}</Text>
                ))}
              </View>
            ) : null}

            <View style={styles.metricGrid}>
              <MetricCard label="今月の売上" tone="revenue" value={money(data.summary.revenueYen)} />
              <MetricCard label="Appleからの入金" note="推定値" tone="revenue" value={money(data.summary.estimatedAppleProceedsYen)} />
              <MetricCard label="OpenAI" note={`今日 ${money(data.summary.openAiTodayYen)}`} tone="cost" value={money(data.summary.openAiMonthYen)} />
              <MetricCard label="Neon" note="推定値" tone="cost" value={money(data.summary.neonYen)} />
              <MetricCard label="Apple手数料" note={`${data.settings.appleFeePercent}%`} tone="cost" value={money(data.summary.appleFeeYen)} />
              <MetricCard label="その他コスト" tone="cost" value={money(data.summary.otherCostYen)} />
              <MetricCard label="合計運営コスト" tone="cost" value={money(data.summary.totalCostYen)} />
              <MetricCard label="最終推定利益（税引前）" note={`利益率 ${data.summary.profitMarginPercent.toFixed(1)}%`} tone="profit" value={money(data.summary.profitYen)} />
              <MetricCard label="有料ユーザー" tone="revenue" value={`${number(data.summary.paidUsers)}人`} />
              <MetricCard label="1人平均AI原価" tone="cost" value={money(data.summary.averageAiCostPerPaidUserYen)} />
            </View>

            <Section title="OpenAI利用状況">
              <DataRow label="今月の総トークン" value={number(data.summary.totalTokens)} />
              <DataRow label="API呼び出し回数" value={`${number(data.summary.apiCalls)}回`} />
              {data.openAi.byFeature.map((item) => (
                <DataRow
                  key={item.name}
                  label={featureLabels[item.name] ?? item.name}
                  tone="cost"
                  value={money(item.costYen)}
                />
              ))}
            </Section>

            <Section title="Neon利用状況">
              <Text style={styles.kind}>件数・容量は実測値／料金は推定値</Text>
              <DataRow label="現在のプラン" value={data.neon.plan} />
              <DataRow label="DBストレージ" value={`${(data.neon.databaseBytes / 1024 / 1024).toFixed(1)} MB`} />
              <DataRow label="保存ユーザー" value={number(data.neon.counts.users)} />
              <DataRow label="チャットメッセージ" value={number(data.neon.counts.chatMessages)} />
              <DataRow label="トレーニングログ" value={number(data.neon.counts.trainingLogs)} />
              <DataRow label="身体分析データ" value={number(data.neon.counts.bodyAnalyses)} />
            </Section>

            <Section title="AI原価が高いユーザー">
              {data.openAi.byUser.length > 0 ? data.openAi.byUser.map((item, index) => (
                <DataRow
                  key={item.userId}
                  label={`${index + 1}. ${item.label}`}
                  tone="cost"
                  value={money(item.costYen)}
                />
              )) : <Text style={styles.empty}>今月の利用データはありません。</Text>}
            </Section>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function MetricCard({
  label,
  note,
  tone,
  value,
}: {
  label: string;
  note?: string;
  tone: 'revenue' | 'cost' | 'profit';
  value: string;
}) {
  return (
    <View style={[styles.metricCard, styles[`${tone}Card`]]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, styles[`${tone}Text`]]}>{value}</Text>
      {note ? <Text style={styles.metricNote}>{note}</Text> : null}
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function DataRow({ label, tone, value }: { label: string; tone?: 'cost'; value: string }) {
  return <View style={styles.dataRow}><Text style={styles.dataLabel}>{label}</Text><Text style={[styles.dataValue, tone === 'cost' && styles.costText]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' },
  safeArea: { flex: 1 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#203441' },
  backButton: { paddingVertical: 10, paddingRight: 13 },
  backText: { color: '#73E7FF', fontSize: 13, fontWeight: '700' },
  headerTitle: { flex: 1 },
  eyebrow: { color: '#73E7FF', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  title: { marginTop: 4, color: '#F4F6F3', fontSize: 21, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 13, color: '#99AAB4', fontSize: 12 },
  error: { color: '#FF8D98', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  retryButton: { marginTop: 18, paddingHorizontal: 25, paddingVertical: 13, borderRadius: 13, backgroundColor: '#00D4FF' },
  retryText: { color: '#050A0F', fontWeight: '800' },
  content: { padding: 18, paddingBottom: 40 },
  updatedAt: { color: '#72828D', fontSize: 10, textAlign: 'right' },
  warningCard: { marginTop: 13, padding: 15, borderWidth: 1, borderColor: '#80444B', borderRadius: 16, backgroundColor: '#211316' },
  warningTitle: { color: '#FF8D98', fontSize: 14, fontWeight: '800' },
  warningText: { marginTop: 8, color: '#DDB5B9', fontSize: 10, lineHeight: 16 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  metricCard: { width: '48%', minHeight: 110, padding: 14, borderWidth: 1, borderRadius: 16, backgroundColor: '#0C151D' },
  revenueCard: { borderColor: '#176A88' },
  costCard: { borderColor: '#743840' },
  profitCard: { borderColor: '#397155' },
  metricLabel: { color: '#AAB7BF', fontSize: 10, fontWeight: '700' },
  metricValue: { marginTop: 9, fontSize: 20, fontWeight: '900' },
  revenueText: { color: '#73E7FF' },
  costText: { color: '#FF8D98' },
  profitText: { color: '#74E6A5' },
  metricNote: { marginTop: 7, color: '#657681', fontSize: 8, lineHeight: 12 },
  section: { marginTop: 14, padding: 16, borderWidth: 1, borderColor: '#203441', borderRadius: 17, backgroundColor: '#0C151D' },
  sectionTitle: { marginBottom: 8, color: '#F4F6F3', fontSize: 15, fontWeight: '800' },
  kind: { marginBottom: 7, color: '#657681', fontSize: 9 },
  dataRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#203441' },
  dataLabel: { flex: 1, color: '#AAB7BF', fontSize: 10 },
  dataValue: { maxWidth: '52%', color: '#F4F6F3', fontSize: 11, fontWeight: '800', textAlign: 'right' },
  empty: { color: '#657681', fontSize: 10 },
});
