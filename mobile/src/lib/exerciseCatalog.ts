export const exerciseCategories = ['すべて', '胸', '背中', '肩', '腕', '脚', '腹'] as const;
export type ExerciseCategory = Exclude<(typeof exerciseCategories)[number], 'すべて'>;

export type ExerciseOption = {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: string;
};

export const exerciseCatalog: ExerciseOption[] = [
  { id: 'bench-press', name: 'ベンチプレス', category: '胸', equipment: 'バーベル' },
  { id: 'incline-dumbbell-press', name: 'インクラインダンベルプレス', category: '胸', equipment: 'ダンベル' },
  { id: 'chest-press', name: 'チェストプレス', category: '胸', equipment: 'マシン' },
  { id: 'push-up', name: '腕立て伏せ', category: '胸', equipment: '自重' },
  { id: 'lat-pulldown', name: 'ラットプルダウン', category: '背中', equipment: 'ケーブル' },
  { id: 'barbell-row', name: 'ベントオーバーロウ', category: '背中', equipment: 'バーベル' },
  { id: 'seated-row', name: 'シーテッドロウ', category: '背中', equipment: 'マシン' },
  { id: 'pull-up', name: '懸垂', category: '背中', equipment: '自重' },
  { id: 'shoulder-press', name: 'ショルダープレス', category: '肩', equipment: 'ダンベル' },
  { id: 'side-raise', name: 'サイドレイズ', category: '肩', equipment: 'ダンベル' },
  { id: 'rear-delt-fly', name: 'リアデルトフライ', category: '肩', equipment: 'マシン' },
  { id: 'barbell-curl', name: 'バーベルカール', category: '腕', equipment: 'バーベル' },
  { id: 'hammer-curl', name: 'ハンマーカール', category: '腕', equipment: 'ダンベル' },
  { id: 'cable-pushdown', name: 'ケーブルプレスダウン', category: '腕', equipment: 'ケーブル' },
  { id: 'squat', name: 'バックスクワット', category: '脚', equipment: 'バーベル' },
  { id: 'leg-press', name: 'レッグプレス', category: '脚', equipment: 'マシン' },
  { id: 'romanian-deadlift', name: 'ルーマニアンデッドリフト', category: '脚', equipment: 'バーベル' },
  { id: 'leg-curl', name: 'レッグカール', category: '脚', equipment: 'マシン' },
  { id: 'calf-raise', name: 'カーフレイズ', category: '脚', equipment: 'マシン' },
  { id: 'crunch', name: 'クランチ', category: '腹', equipment: '自重' },
  { id: 'plank', name: 'プランク', category: '腹', equipment: '自重' },
  { id: 'ab-wheel', name: 'アブローラー', category: '腹', equipment: 'アブローラー' },
];
