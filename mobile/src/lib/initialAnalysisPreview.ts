import type { GoalBodySelection, ProfileDraft } from '@/contexts/OnboardingContext';

const bodyTypeLabels = {
  'lean-muscle': '細マッチョ',
  'v-shape': '逆三角形',
  physique: 'フィジーク',
  'bulk-up': 'バルクアップ',
} as const;

export function getGoalBodyLabel(goalBody: GoalBodySelection | null) {
  if (!goalBody) return '未選択';
  return goalBody.kind === 'preset' ? bodyTypeLabels[goalBody.bodyTypeId] : '参考画像';
}

export function createInitialAnalysisPreview(
  profile: ProfileDraft,
  goalBody: GoalBodySelection | null,
) {
  const heightM = Number(profile.heightCm) / 100;
  const bmi = heightM > 0 ? Number((Number(profile.weightKg) / heightM ** 2).toFixed(1)) : null;
  const goalLabel = getGoalBodyLabel(goalBody);
  const weakParts = profile.weakBodyParts.length > 0 ? profile.weakBodyParts.join('・') : '全身';

  return {
    summary: `${goalLabel}を目標に、継続しやすさを優先した全身の基礎づくりから始めるのがおすすめです。`,
    metrics: [
      { label: '現在のBMI', value: bmi ? String(bmi) : '—', note: '身長・体重から算出した参考値' },
      {
        label: 'おすすめ頻度',
        value: profile.weeklyTrainingDays ? `週${profile.weeklyTrainingDays}回` : '週2〜3回',
        note: '疲労を見ながら調整',
      },
      {
        label: '1回の目安',
        value: profile.availableMinutes ? `${profile.availableMinutes}分` : '45〜60分',
        note: '準備運動を含む',
      },
    ],
    focus: `${weakParts}を意識しながら、フォームを崩さず動かせる重量を探しましょう。`,
    firstPlan: '最初の2週間は記録を集める期間です。重量を急いで上げず、回数・調子・所要時間を残してください。',
  };
}
