import { useAuth } from '@clerk/expo';
import * as Crypto from 'expo-crypto';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTrainingDraft } from '@/contexts/TrainingDraftContext';
import { ApiError, isApiBypassEnabled } from '@/lib/api';
import { fetchLatestAiMenu, generateAiMenu, toGeneratedMenuPreview } from '@/lib/aiMenus';
import { getMenuPreview, type GeneratedMenuPreview, type MenuBodyPart } from '@/lib/aiMenuPreview';

type GenerationStatus = 'condition' | 'loading' | 'result';
const selectableBodyParts: MenuBodyPart[] = ['胸', '背中', '肩', '腕', '脚', '腹筋'];

// 「8〜10回」のようなAI表示から記録画面へ入れる最初の数値だけを取り出す
function getFirstNumber(value: string) {
  return value.match(/\d+(?:\.\d+)?/)?.[0] ?? '';
}

export default function AiCoachScreen() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const { profile } = useOnboarding();
  const { setDraft, setLatestGeneratedMenu, setTodayBodyPart, todayBodyPart } = useTrainingDraft();
  const [condition, setCondition] = useState<number | null>(null);
  const [selectedBodyPart, setSelectedBodyPart] = useState<MenuBodyPart | null>(todayBodyPart);
  const [generationIndex, setGenerationIndex] = useState(0);
  const [status, setStatus] = useState<GenerationStatus>('condition');
  const [menu, setMenu] = useState<GeneratedMenuPreview | null>(null);
  const [error, setError] = useState('');
  const [isLoadingSavedMenu, setIsLoadingSavedMenu] = useState(!isApiBypassEnabled);
  const pendingMenuRequestId = useRef<string | null>(null);
  const trainingStyle = profile.trainingStyle ?? 'ai';

  // 画面を開いたとき、Neonに保存された本人の最新AIメニューを読み戻す
  useEffect(() => {
    if (isApiBypassEnabled) return;
    if (!isLoaded) return;

    if (!isSignedIn) return;

    let cancelled = false;

    async function loadLatestMenu() {
      try {
        const token = await getToken();
        if (!token) {
          throw new ApiError('ログインを確認できませんでした。', 401);
        }

        const response = await fetchLatestAiMenu(token);
        if (cancelled || !response.menu) return;

        const savedMenu = toGeneratedMenuPreview(response.menu);
        const savedCondition = response.menu.conditionScore ?? 5;
        setMenu(savedMenu);
        setCondition(savedCondition);
        setLatestGeneratedMenu({ menu: savedMenu, condition: savedCondition });
        setStatus('result');
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '保存済みメニューを取得できませんでした。');
        }
      } finally {
        if (!cancelled) setIsLoadingSavedMenu(false);
      }
    }

    void loadLatestMenu();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, setLatestGeneratedMenu]);

  function selectBodyPart(bodyPart: MenuBodyPart | null) {
    setSelectedBodyPart(bodyPart);
    setTodayBodyPart(bodyPart);
    setError('');
  }

  // 今日の調子をバックエンドへ送り、OpenAI生成とNeon保存の完了を待つ
  async function generateMenu() {
    if (pendingMenuRequestId.current) return;

    if (!condition) {
      setError('今日の調子を1〜10で選択してください。');
      return;
    }
    if (trainingStyle === 'split' && !selectedBodyPart) {
      setError('今日鍛える部位を選択してください。');
      return;
    }
    setError('');
    setStatus('loading');

    // 1回の生成操作を識別するUUIDを作り、二重実行を同期的に止める
    const requestId = Crypto.randomUUID();
    pendingMenuRequestId.current = requestId;

    try {
      if (isApiBypassEnabled) {
        const nextGeneration = generationIndex + 1;
        const generatedMenu = getMenuPreview(
          condition,
          nextGeneration,
          selectedBodyPart ? 'split' : trainingStyle,
          selectedBodyPart,
        );
        setGenerationIndex(nextGeneration);
        setMenu(generatedMenu);
        setLatestGeneratedMenu({ menu: generatedMenu, condition });
        setStatus('result');
        return;
      }

      const token = await getToken();
      if (!token) {
        throw new ApiError('ログインを確認できませんでした。もう一度ログインしてください。', 401);
      }

      const response = await generateAiMenu(
        token,
        condition,
        selectedBodyPart,
        requestId,
      );
      const generatedMenu = toGeneratedMenuPreview(response.menu);
      setMenu(generatedMenu);
      setLatestGeneratedMenu({ menu: generatedMenu, condition });
      setStatus('result');
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'AIメニューの生成に失敗しました。');
      setStatus(menu ? 'result' : 'condition');
    } finally {
      pendingMenuRequestId.current = null;
    }
  }

  function startMenu() {
    if (!menu) return;
    setDraft({
      menuId: menu.menuId,
      exercises: menu.exercises.map((exercise) => ({
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
    router.push('/training');
  }

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}><View><Text style={styles.eyebrow}>AI COACH</Text><Text style={styles.title}>今日のメニュー</Text></View><View style={styles.aiBadge}><Text style={styles.aiBadgeText}>AI</Text></View></View>

          {isLoadingSavedMenu ? <View style={styles.loadingArea}><ActivityIndicator color="#F6D365" size="large" /><Text style={styles.loadingTitle}>保存済みメニューを確認中</Text></View> : null}

          {!isLoadingSavedMenu && status === 'condition' ? (
            <>
              <Text style={styles.lead}>今日の身体の状態を教えてください。目標や過去の記録と合わせてメニューを調整します。</Text>
              <View style={styles.bodyPartCard}>
                <View style={styles.cardHeading}>
                  <View>
                    <Text style={styles.cardTitle}>今日鍛える部位</Text>
                    <Text style={styles.bodyPartHint}>{trainingStyle === 'split' ? '部位別設定では選択必須です' : '指定しない場合はAIが提案します'}</Text>
                  </View>
                  <Text style={styles.selectedPartLabel}>{selectedBodyPart ?? 'AIおまかせ'}</Text>
                </View>
                <View accessibilityRole="radiogroup" style={styles.bodyPartRow}>
                  <Pressable accessibilityRole="radio" accessibilityState={{ checked: selectedBodyPart === null }} onPress={() => selectBodyPart(null)} style={[styles.bodyPartButton, selectedBodyPart === null && styles.selectedBodyPartButton]}><Text style={[styles.bodyPartText, selectedBodyPart === null && styles.selectedBodyPartText]}>AIおまかせ</Text></Pressable>
                  {selectableBodyParts.map((bodyPart) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: selectedBodyPart === bodyPart }} key={bodyPart} onPress={() => selectBodyPart(bodyPart)} style={[styles.bodyPartButton, selectedBodyPart === bodyPart && styles.selectedBodyPartButton]}><Text style={[styles.bodyPartText, selectedBodyPart === bodyPart && styles.selectedBodyPartText]}>{bodyPart}</Text></Pressable>)}
                </View>
              </View>
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

          {!isLoadingSavedMenu && status === 'loading' ? <View style={styles.loadingArea}><ActivityIndicator color="#F6D365" size="large" /><Text style={styles.loadingTitle}>メニューを考えています</Text><Text style={styles.loadingText}>疲労・履歴・目標体型を確認中…</Text></View> : null}

          {!isLoadingSavedMenu && status === 'result' && menu ? (
            <>
              <View style={styles.targetCard}><Text style={styles.cardEyebrow}>RECOMMENDED AREA</Text><Text style={styles.targetArea}>{menu.targetArea}</Text><Text style={styles.reason}>{menu.reason}</Text></View>
              <View style={styles.timeRow}><Text style={styles.timeLabel}>推定トレーニング時間</Text><Text style={styles.timeValue}>{menu.estimatedMinutes}<Text style={styles.timeUnit}> 分</Text></Text></View>
              <Text style={styles.sectionTitle}>トレーニング種目</Text>
              {menu.exercises.map((exercise, index) => <View key={`${exercise.exerciseId}-${index}`} style={styles.exerciseCard}><View style={styles.exerciseNumber}><Text style={styles.exerciseNumberText}>{String(index + 1).padStart(2, '0')}</Text></View><View style={styles.exerciseCopy}><View style={styles.exerciseNameRow}><Text style={styles.exerciseName}>{exercise.name}</Text>{exercise.source ? <View style={exercise.source === 'frequent' ? styles.frequentBadge : styles.recommendedBadge}><Text style={styles.sourceText}>{exercise.source === 'frequent' ? 'よく行う' : 'AI推奨'}</Text></View> : null}</View><Text style={styles.equipment}>{exercise.equipment}</Text></View><View style={styles.prescription}><Text style={styles.prescriptionMain}>{exercise.weightKg ? `${exercise.weightKg}kg` : '自重'}</Text><Text style={styles.prescriptionSub}>{exercise.reps} × {exercise.setCount}セット</Text></View></View>)}
              <View style={styles.adviceCard}><Text style={styles.adviceTitle}>AIからの注意点</Text><Text style={styles.adviceText}>{menu.advice}</Text></View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable onPress={startMenu} style={styles.primaryButton}><Text style={styles.primaryText}>このメニューで開始</Text><Text style={styles.primaryArrow}>›</Text></Pressable>
              <Pressable onPress={generateMenu} style={styles.secondaryButton}><Text style={styles.secondaryText}>メニューを再生成</Text></Pressable>
              <Pressable onPress={() => setStatus('condition')} style={styles.textButton}><Text style={styles.textButtonText}>部位・今日の調子を変更</Text></Pressable>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' }, safeArea: { flex: 1 }, content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 17, paddingBottom: 28 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { color: '#FFF1B8', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 }, title: { marginTop: 5, color: '#F4F6F3', fontSize: 27, fontWeight: '700' }, aiBadge: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#F6D365' }, aiBadgeText: { color: '#0A0A0A', fontSize: 12, fontWeight: '700' }, lead: { marginTop: 19, color: '#8E978F', fontSize: 12, lineHeight: 19 },
  bodyPartCard: { marginTop: 17, padding: 17, borderWidth: 1, borderColor: '#303030', borderRadius: 18, backgroundColor: '#151515' }, bodyPartHint: { marginTop: 5, color: '#737B75', fontSize: 9 }, selectedPartLabel: { color: '#FFF1B8', fontSize: 11, fontWeight: '700' }, bodyPartRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 }, bodyPartButton: { minWidth: 57, alignItems: 'center', paddingHorizontal: 11, paddingVertical: 10, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 18, backgroundColor: '#0A0A0A' }, selectedBodyPartButton: { borderColor: '#F6D365', backgroundColor: '#F6D365' }, bodyPartText: { color: '#A5ADA7', fontSize: 10, fontWeight: '700' }, selectedBodyPartText: { color: '#0A0A0A' },
  conditionCard: { marginTop: 17, padding: 17, borderWidth: 1, borderColor: '#303030', borderRadius: 18, backgroundColor: '#151515' }, cardHeading: { flexDirection: 'row', justifyContent: 'space-between' }, cardTitle: { color: '#F4F6F3', fontSize: 16, fontWeight: '700' }, conditionValue: { color: '#FFF1B8', fontSize: 14, fontWeight: '700' }, ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 17 }, ratingButton: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 10, backgroundColor: '#0A0A0A' }, selectedRating: { borderColor: '#F6D365', backgroundColor: '#F6D365' }, ratingText: { color: '#8E978F', fontSize: 11, fontWeight: '700' }, selectedRatingText: { color: '#0A0A0A' }, ratingGuide: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }, guideText: { color: '#59605A', fontSize: 8 },
  referenceCard: { marginTop: 13, padding: 15, borderRadius: 16, backgroundColor: '#121212' }, referenceTitle: { color: '#A5ADA7', fontSize: 10, fontWeight: '700' }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }, infoChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, backgroundColor: '#292929' }, infoChipText: { color: '#8E978F', fontSize: 8, fontWeight: '600' }, error: { marginTop: 12, color: '#FF7676', fontSize: 11 },
  primaryButton: { minHeight: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingHorizontal: 17, borderRadius: 15, backgroundColor: '#F6D365' }, primaryText: { color: '#0A0A0A', fontSize: 14, fontWeight: '700' }, primaryArrow: { color: '#0A0A0A', fontSize: 27 }, loadingArea: { flex: 1, minHeight: 500, alignItems: 'center', justifyContent: 'center' }, loadingTitle: { marginTop: 21, color: '#F4F6F3', fontSize: 22, fontWeight: '700', textAlign: 'center' }, loadingText: { marginTop: 9, color: '#737B75', fontSize: 11 },
  targetCard: { marginTop: 19, padding: 17, borderLeftWidth: 3, borderLeftColor: '#F6D365', borderRadius: 16, backgroundColor: '#181818' }, cardEyebrow: { color: '#FFF1B8', fontSize: 8, fontWeight: '700', letterSpacing: 1.3 }, targetArea: { marginTop: 7, color: '#F4F6F3', fontSize: 22, fontWeight: '700' }, reason: { marginTop: 9, color: '#9DA69F', fontSize: 11, lineHeight: 18 }, timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13, padding: 15, borderWidth: 1, borderColor: '#303030', borderRadius: 15, backgroundColor: '#151515' }, timeLabel: { color: '#8E978F', fontSize: 10, fontWeight: '600' }, timeValue: { color: '#F4F6F3', fontSize: 22, fontWeight: '700' }, timeUnit: { color: '#737B75', fontSize: 9 }, sectionTitle: { marginTop: 21, marginBottom: 10, color: '#F4F6F3', fontSize: 15, fontWeight: '700' },
  exerciseCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 12, borderWidth: 1, borderColor: '#303030', borderRadius: 15, backgroundColor: '#151515' }, exerciseNumber: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#292929' }, exerciseNumberText: { color: '#FFF1B8', fontSize: 8, fontWeight: '700' }, exerciseCopy: { flex: 1, marginLeft: 10 }, exerciseName: { color: '#E8EBE8', fontSize: 11, fontWeight: '700' }, equipment: { marginTop: 4, color: '#697169', fontSize: 8 }, prescription: { alignItems: 'flex-end' }, prescriptionMain: { color: '#F4F6F3', fontSize: 12, fontWeight: '700' }, prescriptionSub: { marginTop: 4, color: '#8E978F', fontSize: 8 }, adviceCard: { marginTop: 7, padding: 15, borderRadius: 15, backgroundColor: '#222222' }, adviceTitle: { color: '#FFF1B8', fontSize: 10, fontWeight: '700' }, adviceText: { marginTop: 7, color: '#A5ADA7', fontSize: 10, lineHeight: 17 }, secondaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderWidth: 1, borderColor: '#F6D365', borderRadius: 14 }, secondaryText: { color: '#FFF1B8', fontSize: 12, fontWeight: '700' }, textButton: { alignItems: 'center', paddingVertical: 15 }, textButtonText: { color: '#8E978F', fontSize: 10, fontWeight: '600' },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, frequentBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, backgroundColor: '#332B00' }, recommendedBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, backgroundColor: '#292929' }, sourceText: { color: '#FFF1B8', fontSize: 6, fontWeight: '700' },
});
