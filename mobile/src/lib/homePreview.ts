export type HomePreview = {
  goalBodyType: string;
  targetArea: string;
  recommendedMinutes: number;
  conditionLabel: string;
  conditionScore: number;
  aiMessage: string;
  reason: string;
  exercises: {
    exerciseId: string;
    name: string;
    prescription: string;
    sets: { weightKg: string; reps: string }[];
  }[];
};

export const homePreview: HomePreview = {
  goalBodyType: '細マッチョ',
  targetArea: '胸・肩・上腕三頭筋',
  recommendedMinutes: 60,
  conditionLabel: 'GOOD',
  conditionScore: 8,
  aiMessage: '今日は上半身のプッシュ種目がおすすめ。最初のセットで調子を確認しましょう。',
  reason: '前回の脚トレーニングからの疲労を考慮し、今日は上半身を中心に組んでいます。',
  exercises: [
    { exerciseId: 'bench-press', name: 'ベンチプレス', prescription: '60kg・8回 × 3セット', sets: Array.from({ length: 3 }, () => ({ weightKg: '60', reps: '8' })) },
    { exerciseId: 'incline-dumbbell-press', name: 'インクラインダンベルプレス', prescription: '20kg・10回 × 3セット', sets: Array.from({ length: 3 }, () => ({ weightKg: '20', reps: '10' })) },
    { exerciseId: 'side-raise', name: 'サイドレイズ', prescription: '8kg・12回 × 3セット', sets: Array.from({ length: 3 }, () => ({ weightKg: '8', reps: '12' })) },
  ],
};
