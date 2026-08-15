import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { analysisHistoryPreview, type AnalysisHistoryItem } from '@/lib/analysisHistoryPreview';

export default function AnalysisHistoryScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(analysisHistoryPreview[0]?.id ?? null);
  const selected = analysisHistoryPreview.find((item) => item.id === selectedId) ?? null;
  const latest = analysisHistoryPreview[0];
  const oldest = analysisHistoryPreview.at(-1);
  const weightChange = latest && oldest ? Number((latest.weightKg - oldest.weightKg).toFixed(1)) : null;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable accessibilityLabel="マイページへ戻る" onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
            <View><Text style={styles.eyebrow}>BODY ANALYSIS</Text><Text style={styles.title}>分析履歴</Text></View>
          </View>

          <View style={styles.summaryRow}>
            <SummaryCard label="分析回数" unit="回" value={String(analysisHistoryPreview.length)} />
            <SummaryCard accent={weightChange !== null && weightChange <= 0} label="初回からの変化" unit="kg" value={weightChange === null ? '—' : `${weightChange > 0 ? '+' : ''}${weightChange}`} />
          </View>

          <Text style={styles.sectionTitle}>分析一覧</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
            <View style={styles.timeline}>
              {analysisHistoryPreview.map((item) => (
                <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={[styles.timelineItem, selectedId === item.id && styles.selectedTimelineItem]}>
                  <Text style={[styles.timelineType, selectedId === item.id && styles.selectedTimelineText]}>{item.type === 'initial' ? '初回' : '定期'}</Text>
                  <Text style={[styles.timelineDate, selectedId === item.id && styles.selectedTimelineText]}>{item.analyzedOn.replaceAll('-', '.')}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {selected ? <AnalysisDetail item={selected} /> : <View style={styles.emptyCard}><Text style={styles.emptyText}>分析履歴はまだありません。</Text></View>}

          <Pressable onPress={() => router.push('/body-analysis')} style={styles.analysisButton}>
            <View><Text style={styles.buttonEyebrow}>NEW ANALYSIS</Text><Text style={styles.buttonText}>新しく身体を分析する</Text></View><Text style={styles.buttonArrow}>›</Text>
          </Pressable>
          <Text style={styles.previewNote}>現在は確認用の分析データです。身体分析API接続後はユーザーごとの結果を表示します。</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SummaryCard({ accent, label, unit, value }: { accent?: boolean; label: string; unit: string; value: string }) {
  return <View style={styles.summaryCard}><Text style={styles.summaryLabel}>{label}</Text><Text style={[styles.summaryValue, accent && styles.accentValue]}>{value}<Text style={styles.summaryUnit}> {unit}</Text></Text></View>;
}

function AnalysisDetail({ item }: { item: AnalysisHistoryItem }) {
  return (
    <View style={styles.detailCard}>
      <View style={styles.detailHeading}>
        <View><Text style={styles.detailType}>{item.type === 'initial' ? 'INITIAL ANALYSIS' : 'PERIODIC ANALYSIS'}</Text><Text style={styles.detailDate}>{item.analyzedOn.replaceAll('-', '.')}</Text></View>
        <View style={styles.metricPill}><Text style={styles.metricValue}>{item.weightKg}kg</Text><Text style={styles.metricDivider}> / </Text><Text style={styles.metricValue}>BMI {item.bmi}</Text></View>
      </View>

      <Text style={styles.detailLabel}>AIによる分析</Text>
      <Text style={styles.summaryText}>{item.summary}</Text>

      <Text style={styles.detailLabel}>重点部位</Text>
      <View style={styles.chipRow}>{item.focusAreas.map((area) => <View key={area} style={styles.chip}><Text style={styles.chipText}>{area}</Text></View>)}</View>

      <Text style={styles.detailLabel}>前回からの変化・記録</Text>
      <View style={styles.changeList}>{item.changes.map((change) => <View key={change} style={styles.changeRow}><View style={styles.changeDot} /><Text style={styles.changeText}>{change}</Text></View>)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' }, safeArea: { flex: 1 }, content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center' }, backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: '#303030', borderRadius: 13 }, backText: { color: '#F4F6F3', fontSize: 30, lineHeight: 32 },
  eyebrow: { color: '#FFF1B8', fontSize: 8, fontWeight: '700', letterSpacing: 1.4 }, title: { marginTop: 3, color: '#F4F6F3', fontSize: 27, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 18 }, summaryCard: { flex: 1, padding: 15, borderWidth: 1, borderColor: '#303030', borderRadius: 16, backgroundColor: '#151515' }, summaryLabel: { color: '#737B75', fontSize: 9, fontWeight: '600' }, summaryValue: { marginTop: 8, color: '#F4F6F3', fontSize: 23, fontWeight: '700' }, accentValue: { color: '#FFF1B8' }, summaryUnit: { color: '#8E978F', fontSize: 10 },
  sectionTitle: { marginTop: 23, color: '#F4F6F3', fontSize: 15, fontWeight: '700' }, timelineScroll: { marginHorizontal: -18, marginTop: 11 }, timeline: { flexDirection: 'row', gap: 8, paddingHorizontal: 18 }, timelineItem: { minWidth: 112, paddingHorizontal: 13, paddingVertical: 12, borderWidth: 1, borderColor: '#303030', borderRadius: 13, backgroundColor: '#151515' }, selectedTimelineItem: { borderColor: '#F6D365', backgroundColor: '#F6D365' }, timelineType: { color: '#737B75', fontSize: 8, fontWeight: '700', letterSpacing: 1 }, timelineDate: { marginTop: 4, color: '#DDE1DD', fontSize: 10, fontWeight: '700' }, selectedTimelineText: { color: '#0A0A0A' },
  detailCard: { marginTop: 13, padding: 17, borderWidth: 1, borderColor: '#303030', borderRadius: 18, backgroundColor: '#151515' }, detailHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailType: { color: '#FFF1B8', fontSize: 8, fontWeight: '700', letterSpacing: 1.2 }, detailDate: { marginTop: 5, color: '#F4F6F3', fontSize: 16, fontWeight: '700' }, metricPill: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#272727' }, metricValue: { color: '#DDE1DD', fontSize: 9, fontWeight: '700' }, metricDivider: { color: '#59605A', fontSize: 9 },
  detailLabel: { marginTop: 20, color: '#737B75', fontSize: 9, fontWeight: '700' }, summaryText: { marginTop: 7, color: '#E8EBE8', fontSize: 13, fontWeight: '700', lineHeight: 21 }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 }, chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#332B00' }, chipText: { color: '#FFF1B8', fontSize: 10, fontWeight: '700' }, changeList: { marginTop: 7 }, changeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }, changeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#F6D365' }, changeText: { flex: 1, color: '#A5ADA7', fontSize: 10, lineHeight: 16 },
  emptyCard: { marginTop: 13, padding: 18, borderWidth: 1, borderColor: '#303030', borderRadius: 16, backgroundColor: '#151515' }, emptyText: { color: '#737B75', fontSize: 11 },
  analysisButton: { minHeight: 63, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 17, borderRadius: 15, backgroundColor: '#F6D365' }, buttonEyebrow: { color: '#5C4D00', fontSize: 7, fontWeight: '700', letterSpacing: 1.1 }, buttonText: { marginTop: 4, color: '#0A0A0A', fontSize: 14, fontWeight: '700' }, buttonArrow: { color: '#0A0A0A', fontSize: 27 }, previewNote: { marginTop: 13, color: '#59605A', fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
