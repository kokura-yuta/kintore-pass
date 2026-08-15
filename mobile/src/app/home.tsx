import { useAuth } from '@clerk/expo';
import { type Href, Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTrainingDraft } from '@/contexts/TrainingDraftContext';
import { getGoalBodyLabel } from '@/lib/initialAnalysisPreview';
import { homePreview } from '@/lib/homePreview';
import { getMenuPreview, type MenuBodyPart } from '@/lib/aiMenuPreview';

const selectableBodyParts: MenuBodyPart[] = ['胸', '背中', '肩', '腕', '脚', '腹筋'];

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
  const { goalBody, profile } = useOnboarding();
  const { latestGeneratedMenu, setDraft, setLatestGeneratedMenu, setTodayBodyPart, todayBodyPart } = useTrainingDraft();
  const generatedMenu = latestGeneratedMenu?.menu ?? null;
  const displayedExercises = generatedMenu
    ? generatedMenu.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        prescription: `${exercise.weightKg ? `${exercise.weightKg}kg・` : ''}${exercise.reps}回 × ${exercise.setCount}セット`,
        sets: Array.from({ length: exercise.setCount }, () => ({ weightKg: exercise.weightKg, reps: exercise.reps })),
      }))
    : homePreview.exercises;
  const displayedMenu = {
    menuId: generatedMenu?.menuId ?? 'preview-menu-today',
    targetArea: generatedMenu?.targetArea ?? homePreview.targetArea,
    reason: generatedMenu?.reason ?? homePreview.reason,
    recommendedMinutes: generatedMenu?.estimatedMinutes ?? homePreview.recommendedMinutes,
    conditionScore: latestGeneratedMenu?.condition ?? homePreview.conditionScore,
    conditionLabel: latestGeneratedMenu
      ? latestGeneratedMenu.condition >= 8 ? 'GOOD' : latestGeneratedMenu.condition >= 5 ? 'NORMAL' : 'LIGHT'
      : homePreview.conditionLabel,
    aiMessage: latestGeneratedMenu
      ? `今日の調子${latestGeneratedMenu.condition}/10と過去の記録をもとに、${generatedMenu?.targetArea}のメニューを作成しました。`
      : homePreview.aiMessage,
    exercises: displayedExercises,
  };

  function startTraining() {
    setDraft({
      menuId: displayedMenu.menuId,
      exercises: displayedMenu.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: exercise.sets,
      })),
    });
    router.push('/training' as Href);
  }

  function selectTodayBodyPart(bodyPart: MenuBodyPart) {
    const condition = latestGeneratedMenu?.condition ?? homePreview.conditionScore;
    const menu = getMenuPreview(condition, 0, 'split', bodyPart);
    setTodayBodyPart(bodyPart);
    setLatestGeneratedMenu({ menu, condition });
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

          {profile.trainingStyle === 'split' ? (
            <View style={styles.bodyPartCard}>
              <View style={styles.bodyPartHeading}><Text style={styles.bodyPartTitle}>今日鍛える部位</Text><Text style={styles.bodyPartHint}>部位別トレーニング</Text></View>
              <View style={styles.bodyPartRow}>{selectableBodyParts.map((bodyPart) => <Pressable key={bodyPart} onPress={() => selectTodayBodyPart(bodyPart)} style={[styles.bodyPartChip, todayBodyPart === bodyPart && styles.selectedBodyPartChip]}><Text style={[styles.bodyPartText, todayBodyPart === bodyPart && styles.selectedBodyPartText]}>{bodyPart}</Text></Pressable>)}</View>
              {!todayBodyPart ? <Text style={styles.bodyPartNote}>部位を選ぶと、今日のメニューが切り替わります。</Text> : null}
            </View>
          ) : null}

          <View style={styles.coachCard}>
            <Text style={styles.cardEyebrow}>AI COACH</Text>
            <Text style={styles.coachMessage}>{displayedMenu.aiMessage}</Text>
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
            <Text style={styles.targetArea}>{displayedMenu.targetArea}</Text>
            <Text style={styles.reason}>{displayedMenu.reason}</Text>

            <View style={styles.exerciseList}>
              {displayedMenu.exercises.map((exercise, index) => (
                <View key={exercise.name} style={[styles.exerciseRow, index === displayedMenu.exercises.length - 1 && styles.lastExercise]}>
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
              <Text style={styles.statusValue}>{displayedMenu.recommendedMinutes}<Text style={styles.statusUnit}> 分</Text></Text>
              <Text style={styles.statusHint}>準備運動を含む</Text>
            </View>
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>コンディション</Text>
              <Text style={styles.conditionValue}>{displayedMenu.conditionLabel}</Text>
              <View style={styles.conditionTrack}>
                <View style={[styles.conditionBar, { width: `${displayedMenu.conditionScore * 10}%` }]} />
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
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#F4F6F3', fontSize: 22, fontWeight: '700', letterSpacing: -1 },
  brandAccent: { color: '#FFF1B8' },
  date: { marginTop: 4, color: '#737B75', fontSize: 11, fontWeight: '700' },
  goalPill: {
    maxWidth: '48%',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 22,
    backgroundColor: '#151515',
  },
  goalLabel: { color: '#737B75', fontSize: 8, fontWeight: '700', letterSpacing: 1.2 },
  goalValue: { marginTop: 2, color: '#E8EBE8', fontSize: 11, fontWeight: '700' },
  bodyPartCard: { marginTop: 17, padding: 15, borderWidth: 1, borderColor: '#303030', borderRadius: 16, backgroundColor: '#151515' },
  bodyPartHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bodyPartTitle: { color: '#F4F6F3', fontSize: 13, fontWeight: '700' },
  bodyPartHint: { color: '#697169', fontSize: 8, fontWeight: '600' },
  bodyPartRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  bodyPartChip: { minWidth: 49, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 16, backgroundColor: '#0A0A0A' },
  selectedBodyPartChip: { borderColor: '#F6D365', backgroundColor: '#F6D365' },
  bodyPartText: { color: '#A5ADA7', fontSize: 10, fontWeight: '600' },
  selectedBodyPartText: { color: '#0A0A0A' },
  bodyPartNote: { marginTop: 9, color: '#697169', fontSize: 8 },
  coachCard: {
    marginTop: 22,
    padding: 18,
    borderLeftWidth: 3,
    borderLeftColor: '#F6D365',
    borderRadius: 14,
    backgroundColor: '#181818',
  },
  cardEyebrow: { color: '#FFF1B8', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  coachMessage: { marginTop: 9, color: '#F4F6F3', fontSize: 16, fontWeight: '600', lineHeight: 25 },
  menuCard: {
    marginTop: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 18,
    backgroundColor: '#121212',
  },
  menuHeading: { flexDirection: 'row', justifyContent: 'space-between' },
  menuHeadingCopy: { flex: 1 },
  menuTitle: { marginTop: 6, color: '#F4F6F3', fontSize: 25, fontWeight: '700' },
  menuNumberBadge: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#F6D365',
  },
  menuNumber: { color: '#0A0A0A', fontSize: 11, fontWeight: '700' },
  targetLabel: { marginTop: 22, color: '#737B75', fontSize: 10, fontWeight: '600' },
  targetArea: { marginTop: 5, color: '#FFF1B8', fontSize: 18, fontWeight: '700' },
  reason: { marginTop: 8, color: '#8E978F', fontSize: 12, lineHeight: 19 },
  exerciseList: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#303030' },
  exerciseRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#303030',
  },
  lastExercise: { borderBottomWidth: 0 },
  exerciseIndex: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#272727',
  },
  exerciseIndexText: { color: '#FFF1B8', fontSize: 9, fontWeight: '700' },
  exerciseName: { flex: 1, marginLeft: 10, color: '#E8EBE8', fontSize: 12, fontWeight: '600' },
  prescription: { color: '#7F8881', fontSize: 10, fontWeight: '700' },
  statusRow: { flexDirection: 'row', gap: 11, marginTop: 14 },
  statusCard: {
    flex: 1,
    minHeight: 118,
    padding: 15,
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 16,
    backgroundColor: '#151515',
  },
  statusLabel: { color: '#737B75', fontSize: 10, fontWeight: '600' },
  statusValue: { marginTop: 10, color: '#F4F6F3', fontSize: 25, fontWeight: '700' },
  statusUnit: { color: '#9DA69F', fontSize: 11 },
  statusHint: { marginTop: 6, color: '#697169', fontSize: 9 },
  conditionValue: { marginTop: 10, color: '#FFF1B8', fontSize: 21, fontWeight: '700' },
  conditionTrack: { height: 4, marginTop: 12, overflow: 'hidden', borderRadius: 2, backgroundColor: '#303630' },
  conditionBar: { height: '100%', borderRadius: 2, backgroundColor: '#F6D365' },
  startButton: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 19,
    borderRadius: 17,
    backgroundColor: '#F6D365',
  },
  startLabel: { color: '#514500', fontSize: 8, fontWeight: '700', letterSpacing: 1.4 },
  startText: { marginTop: 4, color: '#0A0A0A', fontSize: 16, fontWeight: '700' },
  startArrow: { color: '#0A0A0A', fontSize: 24, fontWeight: '700' },
  previewNote: { marginTop: 13, color: '#59605A', fontSize: 9, textAlign: 'center' },
});
