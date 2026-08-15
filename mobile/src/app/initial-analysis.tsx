import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalysisMetricCard } from '@/components/AnalysisMetricCard';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { createInitialAnalysisPreview, getGoalBodyLabel } from '@/lib/initialAnalysisPreview';

type AnalysisStatus = 'review' | 'loading' | 'result';

const locationLabels = { home: '自宅', gym: 'ジム', both: '両方' } as const;

export default function InitialAnalysisScreen() {
  const router = useRouter();
  const { goalBody, profile } = useOnboarding();
  const [status, setStatus] = useState<AnalysisStatus>('review');
  const analysis = useMemo(
    () => createInitialAnalysisPreview(profile, goalBody),
    [goalBody, profile],
  );

  useEffect(() => {
    if (status !== 'loading') return;
    const timerId = setTimeout(() => setStatus('result'), 1400);
    return () => clearTimeout(timerId);
  }, [status]);

  const hasRequiredProfile = Boolean(profile.heightCm && profile.weightKg && goalBody);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>FIRST SETUP</Text>
            <Text style={styles.step}>STEP 3 / 3</Text>
          </View>

          {status === 'review' ? (
            <>
              <Text style={styles.title}>初回分析</Text>
              <Text style={styles.lead}>入力内容を確認して、最初の方針を作成します。</Text>

              <View style={styles.card}>
                <Text style={styles.cardEyebrow}>YOUR PROFILE</Text>
                <SummaryRow label="目標体型" value={getGoalBodyLabel(goalBody)} />
                <SummaryRow label="身長・体重" value={`${profile.heightCm || '—'}cm / ${profile.weightKg || '—'}kg`} />
                <SummaryRow
                  label="トレーニング場所"
                  value={profile.trainingLocation ? locationLabels[profile.trainingLocation] : '未設定'}
                />
                <SummaryRow
                  label="週の回数・時間"
                  value={`${profile.weeklyTrainingDays ? `週${profile.weeklyTrainingDays}回` : '未設定'} / ${profile.availableMinutes ? `${profile.availableMinutes}分` : '未設定'}`}
                />
                <SummaryRow
                  label="苦手な部位"
                  value={profile.weakBodyParts.length ? profile.weakBodyParts.join('・') : '未設定'}
                  withBorder={false}
                />
              </View>

              {!hasRequiredProfile ? (
                <Text style={styles.error}>理想体型・身長・体重を入力してから分析してください。</Text>
              ) : null}

              <Pressable
                disabled={!hasRequiredProfile}
                onPress={() => setStatus('loading')}
                style={[styles.primaryButton, !hasRequiredProfile && styles.disabledButton]}
              >
                <Text style={styles.primaryButtonText}>分析を始める</Text>
                <Text style={styles.primaryArrow}>→</Text>
              </Pressable>
              <Pressable onPress={() => router.back()} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>入力内容を変更する</Text>
              </Pressable>
            </>
          ) : null}

          {status === 'loading' ? (
            <View style={styles.loadingArea}>
              <ActivityIndicator color="#F6D365" size="large" />
              <Text style={styles.loadingTitle}>データを分析しています</Text>
              <Text style={styles.loadingText}>目標とトレーニング条件を整理しています…</Text>
            </View>
          ) : null}

          {status === 'result' ? (
            <>
              <Text style={styles.resultEyebrow}>ANALYSIS COMPLETE</Text>
              <Text style={styles.title}>最初の方針ができました</Text>
              <Text style={styles.lead}>{analysis.summary}</Text>

              <View style={styles.metricRow}>
                {analysis.metrics.map((metric) => (
                  <AnalysisMetricCard key={metric.label} {...metric} />
                ))}
              </View>

              <View style={styles.adviceCard}>
                <Text style={styles.adviceNumber}>01</Text>
                <Text style={styles.adviceTitle}>優先すること</Text>
                <Text style={styles.adviceText}>{analysis.focus}</Text>
              </View>
              <View style={styles.adviceCard}>
                <Text style={styles.adviceNumber}>02</Text>
                <Text style={styles.adviceTitle}>最初の進め方</Text>
                <Text style={styles.adviceText}>{analysis.firstPlan}</Text>
              </View>

              <View style={styles.previewNotice}>
                <Text style={styles.previewNoticeTitle}>開発用プレビュー</Text>
                <Text style={styles.previewNoticeText}>
                  現在は入力情報から作った確認用結果です。本番では身体分析APIの結果へ置き換えます。
                </Text>
              </View>

              <Pressable onPress={() => router.replace('/home')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>ホームへ進む</Text>
                <Text style={styles.primaryArrow}>→</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SummaryRow({ label, value, withBorder = true }: { label: string; value: string; withBorder?: boolean }) {
  return (
    <View style={[styles.summaryRow, !withBorder && styles.lastSummaryRow]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  safeArea: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 46 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: '#FFF1B8', fontSize: 11, fontWeight: '600', letterSpacing: 1.6 },
  step: { color: '#737B75', fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  title: { marginTop: 24, color: '#F4F6F3', fontSize: 31, fontWeight: '700' },
  lead: { marginTop: 10, color: '#9DA69F', fontSize: 14, lineHeight: 22 },
  card: {
    marginTop: 24,
    padding: 17,
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 17,
    backgroundColor: '#151515',
  },
  cardEyebrow: { marginBottom: 6, color: '#FFF1B8', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#303030',
  },
  lastSummaryRow: { borderBottomWidth: 0, paddingBottom: 2 },
  summaryLabel: { color: '#737B75', fontSize: 12 },
  summaryValue: { flex: 1, color: '#F4F6F3', fontSize: 12, fontWeight: '600', textAlign: 'right' },
  error: { marginTop: 12, color: '#FF7676', fontSize: 12, lineHeight: 18 },
  primaryButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: '#F6D365',
  },
  disabledButton: { opacity: 0.4 },
  primaryButtonText: { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  primaryArrow: { color: '#0A0A0A', fontSize: 20, fontWeight: '700' },
  textButton: { alignItems: 'center', paddingVertical: 17 },
  textButtonLabel: { color: '#FFF1B8', fontSize: 13, fontWeight: '600' },
  loadingArea: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 540 },
  loadingTitle: { marginTop: 22, color: '#F4F6F3', fontSize: 23, fontWeight: '700' },
  loadingText: { marginTop: 10, color: '#737B75', fontSize: 13 },
  resultEyebrow: { marginTop: 24, color: '#FFF1B8', fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  adviceCard: {
    marginTop: 14,
    padding: 17,
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 16,
    backgroundColor: '#151515',
  },
  adviceNumber: { color: '#FFF1B8', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  adviceTitle: { marginTop: 8, color: '#F4F6F3', fontSize: 16, fontWeight: '700' },
  adviceText: { marginTop: 8, color: '#9DA69F', fontSize: 13, lineHeight: 21 },
  previewNotice: { marginTop: 15, padding: 14, borderRadius: 13, backgroundColor: '#222222' },
  previewNoticeTitle: { color: '#FFF1B8', fontSize: 11, fontWeight: '700' },
  previewNoticeText: { marginTop: 5, color: '#899189', fontSize: 11, lineHeight: 17 },
});
