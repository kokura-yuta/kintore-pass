import { useAuth } from '@clerk/expo';
import { type Href, Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTrainingDraft } from '@/contexts/TrainingDraftContext';
import { getGoalBodyLabel } from '@/lib/initialAnalysisPreview';
import { homePreview } from '@/lib/homePreview';

function formatToday() {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());
}

export default function HomeScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const { goalBody } = useOnboarding();
  const { setDraft } = useTrainingDraft();

  function startTraining() {
    setDraft({
      menuId: 'preview-menu-today',
      exercises: homePreview.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: exercise.sets,
      })),
    });
    router.push('/training' as Href);
  }

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>筋トレ<Text style={styles.brandAccent}>PAS</Text></Text>
              <Text style={styles.date}>{formatToday()}</Text>
            </View>
            <View style={styles.goalPill}>
              <Text style={styles.goalLabel}>GOAL</Text>
              <Text numberOfLines={1} style={styles.goalValue}>{getGoalBodyLabel(goalBody)}</Text>
            </View>
          </View>

          <View style={styles.coachCard}>
            <Text style={styles.cardEyebrow}>AI COACH</Text>
            <Text style={styles.coachMessage}>{homePreview.aiMessage}</Text>
          </View>

          <View style={styles.menuCard}>
            <View style={styles.menuHeading}>
              <View style={styles.menuHeadingCopy}>
                <Text style={styles.cardEyebrow}>TODAY&apos;S TRAINING</Text>
                <Text style={styles.menuTitle}>今日のメニュー</Text>
              </View>
              <View style={styles.menuNumberBadge}>
                <Text style={styles.menuNumber}>01</Text>
              </View>
            </View>

            <Text style={styles.targetLabel}>おすすめ部位</Text>
            <Text style={styles.targetArea}>{homePreview.targetArea}</Text>
            <Text style={styles.reason}>{homePreview.reason}</Text>

            <View style={styles.exerciseList}>
              {homePreview.exercises.map((exercise, index) => (
                <View key={exercise.name} style={[styles.exerciseRow, index === homePreview.exercises.length - 1 && styles.lastExercise]}>
                  <View style={styles.exerciseIndex}>
                    <Text style={styles.exerciseIndexText}>{String(index + 1).padStart(2, '0')}</Text>
                  </View>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.prescription}>{exercise.prescription}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>推奨時間</Text>
              <Text style={styles.statusValue}>{homePreview.recommendedMinutes}<Text style={styles.statusUnit}> 分</Text></Text>
              <Text style={styles.statusHint}>準備運動を含む</Text>
            </View>
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>コンディション</Text>
              <Text style={styles.conditionValue}>{homePreview.conditionLabel}</Text>
              <View style={styles.conditionTrack}>
                <View style={[styles.conditionBar, { width: `${homePreview.conditionScore * 10}%` }]} />
              </View>
            </View>
          </View>

          <Pressable onPress={startTraining} style={styles.startButton}>
            <View>
              <Text style={styles.startLabel}>START NOW</Text>
              <Text style={styles.startText}>トレーニングを開始</Text>
            </View>
            <Text style={styles.startArrow}>→</Text>
          </Pressable>

          <Text style={styles.previewNote}>現在は開発用のホームデータを表示しています。</Text>
        </ScrollView>
      </SafeAreaView>
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0D0C' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#F4F6F3', fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  brandAccent: { color: '#B6F24B' },
  date: { marginTop: 4, color: '#737B75', fontSize: 11, fontWeight: '700' },
  goalPill: {
    maxWidth: '48%',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#2C312D',
    borderRadius: 22,
    backgroundColor: '#151816',
  },
  goalLabel: { color: '#737B75', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  goalValue: { marginTop: 2, color: '#E8EBE8', fontSize: 11, fontWeight: '900' },
  coachCard: {
    marginTop: 22,
    padding: 18,
    borderLeftWidth: 3,
    borderLeftColor: '#B6F24B',
    borderRadius: 14,
    backgroundColor: '#171B17',
  },
  cardEyebrow: { color: '#B6F24B', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  coachMessage: { marginTop: 9, color: '#F4F6F3', fontSize: 16, fontWeight: '800', lineHeight: 25 },
  menuCard: {
    marginTop: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2C312D',
    borderRadius: 18,
    backgroundColor: '#121512',
  },
  menuHeading: { flexDirection: 'row', justifyContent: 'space-between' },
  menuHeadingCopy: { flex: 1 },
  menuTitle: { marginTop: 6, color: '#F4F6F3', fontSize: 25, fontWeight: '900' },
  menuNumberBadge: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#B6F24B',
  },
  menuNumber: { color: '#0B0D0C', fontSize: 11, fontWeight: '900' },
  targetLabel: { marginTop: 22, color: '#737B75', fontSize: 10, fontWeight: '800' },
  targetArea: { marginTop: 5, color: '#B6F24B', fontSize: 18, fontWeight: '900' },
  reason: { marginTop: 8, color: '#8E978F', fontSize: 12, lineHeight: 19 },
  exerciseList: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#2C312D' },
  exerciseRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2C312D',
  },
  lastExercise: { borderBottomWidth: 0 },
  exerciseIndex: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#222722',
  },
  exerciseIndexText: { color: '#B6F24B', fontSize: 9, fontWeight: '900' },
  exerciseName: { flex: 1, marginLeft: 10, color: '#E8EBE8', fontSize: 12, fontWeight: '800' },
  prescription: { color: '#7F8881', fontSize: 10, fontWeight: '700' },
  statusRow: { flexDirection: 'row', gap: 11, marginTop: 14 },
  statusCard: {
    flex: 1,
    minHeight: 118,
    padding: 15,
    borderWidth: 1,
    borderColor: '#2C312D',
    borderRadius: 16,
    backgroundColor: '#151816',
  },
  statusLabel: { color: '#737B75', fontSize: 10, fontWeight: '800' },
  statusValue: { marginTop: 10, color: '#F4F6F3', fontSize: 25, fontWeight: '900' },
  statusUnit: { color: '#9DA69F', fontSize: 11 },
  statusHint: { marginTop: 6, color: '#697169', fontSize: 9 },
  conditionValue: { marginTop: 10, color: '#B6F24B', fontSize: 21, fontWeight: '900' },
  conditionTrack: { height: 4, marginTop: 12, overflow: 'hidden', borderRadius: 2, backgroundColor: '#303630' },
  conditionBar: { height: '100%', borderRadius: 2, backgroundColor: '#B6F24B' },
  startButton: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 19,
    borderRadius: 17,
    backgroundColor: '#B6F24B',
  },
  startLabel: { color: '#344315', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  startText: { marginTop: 4, color: '#0B0D0C', fontSize: 16, fontWeight: '900' },
  startArrow: { color: '#0B0D0C', fontSize: 24, fontWeight: '900' },
  previewNote: { marginTop: 13, color: '#59605A', fontSize: 9, textAlign: 'center' },
});
