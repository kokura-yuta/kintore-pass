import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTrainingDraft } from '@/contexts/TrainingDraftContext';
import { getMenuPreview, type GeneratedMenuPreview } from '@/lib/aiMenuPreview';

type GenerationStatus = 'condition' | 'loading' | 'result';

export default function AiCoachScreen() {
  const router = useRouter();
  const { profile } = useOnboarding();
  const { setDraft, setLatestGeneratedMenu, todayBodyPart } = useTrainingDraft();
  const [condition, setCondition] = useState<number | null>(null);
  const [generation, setGeneration] = useState(0);
  const [status, setStatus] = useState<GenerationStatus>('condition');
  const [menu, setMenu] = useState<GeneratedMenuPreview | null>(null);
  const [error, setError] = useState('');
  const trainingStyle = profile.trainingStyle ?? 'ai';

  useEffect(() => {
    if (status !== 'loading' || !condition) return;
    const timer = setTimeout(() => {
      const generatedMenu = getMenuPreview(condition, generation, trainingStyle, todayBodyPart);
      setMenu(generatedMenu);
      setLatestGeneratedMenu({ menu: generatedMenu, condition });
      setStatus('result');
    }, 1400);
    return () => clearTimeout(timer);
  }, [condition, generation, setLatestGeneratedMenu, status, todayBodyPart, trainingStyle]);

  function generateMenu() {
    if (!condition) {
      setError('今日の調子を1〜10で選択してください。');
      return;
    }
    if (trainingStyle === 'split' && !todayBodyPart) {
      setError('ホームで今日鍛える部位を選択してください。');
      return;
    }
    setError('');
    setStatus('loading');
  }

  function regenerateMenu() {
    setGeneration((current) => current + 1);
    setStatus('loading');
  }

  function startMenu() {
    if (!menu) return;
    setDraft({
      menuId: menu.menuId,
      exercises: menu.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: Array.from({ length: exercise.setCount }, () => ({ weightKg: exercise.weightKg, reps: exercise.reps })),
      })),
    });
    router.push('/training');
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}><View><Text style={styles.eyebrow}>AI COACH</Text><Text style={styles.title}>今日のメニュー</Text></View><View style={styles.aiBadge}><Text style={styles.aiBadgeText}>AI</Text></View></View>

          {status === 'condition' ? (
            <>
              <Text style={styles.lead}>今日の身体の状態を教えてください。目標や過去の記録と合わせてメニューを調整します。</Text>
              <View style={styles.conditionCard}>
                <View style={styles.cardHeading}><Text style={styles.cardTitle}>今日の調子</Text><Text style={styles.conditionValue}>{condition ?? '—'} / 10</Text></View>
                <View style={styles.ratingRow}>{Array.from({ length: 10 }, (_, index) => index + 1).map((score) => <Pressable key={score} onPress={() => { setCondition(score); setError(''); }} style={[styles.ratingButton, condition === score && styles.selectedRating]}><Text style={[styles.ratingText, condition === score && styles.selectedRatingText]}>{score}</Text></Pressable>)}</View>
                <View style={styles.ratingGuide}><Text style={styles.guideText}>疲れている</Text><Text style={styles.guideText}>絶好調</Text></View>
              </View>
              <View style={styles.referenceCard}><Text style={styles.referenceTitle}>AIが参考にする情報</Text><View style={styles.chipRow}>{['目標体型', '身体データ', '過去の記録', '前回の部位', '最近鍛えていない部位'].map((label) => <View key={label} style={styles.infoChip}><Text style={styles.infoChipText}>{label}</Text></View>)}</View></View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable onPress={generateMenu} style={styles.primaryButton}><Text style={styles.primaryText}>AIメニューを生成</Text><Text style={styles.primaryArrow}>›</Text></Pressable>
            </>
          ) : null}

          {status === 'loading' ? <View style={styles.loadingArea}><ActivityIndicator color="#F6D365" size="large" /><Text style={styles.loadingTitle}>メニューを考えています</Text><Text style={styles.loadingText}>疲労・履歴・目標体型を確認中…</Text></View> : null}

          {status === 'result' && menu ? (
            <>
              <View style={styles.targetCard}><Text style={styles.cardEyebrow}>RECOMMENDED AREA</Text><Text style={styles.targetArea}>{menu.targetArea}</Text><Text style={styles.reason}>{menu.reason}</Text></View>
              <View style={styles.timeRow}><Text style={styles.timeLabel}>推定トレーニング時間</Text><Text style={styles.timeValue}>{menu.estimatedMinutes}<Text style={styles.timeUnit}> 分</Text></Text></View>
              <Text style={styles.sectionTitle}>トレーニング種目</Text>
              {menu.exercises.map((exercise, index) => <View key={exercise.exerciseId} style={styles.exerciseCard}><View style={styles.exerciseNumber}><Text style={styles.exerciseNumberText}>{String(index + 1).padStart(2, '0')}</Text></View><View style={styles.exerciseCopy}><View style={styles.exerciseNameRow}><Text style={styles.exerciseName}>{exercise.name}</Text>{exercise.source ? <View style={exercise.source === 'frequent' ? styles.frequentBadge : styles.recommendedBadge}><Text style={styles.sourceText}>{exercise.source === 'frequent' ? 'よく行う' : 'AI推奨'}</Text></View> : null}</View><Text style={styles.equipment}>{exercise.equipment}</Text></View><View style={styles.prescription}><Text style={styles.prescriptionMain}>{exercise.weightKg ? `${exercise.weightKg}kg` : '自重'}</Text><Text style={styles.prescriptionSub}>{exercise.reps}回 × {exercise.setCount}セット</Text></View></View>)}
              <View style={styles.adviceCard}><Text style={styles.adviceTitle}>AIからの注意点</Text><Text style={styles.adviceText}>{menu.advice}</Text></View>
              <Pressable onPress={startMenu} style={styles.primaryButton}><Text style={styles.primaryText}>このメニューで開始</Text><Text style={styles.primaryArrow}>›</Text></Pressable>
              <Pressable onPress={regenerateMenu} style={styles.secondaryButton}><Text style={styles.secondaryText}>メニューを再生成</Text></Pressable>
              <Pressable onPress={() => setStatus('condition')} style={styles.textButton}><Text style={styles.textButtonText}>今日の調子を変更</Text></Pressable>
              <Text style={styles.previewNote}>現在は確認用の生成結果です。API接続後に履歴と疲労状態を使って生成します。</Text>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' }, safeArea: { flex: 1 }, content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 17, paddingBottom: 28 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { color: '#FFF1B8', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 }, title: { fontFamily: 'Yu Mincho', marginTop: 5, color: '#F4F6F3', fontSize: 27, fontWeight: '700' }, aiBadge: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#F6D365' }, aiBadgeText: { color: '#0A0A0A', fontSize: 12, fontWeight: '700' }, lead: { marginTop: 19, color: '#8E978F', fontSize: 12, lineHeight: 19 },
  conditionCard: { marginTop: 17, padding: 17, borderWidth: 1, borderColor: '#303030', borderRadius: 18, backgroundColor: '#151515' }, cardHeading: { flexDirection: 'row', justifyContent: 'space-between' }, cardTitle: { fontFamily: 'Yu Mincho', color: '#F4F6F3', fontSize: 16, fontWeight: '700' }, conditionValue: { color: '#FFF1B8', fontSize: 14, fontWeight: '700' }, ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 17 }, ratingButton: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 10, backgroundColor: '#0A0A0A' }, selectedRating: { borderColor: '#F6D365', backgroundColor: '#F6D365' }, ratingText: { color: '#8E978F', fontSize: 11, fontWeight: '700' }, selectedRatingText: { color: '#0A0A0A' }, ratingGuide: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }, guideText: { color: '#59605A', fontSize: 8 },
  referenceCard: { marginTop: 13, padding: 15, borderRadius: 16, backgroundColor: '#121212' }, referenceTitle: { color: '#A5ADA7', fontSize: 10, fontWeight: '700' }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }, infoChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, backgroundColor: '#292929' }, infoChipText: { color: '#8E978F', fontSize: 8, fontWeight: '600' }, error: { marginTop: 12, color: '#FF7676', fontSize: 11 },
  primaryButton: { minHeight: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingHorizontal: 17, borderRadius: 15, backgroundColor: '#F6D365' }, primaryText: { color: '#0A0A0A', fontSize: 14, fontWeight: '700' }, primaryArrow: { color: '#0A0A0A', fontSize: 27 }, loadingArea: { flex: 1, minHeight: 500, alignItems: 'center', justifyContent: 'center' }, loadingTitle: { fontFamily: 'Yu Mincho', marginTop: 21, color: '#F4F6F3', fontSize: 22, fontWeight: '700' }, loadingText: { marginTop: 9, color: '#737B75', fontSize: 11 },
  targetCard: { marginTop: 19, padding: 17, borderLeftWidth: 3, borderLeftColor: '#F6D365', borderRadius: 16, backgroundColor: '#181818' }, cardEyebrow: { color: '#FFF1B8', fontSize: 8, fontWeight: '700', letterSpacing: 1.3 }, targetArea: { fontFamily: 'Yu Mincho', marginTop: 7, color: '#F4F6F3', fontSize: 22, fontWeight: '700' }, reason: { marginTop: 9, color: '#9DA69F', fontSize: 11, lineHeight: 18 }, timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13, padding: 15, borderWidth: 1, borderColor: '#303030', borderRadius: 15, backgroundColor: '#151515' }, timeLabel: { color: '#8E978F', fontSize: 10, fontWeight: '600' }, timeValue: { color: '#F4F6F3', fontSize: 22, fontWeight: '700' }, timeUnit: { color: '#737B75', fontSize: 9 }, sectionTitle: { marginTop: 21, marginBottom: 10, color: '#F4F6F3', fontSize: 15, fontWeight: '700' },
  exerciseCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 12, borderWidth: 1, borderColor: '#303030', borderRadius: 15, backgroundColor: '#151515' }, exerciseNumber: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#292929' }, exerciseNumberText: { color: '#FFF1B8', fontSize: 8, fontWeight: '700' }, exerciseCopy: { flex: 1, marginLeft: 10 }, exerciseName: { color: '#E8EBE8', fontSize: 11, fontWeight: '700' }, equipment: { marginTop: 4, color: '#697169', fontSize: 8 }, prescription: { alignItems: 'flex-end' }, prescriptionMain: { color: '#F4F6F3', fontSize: 12, fontWeight: '700' }, prescriptionSub: { marginTop: 4, color: '#8E978F', fontSize: 8 }, adviceCard: { marginTop: 7, padding: 15, borderRadius: 15, backgroundColor: '#222222' }, adviceTitle: { color: '#FFF1B8', fontSize: 10, fontWeight: '700' }, adviceText: { marginTop: 7, color: '#A5ADA7', fontSize: 10, lineHeight: 17 }, secondaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderWidth: 1, borderColor: '#F6D365', borderRadius: 14 }, secondaryText: { color: '#FFF1B8', fontSize: 12, fontWeight: '700' }, textButton: { alignItems: 'center', paddingVertical: 15 }, textButtonText: { color: '#8E978F', fontSize: 10, fontWeight: '600' }, previewNote: { color: '#59605A', fontSize: 9, lineHeight: 15, textAlign: 'center' },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, frequentBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, backgroundColor: '#332B00' }, recommendedBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, backgroundColor: '#292929' }, sourceText: { color: '#FFF1B8', fontSize: 6, fontWeight: '700' },
});
