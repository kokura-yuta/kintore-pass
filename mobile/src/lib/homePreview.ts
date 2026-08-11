export type HomePreview = {
  targetArea: string;
  recommendedMinutes: number;
  conditionLabel: string;
  conditionScore: number;
  aiMessage: string;
  reason: string;
  exercises: { name: string; prescription: string }[];
};

export const homePreview: HomePreview = {
  targetArea: '胸・肩・上腕三頭筋',
  recommendedMinutes: 60,
  conditionLabel: 'GOOD',
  conditionScore: 8,
  aiMessage: '今日は上半身のプッシュ種目がおすすめ。最初のセットで調子を確認しましょう。',
  reason: '前回の脚トレーニングからの疲労を考慮し、今日は上半身を中心に組んでいます。',
  exercises: [
    { name: 'ベンチプレス', prescription: '8回 × 3セット' },
    { name: 'インクラインダンベルプレス', prescription: '10回 × 3セット' },
    { name: 'サイドレイズ', prescription: '12回 × 3セット' },
  ],
};
