export type GeneratedMenuExercise = {
  exerciseId: string;
  name: string;
  equipment: string;
  weightKg: string;
  reps: string;
  setCount: number;
};

export type GeneratedMenuPreview = {
  menuId: string;
  targetArea: string;
  estimatedMinutes: number;
  reason: string;
  advice: string;
  exercises: GeneratedMenuExercise[];
};

const menuVariants: GeneratedMenuPreview[] = [
  {
    menuId: 'preview-push-menu',
    targetArea: '胸・肩・上腕三頭筋',
    estimatedMinutes: 60,
    reason: '前回は背中を行っており、胸は5日間空いています。最近の調子も安定しているため、今日は上半身のプッシュ種目を中心にします。',
    advice: '最初のセットは軽い重量でフォームを確認してください。肩に違和感がある場合は、ベンチの角度や重量を下げましょう。',
    exercises: [
      { exerciseId: 'bench-press', name: 'ベンチプレス', equipment: 'バーベル', weightKg: '60', reps: '8', setCount: 3 },
      { exerciseId: 'incline-dumbbell-press', name: 'インクラインダンベルプレス', equipment: 'ダンベル', weightKg: '20', reps: '10', setCount: 3 },
      { exerciseId: 'side-raise', name: 'サイドレイズ', equipment: 'ダンベル', weightKg: '8', reps: '12', setCount: 3 },
      { exerciseId: 'cable-pushdown', name: 'ケーブルプレスダウン', equipment: 'ケーブル', weightKg: '20', reps: '12', setCount: 3 },
    ],
  },
  {
    menuId: 'preview-pull-menu',
    targetArea: '背中・上腕二頭筋',
    estimatedMinutes: 55,
    reason: '背中のトレーニング頻度が最近少なく、目標体型に必要な上半身の広がりを強化するため、プル種目を優先します。',
    advice: '腕だけで引かず、肩甲骨を寄せる動きを意識してください。反動が増えたら重量を下げましょう。',
    exercises: [
      { exerciseId: 'lat-pulldown', name: 'ラットプルダウン', equipment: 'ケーブル', weightKg: '45', reps: '10', setCount: 3 },
      { exerciseId: 'seated-row', name: 'シーテッドロウ', equipment: 'マシン', weightKg: '40', reps: '10', setCount: 3 },
      { exerciseId: 'rear-delt-fly', name: 'リアデルトフライ', equipment: 'マシン', weightKg: '20', reps: '12', setCount: 3 },
      { exerciseId: 'hammer-curl', name: 'ハンマーカール', equipment: 'ダンベル', weightKg: '10', reps: '10', setCount: 3 },
    ],
  },
  {
    menuId: 'preview-light-menu',
    targetArea: '全身・軽負荷',
    estimatedMinutes: 35,
    reason: '今日の調子が低めのため、疲労を増やしすぎない全身メニューに調整しました。フォームと可動域を優先します。',
    advice: '痛みや強い疲労を感じた場合は中止してください。余裕を2〜3回残す強度で進めましょう。',
    exercises: [
      { exerciseId: 'push-up', name: '腕立て伏せ', equipment: '自重', weightKg: '', reps: '10', setCount: 2 },
      { exerciseId: 'seated-row', name: 'シーテッドロウ', equipment: 'マシン', weightKg: '30', reps: '12', setCount: 2 },
      { exerciseId: 'leg-press', name: 'レッグプレス', equipment: 'マシン', weightKg: '60', reps: '12', setCount: 2 },
      { exerciseId: 'plank', name: 'プランク', equipment: '自重', weightKg: '', reps: '30', setCount: 2 },
    ],
  },
];

export function getMenuPreview(condition: number, generation: number) {
  if (condition <= 4) return menuVariants[2];
  return menuVariants[generation % 2];
}
