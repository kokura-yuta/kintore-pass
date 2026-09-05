import { useAuth } from '@clerk/expo';
import {
  useFocusEffect,
  useRouter,
} from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenStateCard } from '@/components/ScreenStateCard';

import {
  type BodyAnalysisHistoryItem,
  fetchBodyAnalysisHistory,
} from '@/lib/bodyAnalyses';

type LoadingStatus =
  | 'loading'
  | 'ready'
  | 'error';

// 部位別スコアの平均を小数1桁で計算する
function getAverageScore(
  analysis: BodyAnalysisHistoryItem | null,
) {
  const scores =
    analysis?.areas
      .map((area) => area.score)
      .filter(
        (score): score is number =>
          score !== null,
      ) ?? [];

  if (scores.length === 0) return null;

  return Number(
    (
      scores.reduce(
        (total, score) => total + score,
        0,
      ) / scores.length
    ).toFixed(1),
  );
}

// ISO形式の日時を画面表示用の日本語日付へ変換する
function formatAnalysisDate(
  analyzedAt: string | null,
) {
  if (!analyzedAt) return '日時不明';

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(analyzedAt));
}

export default function AnalysisHistoryScreen() {
  const router = useRouter();
  const { getToken } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const [analyses, setAnalyses] = useState<
    BodyAnalysisHistoryItem[]
  >([]);
  const [selectedId, setSelectedId] =
    useState<string | null>(null);
  const [status, setStatus] =
    useState<LoadingStatus>('loading');
  const [errorMessage, setErrorMessage] =
    useState('');

  // 本人の身体分析履歴をバックエンド経由でNeonから取得する
  const loadHistory = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      const token = await getToken();

      if (!token) {
        throw new Error(
          'ログイン状態を確認できませんでした。',
        );
      }

      const response =
        await fetchBodyAnalysisHistory(token);

      setAnalyses(response.analyses);
      setSelectedId((currentId) =>
        response.analyses.some(
          (analysis) =>
            analysis.id === currentId,
        )
          ? currentId
          : response.analyses[0]?.id ?? null,
      );
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '身体分析履歴を取得できませんでした。',
      );
      setStatus('error');
    }
  }, [getToken]);

  // 分析画面から戻った場合も最新履歴へ更新する
  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  const selected =
    analyses.find(
      (analysis) =>
        analysis.id === selectedId,
    ) ?? null;
  const latestAverageScore =
    getAverageScore(analyses[0] ?? null);
  const oldestAnalysisId =
    analyses.at(-1)?.id ?? null;

  return (
    <View style={styles.screen}>
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.safeArea}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="マイページへ戻る"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={styles.backText}>‹</Text>
            </Pressable>
            <View>
              <Text style={styles.eyebrow}>
                BODY ANALYSIS
              </Text>
              <Text style={styles.title}>
                分析履歴
              </Text>
            </View>
          </View>

          {status === 'loading' ? (
            <ScreenStateCard
              message="保存済みの分析結果を確認しています。"
              title="分析履歴を読み込み中"
              type="loading"
            />
          ) : null}

          {status === 'error' ? (
            <ScreenStateCard
              actionLabel="もう一度試す"
              message={errorMessage}
              onAction={() => void loadHistory()}
              title="分析履歴を読み込めませんでした"
              type="error"
            />
          ) : null}

          {status === 'ready' ? (
            <>
              <View style={styles.summaryRow}>
                <SummaryCard
                  label="分析回数"
                  unit="回"
                  value={String(analyses.length)}
                />
                <SummaryCard
                  accent
                  label="最新平均"
                  unit="/10"
                  value={
                    latestAverageScore === null
                      ? '—'
                      : String(latestAverageScore)
                  }
                />
              </View>

              <Text style={styles.sectionTitle}>
                分析一覧
              </Text>

              {analyses.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.timelineScroll}
                >
                  <View style={styles.timeline}>
                    {analyses.map((analysis) => {
                      const isSelected =
                        selectedId === analysis.id;
                      const isInitial =
                        analysis.id ===
                        oldestAnalysisId;

                      return (
                        <Pressable
                          key={analysis.id}
                          onPress={() =>
                            setSelectedId(
                              analysis.id,
                            )
                          }
                          style={[
                            styles.timelineItem,
                            isSelected &&
                              styles.selectedTimelineItem,
                          ]}
                        >
                          <Text
                            style={[
                              styles.timelineType,
                              isSelected &&
                                styles.selectedTimelineText,
                            ]}
                          >
                            {isInitial
                              ? '初回'
                              : '定期'}
                          </Text>
                          <Text
                            style={[
                              styles.timelineDate,
                              isSelected &&
                                styles.selectedTimelineText,
                            ]}
                          >
                            {formatAnalysisDate(
                              analysis.analyzedAt,
                            )}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              ) : null}

              {selected ? (
                <AnalysisDetail
                  isInitial={
                    selected.id === oldestAnalysisId
                  }
                  item={selected}
                />
              ) : (
                <ScreenStateCard
                  compact
                  message="正面・横・背面の写真を使って、最初の分析結果を作成しましょう。"
                  title="分析履歴はまだありません"
                  type="empty"
                />
              )}

              <Pressable
                onPress={() =>
                  router.push('/body-analysis')
                }
                style={styles.analysisButton}
              >
                <View>
                  <Text style={styles.buttonEyebrow}>
                    NEW ANALYSIS
                  </Text>
                  <Text style={styles.buttonText}>
                    新しく身体を分析する
                  </Text>
                </View>
                <Text style={styles.buttonArrow}>›</Text>
              </Pressable>
              <Text style={styles.privacyNote}>
                分析結果はNeonへ保存されています。身体写真自体は現在保存していません。
              </Text>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SummaryCard({
  accent,
  label,
  unit,
  value,
}: {
  accent?: boolean;
  label: string;
  unit: string;
  value: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>
        {label}
      </Text>
      <Text
        style={[
          styles.summaryValue,
          accent && styles.accentValue,
        ]}
      >
        {value}
        <Text style={styles.summaryUnit}>
          {' '}{unit}
        </Text>
      </Text>
    </View>
  );
}

function AnalysisDetail({
  isInitial,
  item,
}: {
  isInitial: boolean;
  item: BodyAnalysisHistoryItem;
}) {
  const averageScore = getAverageScore(item);

  return (
    <View style={styles.detailCard}>
      <View style={styles.detailHeading}>
        <View>
          <Text style={styles.detailType}>
            {isInitial
              ? 'INITIAL ANALYSIS'
              : 'PERIODIC ANALYSIS'}
          </Text>
          <Text style={styles.detailDate}>
            {formatAnalysisDate(item.analyzedAt)}
          </Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricValue}>
            平均 {averageScore ?? '—'} / 10
          </Text>
        </View>
      </View>

      <Text style={styles.detailLabel}>
        AIによる分析
      </Text>
      <Text style={styles.summaryText}>
        {item.summary ?? '分析結果がありません。'}
      </Text>

      <Text style={styles.detailLabel}>
        理想体型との差
      </Text>
      <Text style={styles.bodyText}>
        {item.goalDifference ??
          '比較結果がありません。'}
      </Text>

      <Text style={styles.detailLabel}>
        部位別評価
      </Text>
      <View style={styles.areaList}>
        {item.areas.map((area) => (
          <View
            key={area.id}
            style={styles.areaCard}
          >
            <View style={styles.areaHeading}>
              <Text style={styles.areaName}>
                {area.bodyPart}
              </Text>
              <Text style={styles.areaScore}>
                {area.score ?? '—'}/10
              </Text>
            </View>
            <Text style={styles.bodyText}>
              {area.observation ??
                '評価内容がありません。'}
            </Text>
            <Text style={styles.recommendationText}>
              おすすめ：
              {area.recommendation ?? '—'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: '#203441', borderRadius: 13 },
  backText: { color: '#F4F6F3', fontSize: 30, lineHeight: 32 },
  eyebrow: { color: '#73E7FF', fontSize: 8, fontWeight: '700', letterSpacing: 1.4 },
  title: { marginTop: 3, color: '#F4F6F3', fontSize: 27, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  summaryCard: { flex: 1, padding: 15, borderWidth: 1, borderColor: '#203441', borderRadius: 16, backgroundColor: '#0C151D' },
  summaryLabel: { color: '#72828D', fontSize: 9, fontWeight: '600' },
  summaryValue: { marginTop: 8, color: '#F4F6F3', fontSize: 23, fontWeight: '700' },
  accentValue: { color: '#73E7FF' },
  summaryUnit: { color: '#8798A3', fontSize: 10 },
  sectionTitle: { marginTop: 23, color: '#F4F6F3', fontSize: 15, fontWeight: '700' },
  timelineScroll: { marginHorizontal: -18, marginTop: 11 },
  timeline: { flexDirection: 'row', gap: 8, paddingHorizontal: 18 },
  timelineItem: { minWidth: 112, paddingHorizontal: 13, paddingVertical: 12, borderWidth: 1, borderColor: '#203441', borderRadius: 13, backgroundColor: '#0C151D' },
  selectedTimelineItem: { borderColor: '#00D4FF', backgroundColor: '#00D4FF' },
  timelineType: { color: '#72828D', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  timelineDate: { marginTop: 4, color: '#DDE1DD', fontSize: 10, fontWeight: '700' },
  selectedTimelineText: { color: '#050A0F' },
  detailCard: { marginTop: 13, padding: 17, borderWidth: 1, borderColor: '#203441', borderRadius: 18, backgroundColor: '#0C151D' },
  detailHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailType: { color: '#73E7FF', fontSize: 8, fontWeight: '700', letterSpacing: 1.2 },
  detailDate: { marginTop: 5, color: '#F4F6F3', fontSize: 16, fontWeight: '700' },
  metricPill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#12202A' },
  metricValue: { color: '#DDE1DD', fontSize: 9, fontWeight: '700' },
  detailLabel: { marginTop: 20, color: '#72828D', fontSize: 9, fontWeight: '700' },
  summaryText: { marginTop: 7, color: '#E8EBE8', fontSize: 13, fontWeight: '700', lineHeight: 21 },
  bodyText: { marginTop: 7, color: '#AAB7BF', fontSize: 10, lineHeight: 17 },
  areaList: { gap: 9, marginTop: 9 },
  areaCard: { padding: 13, borderRadius: 13, backgroundColor: '#101C25' },
  areaHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  areaName: { color: '#F4F6F3', fontSize: 12, fontWeight: '700' },
  areaScore: { color: '#73E7FF', fontSize: 11, fontWeight: '700' },
  recommendationText: { marginTop: 8, color: '#73E7FF', fontSize: 9, lineHeight: 15 },
  analysisButton: { minHeight: 63, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 17, borderRadius: 15, backgroundColor: '#00D4FF' },
  buttonEyebrow: { color: '#07506A', fontSize: 7, fontWeight: '700', letterSpacing: 1.1 },
  buttonText: { marginTop: 4, color: '#050A0F', fontSize: 14, fontWeight: '700' },
  buttonArrow: { color: '#050A0F', fontSize: 27 },
  privacyNote: { marginTop: 13, color: '#556772', fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
