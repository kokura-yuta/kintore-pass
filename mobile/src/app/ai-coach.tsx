import { useAuth } from '@clerk/expo';
import * as Crypto from 'expo-crypto';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';
import { ScreenStateCard } from '@/components/ScreenStateCard';
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
  const [savedMenuError, setSavedMenuError] = useState('');
  const [savedMenuReloadKey, setSavedMenuReloadKey] = useState(0);
  // Clerkの最新のトークン取得関数を、再描画しない入れ物へ保存する
  const getTokenRef = useRef(getToken);
  // 保存済みAIメニューの自動取得を1回に制限する
  const hasLoadedSavedMenuRef = useRef(false);
  const pendingMenuRequestId = useRef<string | null>(null);
  const trainingStyle = profile.trainingStyle ?? 'ai';

  // Clerk側でgetTokenが更新されたらrefの中身だけを最新にする
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // 画面を開いたとき、Neonに保存された本人の最新AIメニューを読み戻す
  useEffect(() => {
    if (isApiBypassEnabled) return;
    if (!isLoaded) return;

    if (!isSignedIn) return;
    if (hasLoadedSavedMenuRef.current) return;
    hasLoadedSavedMenuRef.current = true;

    let cancelled = false;

    async function loadLatestMenu() {
      setSavedMenuError('');
      try {
        const token = await getTokenRef.current();
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
          setSavedMenuError(loadError instanceof Error ? loadError.message : '保存済みメニューを取得できませんでした。');
        }
      } finally {
        if (!cancelled) setIsLoadingSavedMenu(false);
      }
    }

    void loadLatestMenu();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, savedMenuReloadKey, setLatestGeneratedMenu]);

  function retrySavedMenu() {
    // 利用者が再読み込みを押したときだけ、もう1回の取得を許可する
    hasLoadedSavedMenuRef.current = false;
    setIsLoadingSavedMenu(true);
    setSavedMenuError('');
    setSavedMenuReloadKey((current) => current + 1);
  }

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
    setSavedMenuError('');
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

          {isLoadingSavedMenu ? (
            <ScreenStateCard message="前回生成したメニューを確認しています。" title="保存済みメニューを確認中" type="loading" />
          ) : null}

          {!isLoadingSavedMenu && savedMenuError ? (
            <ScreenStateCard
              actionLabel="もう一度読み込む"
              compact
              message={savedMenuError}
              onAction={retrySavedMenu}
              title="保存済みメニューを読み込めませんでした"
              type="error"
            />
          ) : null}

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

          {!isLoadingSavedMenu && status === 'loading' ? (
            <ScreenStateCard message="疲労・履歴・目標体型を確認しています。" title="メニューを考えています" type="loading" />
          ) : null}

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
  screen: { flex: 1, backgroundColor: '#050A0F' }, safeArea: { flex: 1 }, content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 17, paddingBottom: 28 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { color: '#73E7FF', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 }, title: { marginTop: 5, color: '#F4F6F3', fontSize: 27, fontWeight: '700' }, aiBadge: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#00D4FF' }, aiBadgeText: { color: '#050A0F', fontSize: 12, fontWeight: '700' }, lead: { marginTop: 19, color: '#8798A3', fontSize: 12, lineHeight: 19 },
  bodyPartCard: { marginTop: 17, padding: 17, borderWidth: 1, borderColor: '#203441', borderRadius: 18, backgroundColor: '#0C151D' }, bodyPartHint: { marginTop: 5, color: '#72828D', fontSize: 9 }, selectedPartLabel: { color: '#73E7FF', fontSize: 11, fontWeight: '700' }, bodyPartRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 }, bodyPartButton: { minWidth: 57, alignItems: 'center', paddingHorizontal: 11, paddingVertical: 10, borderWidth: 1, borderColor: '#294653', borderRadius: 18, backgroundColor: '#050A0F' }, selectedBodyPartButton: { borderColor: '#00D4FF', backgroundColor: '#00D4FF' }, bodyPartText: { color: '#AAB7BF', fontSize: 10, fontWeight: '700' }, selectedBodyPartText: { color: '#050A0F' },
  conditionCard: { marginTop: 17, padding: 17, borderWidth: 1, borderColor: '#203441', borderRadius: 18, backgroundColor: '#0C151D' }, cardHeading: { flexDirection: 'row', justifyContent: 'space-between' }, cardTitle: { color: '#F4F6F3', fontSize: 16, fontWeight: '700' }, conditionValue: { color: '#73E7FF', fontSize: 14, fontWeight: '700' }, ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 17 }, ratingButton: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#294653', borderRadius: 10, backgroundColor: '#050A0F' }, selectedRating: { borderColor: '#00D4FF', backgroundColor: '#00D4FF' }, ratingText: { color: '#8798A3', fontSize: 11, fontWeight: '700' }, selectedRatingText: { color: '#050A0F' }, ratingGuide: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }, guideText: { color: '#556772', fontSize: 8 },
  referenceCard: { marginTop: 13, padding: 15, borderRadius: 16, backgroundColor: '#091118' }, referenceTitle: { color: '#AAB7BF', fontSize: 10, fontWeight: '700' }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }, infoChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, backgroundColor: '#13222D' }, infoChipText: { color: '#8798A3', fontSize: 8, fontWeight: '600' }, error: { marginTop: 12, color: '#FF7676', fontSize: 11 },
  primaryButton: { minHeight: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingHorizontal: 17, borderRadius: 15, backgroundColor: '#00D4FF' }, primaryText: { color: '#050A0F', fontSize: 14, fontWeight: '700' }, primaryArrow: { color: '#050A0F', fontSize: 27 },
  targetCard: { marginTop: 19, padding: 17, borderLeftWidth: 3, borderLeftColor: '#00D4FF', borderRadius: 16, backgroundColor: '#0B141C' }, cardEyebrow: { color: '#73E7FF', fontSize: 8, fontWeight: '700', letterSpacing: 1.3 }, targetArea: { marginTop: 7, color: '#F4F6F3', fontSize: 22, fontWeight: '700' }, reason: { marginTop: 9, color: '#99AAB4', fontSize: 11, lineHeight: 18 }, timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13, padding: 15, borderWidth: 1, borderColor: '#203441', borderRadius: 15, backgroundColor: '#0C151D' }, timeLabel: { color: '#8798A3', fontSize: 10, fontWeight: '600' }, timeValue: { color: '#F4F6F3', fontSize: 22, fontWeight: '700' }, timeUnit: { color: '#72828D', fontSize: 9 }, sectionTitle: { marginTop: 21, marginBottom: 10, color: '#F4F6F3', fontSize: 15, fontWeight: '700' },
  exerciseCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 12, borderWidth: 1, borderColor: '#203441', borderRadius: 15, backgroundColor: '#0C151D' }, exerciseNumber: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#13222D' }, exerciseNumberText: { color: '#73E7FF', fontSize: 8, fontWeight: '700' }, exerciseCopy: { flex: 1, marginLeft: 10 }, exerciseName: { color: '#E8EBE8', fontSize: 11, fontWeight: '700' }, equipment: { marginTop: 4, color: '#657681', fontSize: 8 }, prescription: { alignItems: 'flex-end' }, prescriptionMain: { color: '#F4F6F3', fontSize: 12, fontWeight: '700' }, prescriptionSub: { marginTop: 4, color: '#8798A3', fontSize: 8 }, adviceCard: { marginTop: 7, padding: 15, borderRadius: 15, backgroundColor: '#101C25' }, adviceTitle: { color: '#73E7FF', fontSize: 10, fontWeight: '700' }, adviceText: { marginTop: 7, color: '#AAB7BF', fontSize: 10, lineHeight: 17 }, secondaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 14 }, secondaryText: { color: '#73E7FF', fontSize: 12, fontWeight: '700' }, textButton: { alignItems: 'center', paddingVertical: 15 }, textButtonText: { color: '#8798A3', fontSize: 10, fontWeight: '600' },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, frequentBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, backgroundColor: '#052C3A' }, recommendedBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, backgroundColor: '#13222D' }, sourceText: { color: '#73E7FF', fontSize: 6, fontWeight: '700' },
});
