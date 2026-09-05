import { useAuth } from '@clerk/expo';
import { type Href, Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';
import { ScreenStateCard } from '@/components/ScreenStateCard';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTrainingDraft } from '@/contexts/TrainingDraftContext';
import { ApiError, isApiBypassEnabled } from '@/lib/api';
import { getMenuPreview, type GeneratedMenuPreview, type MenuBodyPart } from '@/lib/aiMenuPreview';
import { toGeneratedMenuPreview } from '@/lib/aiMenus';
import { fetchHome, type HomeResponse } from '@/lib/homeApi';
import { homePreview } from '@/lib/homePreview';
import { getGoalBodyLabel } from '@/lib/initialAnalysisPreview';

const selectableBodyParts: MenuBodyPart[] = ['胸', '背中', '肩', '腕', '脚', '腹筋'];

function formatToday() {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'long', day: 'numeric', weekday: 'short',
  }).format(new Date());
}

function getConditionLabel(score: number | null, label: string | null) {
  if (label) return label;
  if (score === null) return '未記録';
  if (score >= 8) return 'GOOD';
  if (score >= 5) return 'NORMAL';
  return 'LIGHT';
}

function getFirstNumber(value: string) {
  return value.match(/\d+(?:\.\d+)?/)?.[0] ?? '';
}

function createDevelopmentHomeResponse(): HomeResponse {
  return {
    goalBodyType: homePreview.goalBodyType,
    menu: {
      id: 'preview-menu-today',
      recommendedBodyPart: homePreview.targetArea,
      reason: homePreview.reason,
      estimatedMinutes: homePreview.recommendedMinutes,
      advice: [homePreview.aiMessage],
      conditionScore: homePreview.conditionScore,
      requestNote: null,
      createdAt: new Date().toISOString(),
      exercises: homePreview.exercises.map((exercise) => ({
        exerciseName: exercise.name,
        bodyPart: homePreview.targetArea,
        bodyArea: null,
        targetWeightKg: exercise.sets[0]?.weightKg ? Number(exercise.sets[0].weightKg) : null,
        targetReps: exercise.sets[0]?.reps ?? '',
        sets: exercise.sets.length,
        restSeconds: 60,
        note: '',
      })),
    },
    condition: { score: homePreview.conditionScore, label: homePreview.conditionLabel },
    aiMessage: homePreview.aiMessage,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const { goalBody, profile } = useOnboarding();
  const { setDraft, setLatestGeneratedMenu, setTodayBodyPart, todayBodyPart } = useTrainingDraft();
  // Clerkの最新のトークン取得関数を、再描画しない入れ物へ保存する
  const getTokenRef = useRef(getToken);
  // 同じホーム表示中の自動取得を1回に制限する
  const hasAutomaticallyLoadedRef = useRef(false);
  // ホームAPIの通信中に二重呼び出しされるのを防ぐ
  const isLoadingHomeRef = useRef(false);
  const [homeData, setHomeData] = useState<HomeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Clerk側でgetTokenが更新されたらrefの中身だけを最新にする
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const loadHome = useCallback(async () => {
    if (!isLoaded || !isSignedIn || isLoadingHomeRef.current) return;
    isLoadingHomeRef.current = true;
    setIsLoading(true);
    setError('');

    try {
      let response: HomeResponse;
      if (isApiBypassEnabled) {
        response = createDevelopmentHomeResponse();
      } else {
        const token = await getTokenRef.current();
        if (!token) throw new ApiError('ログインを確認できませんでした。', 401);
        response = await fetchHome(token);
      }

      setHomeData(response);
      if (response.menu) {
        const menu = toGeneratedMenuPreview(response.menu);
        setLatestGeneratedMenu({ menu, condition: response.condition?.score ?? response.menu.conditionScore ?? 5 });
      } else {
        setLatestGeneratedMenu(null);
      }
    } catch (loadError) {
      setHomeData(null);
      setError(loadError instanceof Error ? loadError.message : 'ホーム情報を読み込めませんでした。');
    } finally {
      isLoadingHomeRef.current = false;
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn, setLatestGeneratedMenu]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      hasAutomaticallyLoadedRef.current = false;
      return;
    }

    if (hasAutomaticallyLoadedRef.current) return;
    hasAutomaticallyLoadedRef.current = true;
    void loadHome();
  }, [isLoaded, isSignedIn, loadHome]);

  const displayedMenu: GeneratedMenuPreview | null = homeData?.menu ? toGeneratedMenuPreview(homeData.menu) : null;
  const conditionScore = homeData?.condition?.score ?? homeData?.menu?.conditionScore ?? null;
  const goalLabel = homeData
    ? homeData.goalBodyType ?? '未設定'
    : getGoalBodyLabel(goalBody);

  function startTraining() {
    if (!displayedMenu) return;
    setDraft({
      menuId: displayedMenu.menuId,
      exercises: displayedMenu.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.name,
        category: exercise.category,
        equipment: exercise.equipment,
        sets: Array.from({ length: exercise.setCount }, () => ({
          weightKg: exercise.weightKg,
          reps: getFirstNumber(exercise.reps),
        })),
      })),
    });
    router.push('/training' as Href);
  }

  function selectTodayBodyPart(bodyPart: MenuBodyPart) {
    setTodayBodyPart(bodyPart);
    if (isApiBypassEnabled) {
      const score = conditionScore ?? homePreview.conditionScore;
      setLatestGeneratedMenu({ menu: getMenuPreview(score, 0, 'split', bodyPart), condition: score });
    }
    router.push('/ai-coach' as Href);
  }

  if (isLoaded && !isSignedIn) return <Redirect href="/sign-in" />;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View><Text style={styles.brand}>筋トレ<Text style={styles.brandAccent}>PAS</Text></Text><Text style={styles.date}>{formatToday()}</Text></View>
            <View style={styles.goalPill}><Text style={styles.goalLabel}>GOAL</Text><Text numberOfLines={1} style={styles.goalValue}>{goalLabel}</Text></View>
          </View>

          {isLoading ? (
            <ScreenStateCard message="今日のメニューを確認しています。" title="ホーム情報を読み込み中" type="loading" />
          ) : null}

          {!isLoading && error ? (
            <ScreenStateCard actionLabel="もう一度試す" message={error} onAction={() => void loadHome()} title="読み込めませんでした" type="error" />
          ) : null}

          {!isLoading && !error && homeData?.goalBodyType === null ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>目標体型が未設定です</Text><Text style={styles.noticeText}>目標を設定すると、AIがメニューを調整しやすくなります。</Text>
              <Pressable onPress={() => router.push('/ideal-body' as Href)} style={styles.outlineButton}><Text style={styles.outlineButtonText}>目標体型を設定する</Text></Pressable>
            </View>
          ) : null}

          {!isLoading && !error && profile.trainingStyle === 'split' ? (
            <View style={styles.bodyPartCard}>
              <View style={styles.bodyPartHeading}><Text style={styles.bodyPartTitle}>今日鍛える部位</Text><Text style={styles.bodyPartHint}>部位別トレーニング</Text></View>
              <View style={styles.bodyPartRow}>{selectableBodyParts.map((bodyPart) => <Pressable key={bodyPart} onPress={() => selectTodayBodyPart(bodyPart)} style={[styles.bodyPartChip, todayBodyPart === bodyPart && styles.selectedBodyPartChip]}><Text style={[styles.bodyPartText, todayBodyPart === bodyPart && styles.selectedBodyPartText]}>{bodyPart}</Text></Pressable>)}</View>
              <Text style={styles.bodyPartNote}>部位を選ぶとAIメニュー生成画面へ進みます。</Text>
            </View>
          ) : null}

          {!isLoading && !error && homeData && !displayedMenu ? (
            <ScreenStateCard actionLabel="AIメニューを作成する" message="今日の調子と鍛えたい部位を入力して、メニューを作成しましょう。" onAction={() => router.push('/ai-coach' as Href)} title="AIメニューはまだありません" type="empty" />
          ) : null}

          {!isLoading && !error && displayedMenu ? (
            <>
              <View style={styles.coachCard}><Text style={styles.cardEyebrow}>AI COACH</Text><Text style={styles.coachMessage}>{homeData?.aiMessage ?? displayedMenu.advice}</Text></View>
              <View style={styles.menuCard}>
                <View style={styles.menuHeading}><View style={styles.menuHeadingCopy}><Text style={styles.cardEyebrow}>TODAY&apos;S TRAINING</Text><Text style={styles.menuTitle}>今日のAIメニュー</Text></View><View style={styles.menuNumberBadge}><Text style={styles.menuNumber}>01</Text></View></View>
                <Text style={styles.targetLabel}>おすすめ部位</Text><Text style={styles.targetArea}>{displayedMenu.targetArea}</Text><Text style={styles.reason}>{displayedMenu.reason}</Text>
                <View style={styles.exerciseList}>
                  {displayedMenu.exercises.map((exercise, index) => (
                    <View key={`${exercise.exerciseId}-${index}`} style={[styles.exerciseRow, index === displayedMenu.exercises.length - 1 && styles.lastExercise]}>
                      <View style={styles.exerciseIndex}><Text style={styles.exerciseIndexText}>{String(index + 1).padStart(2, '0')}</Text></View><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.prescription}>{exercise.weightKg ? `${exercise.weightKg}kg・` : ''}{exercise.reps} × {exercise.setCount}セット</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.statusRow}>
                <View style={styles.statusCard}><Text style={styles.statusLabel}>推奨時間</Text><Text style={styles.statusValue}>{displayedMenu.estimatedMinutes}<Text style={styles.statusUnit}> 分</Text></Text><Text style={styles.statusHint}>準備運動を含む</Text></View>
                <View style={styles.statusCard}><Text style={styles.statusLabel}>コンディション</Text><Text style={styles.conditionValue}>{getConditionLabel(conditionScore, homeData?.condition?.label ?? null)}</Text><View style={styles.conditionTrack}><View style={[styles.conditionBar, { width: `${Math.max(0, Math.min(10, conditionScore ?? 0)) * 10}%` }]} /></View></View>
              </View>
              <Pressable onPress={startTraining} style={styles.startButton}><View><Text style={styles.startLabel}>START NOW</Text><Text style={styles.startText}>トレーニングを開始</Text></View><Text style={styles.startArrow}>→</Text></Pressable>
            </>
          ) : null}

          {isApiBypassEnabled && !isLoading && !error ? <Text style={styles.previewNote}>開発用プレビューデータを表示しています。</Text> : null}
        </ScrollView>
      </SafeAreaView>
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' }, safeArea: { flex: 1 }, content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { color: '#F4F6F3', fontSize: 22, fontWeight: '700', letterSpacing: -1 }, brandAccent: { color: '#73E7FF' }, date: { marginTop: 4, color: '#72828D', fontSize: 11, fontWeight: '700' },
  goalPill: { maxWidth: '48%', paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: '#203441', borderRadius: 22, backgroundColor: '#0C151D' }, goalLabel: { color: '#72828D', fontSize: 8, fontWeight: '700', letterSpacing: 1.2 }, goalValue: { marginTop: 2, color: '#E8EBE8', fontSize: 11, fontWeight: '700' },
  noticeCard: { marginTop: 17, padding: 16, borderWidth: 1, borderColor: '#1A5365', borderRadius: 16, backgroundColor: '#0A141B' }, noticeTitle: { color: '#73E7FF', fontSize: 14, fontWeight: '700' }, noticeText: { marginTop: 6, color: '#99AAB4', fontSize: 10, lineHeight: 16 }, outlineButton: { alignItems: 'center', marginTop: 13, padding: 12, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 12 }, outlineButtonText: { color: '#73E7FF', fontSize: 11, fontWeight: '700' },
  bodyPartCard: { marginTop: 17, padding: 15, borderWidth: 1, borderColor: '#203441', borderRadius: 16, backgroundColor: '#0C151D' }, bodyPartHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, bodyPartTitle: { color: '#F4F6F3', fontSize: 13, fontWeight: '700' }, bodyPartHint: { color: '#657681', fontSize: 8, fontWeight: '600' }, bodyPartRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }, bodyPartChip: { minWidth: 49, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderColor: '#294653', borderRadius: 16, backgroundColor: '#050A0F' }, selectedBodyPartChip: { borderColor: '#00D4FF', backgroundColor: '#00D4FF' }, bodyPartText: { color: '#AAB7BF', fontSize: 10, fontWeight: '600' }, selectedBodyPartText: { color: '#050A0F' }, bodyPartNote: { marginTop: 9, color: '#657681', fontSize: 8 },
  coachCard: { marginTop: 22, padding: 18, borderLeftWidth: 3, borderLeftColor: '#00D4FF', borderRadius: 14, backgroundColor: '#0B141C' }, cardEyebrow: { color: '#73E7FF', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 }, coachMessage: { marginTop: 9, color: '#F4F6F3', fontSize: 16, fontWeight: '600', lineHeight: 25 },
  menuCard: { marginTop: 14, padding: 18, borderWidth: 1, borderColor: '#203441', borderRadius: 18, backgroundColor: '#091118' }, menuHeading: { flexDirection: 'row', justifyContent: 'space-between' }, menuHeadingCopy: { flex: 1 }, menuTitle: { marginTop: 6, color: '#F4F6F3', fontSize: 25, fontWeight: '700' }, menuNumberBadge: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#00D4FF' }, menuNumber: { color: '#050A0F', fontSize: 11, fontWeight: '700' }, targetLabel: { marginTop: 22, color: '#72828D', fontSize: 10, fontWeight: '600' }, targetArea: { marginTop: 5, color: '#73E7FF', fontSize: 18, fontWeight: '700' }, reason: { marginTop: 8, color: '#8798A3', fontSize: 12, lineHeight: 19 },
  exerciseList: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#203441' }, exerciseRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#203441' }, lastExercise: { borderBottomWidth: 0 }, exerciseIndex: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#12202A' }, exerciseIndexText: { color: '#73E7FF', fontSize: 9, fontWeight: '700' }, exerciseName: { flex: 1, marginLeft: 10, color: '#E8EBE8', fontSize: 12, fontWeight: '600' }, prescription: { maxWidth: '43%', color: '#7B8D98', fontSize: 9, fontWeight: '700', textAlign: 'right' },
  statusRow: { flexDirection: 'row', gap: 11, marginTop: 14 }, statusCard: { flex: 1, minHeight: 118, padding: 15, borderWidth: 1, borderColor: '#203441', borderRadius: 16, backgroundColor: '#0C151D' }, statusLabel: { color: '#72828D', fontSize: 10, fontWeight: '600' }, statusValue: { marginTop: 10, color: '#F4F6F3', fontSize: 25, fontWeight: '700' }, statusUnit: { color: '#99AAB4', fontSize: 11 }, statusHint: { marginTop: 6, color: '#657681', fontSize: 9 }, conditionValue: { marginTop: 10, color: '#73E7FF', fontSize: 21, fontWeight: '700' }, conditionTrack: { height: 4, marginTop: 12, overflow: 'hidden', borderRadius: 2, backgroundColor: '#203844' }, conditionBar: { height: '100%', borderRadius: 2, backgroundColor: '#00D4FF' },
  startButton: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 19, borderRadius: 17, backgroundColor: '#00D4FF' }, startLabel: { color: '#06455C', fontSize: 8, fontWeight: '700', letterSpacing: 1.4 }, startText: { marginTop: 4, color: '#050A0F', fontSize: 16, fontWeight: '700' }, startArrow: { color: '#050A0F', fontSize: 24, fontWeight: '700' }, previewNote: { marginTop: 13, color: '#556772', fontSize: 9, textAlign: 'center' },
});
