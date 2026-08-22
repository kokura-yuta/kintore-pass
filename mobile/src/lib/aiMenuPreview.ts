export type GeneratedMenuExercise = {
  exerciseId: string;
  name: string;
  equipment: string;
  weightKg: string;
  reps: string;
  setCount: number;
  source?: 'frequent' | 'recommended';
};

export type MenuTrainingStyle = 'full-body' | 'split' | 'ai';
export type MenuBodyPart = '胸' | '背中' | '肩' | '腕' | '脚' | '腹筋';

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

const fullBodyMenu: GeneratedMenuPreview = {
  menuId: 'preview-full-body-menu',
  targetArea: '全身',
  estimatedMinutes: 65,
  reason: '全身トレーニング設定に合わせて、胸・背中・脚を中心に一度で主要部位を鍛えられる構成にしました。',
  advice: '種目数が多いため、各セットで限界まで追い込みすぎず、次の部位へ余力を残しましょう。',
  exercises: [
    { exerciseId: 'bench-press', name: 'ベンチプレス', equipment: 'バーベル', weightKg: '60', reps: '8', setCount: 3, source: 'frequent' },
    { exerciseId: 'lat-pulldown', name: 'ラットプルダウン', equipment: 'ケーブル', weightKg: '45', reps: '10', setCount: 3, source: 'frequent' },
    { exerciseId: 'leg-press', name: 'レッグプレス', equipment: 'マシン', weightKg: '80', reps: '10', setCount: 3, source: 'recommended' },
    { exerciseId: 'side-raise', name: 'サイドレイズ', equipment: 'ダンベル', weightKg: '8', reps: '12', setCount: 2, source: 'recommended' },
  ],
};

const splitMenus: Record<MenuBodyPart, GeneratedMenuPreview> = {
  胸: {
    menuId: 'preview-split-chest', targetArea: '胸', estimatedMinutes: 55,
    reason: '胸を選択したため、過去によく行っているベンチプレスとインクラインプレスを優先し、補助種目を加えました。',
    advice: '前回記録を基準に、フォームを保てる範囲で回数または重量を少しだけ伸ばしましょう。',
    exercises: [
      { exerciseId: 'bench-press', name: 'ベンチプレス', equipment: 'バーベル', weightKg: '60', reps: '8', setCount: 3, source: 'frequent' },
      { exerciseId: 'incline-dumbbell-press', name: 'インクラインダンベルプレス', equipment: 'ダンベル', weightKg: '20', reps: '10', setCount: 3, source: 'frequent' },
      { exerciseId: 'chest-press', name: 'チェストプレス', equipment: 'マシン', weightKg: '40', reps: '12', setCount: 3, source: 'recommended' },
    ],
  },
  背中: { ...menuVariants[1], menuId: 'preview-split-back', targetArea: '背中', exercises: menuVariants[1].exercises.map((exercise, index) => ({ ...exercise, source: index < 2 ? 'frequent' : 'recommended' })) },
  肩: {
    menuId: 'preview-split-shoulders', targetArea: '肩', estimatedMinutes: 45, reason: '肩を選択したため、よく行うサイドレイズを軸に前・横・後ろをバランスよく鍛えます。', advice: '肩関節に違和感がある場合は可動域と重量を下げてください。',
    exercises: [
      { exerciseId: 'shoulder-press', name: 'ショルダープレス', equipment: 'ダンベル', weightKg: '16', reps: '10', setCount: 3, source: 'frequent' },
      { exerciseId: 'side-raise', name: 'サイドレイズ', equipment: 'ダンベル', weightKg: '8', reps: '12', setCount: 3, source: 'frequent' },
      { exerciseId: 'rear-delt-fly', name: 'リアデルトフライ', equipment: 'マシン', weightKg: '20', reps: '12', setCount: 3, source: 'recommended' },
    ],
  },
  腕: {
    menuId: 'preview-split-arms', targetArea: '腕', estimatedMinutes: 40, reason: '腕を選択したため、上腕二頭筋と上腕三頭筋を交互に鍛える構成です。', advice: '肘を固定し、反動を使わずに動かせる重量を選びましょう。',
    exercises: [
      { exerciseId: 'hammer-curl', name: 'ハンマーカール', equipment: 'ダンベル', weightKg: '10', reps: '10', setCount: 3, source: 'frequent' },
      { exerciseId: 'cable-pushdown', name: 'ケーブルプレスダウン', equipment: 'ケーブル', weightKg: '20', reps: '12', setCount: 3, source: 'frequent' },
      { exerciseId: 'barbell-curl', name: 'バーベルカール', equipment: 'バーベル', weightKg: '20', reps: '10', setCount: 3, source: 'recommended' },
    ],
  },
  脚: {
    menuId: 'preview-split-legs', targetArea: '脚', estimatedMinutes: 60, reason: '脚を選択したため、太ももの前後とふくらはぎをまとめて鍛えます。', advice: '膝とつま先の向きを揃え、深さよりも安定したフォームを優先してください。',
    exercises: [
      { exerciseId: 'squat', name: 'バックスクワット', equipment: 'バーベル', weightKg: '60', reps: '8', setCount: 3, source: 'frequent' },
      { exerciseId: 'leg-press', name: 'レッグプレス', equipment: 'マシン', weightKg: '80', reps: '10', setCount: 3, source: 'frequent' },
      { exerciseId: 'leg-curl', name: 'レッグカール', equipment: 'マシン', weightKg: '30', reps: '12', setCount: 3, source: 'recommended' },
    ],
  },
  腹筋: {
    menuId: 'preview-split-abs', targetArea: '腹筋', estimatedMinutes: 30, reason: '腹筋を選択したため、曲げる動きと姿勢を保つ動きを組み合わせます。', advice: '腰が反らない範囲で行い、呼吸を止めないようにしてください。',
    exercises: [
      { exerciseId: 'crunch', name: 'クランチ', equipment: '自重', weightKg: '', reps: '15', setCount: 3, source: 'frequent' },
      { exerciseId: 'plank', name: 'プランク', equipment: '自重', weightKg: '', reps: '30', setCount: 3, source: 'frequent' },
      { exerciseId: 'ab-wheel', name: 'アブローラー', equipment: 'アブローラー', weightKg: '', reps: '8', setCount: 3, source: 'recommended' },
    ],
  },
};

const alternativeExercises: Record<string, GeneratedMenuExercise> = {
  'bench-press': { exerciseId: 'dumbbell-press', name: 'ダンベルプレス', equipment: 'ダンベル', weightKg: '22', reps: '10', setCount: 3, source: 'recommended' },
  'incline-dumbbell-press': { exerciseId: 'incline-bench-press', name: 'インクラインベンチプレス', equipment: 'バーベル', weightKg: '45', reps: '8', setCount: 3, source: 'recommended' },
  'chest-press': { exerciseId: 'pec-deck-fly', name: 'ペックデックフライ', equipment: 'マシン', weightKg: '25', reps: '12', setCount: 3, source: 'recommended' },
  'push-up': { exerciseId: 'dumbbell-fly', name: 'ダンベルフライ', equipment: 'ダンベル', weightKg: '12', reps: '12', setCount: 2, source: 'recommended' },
  'lat-pulldown': { exerciseId: 'pull-up', name: '懸垂', equipment: '自重', weightKg: '', reps: '8', setCount: 3, source: 'recommended' },
  'seated-row': { exerciseId: 'one-arm-dumbbell-row', name: 'ワンハンドダンベルロウ', equipment: 'ダンベル', weightKg: '18', reps: '10', setCount: 3, source: 'recommended' },
  'rear-delt-fly': { exerciseId: 'face-pull', name: 'フェイスプル', equipment: 'ケーブル', weightKg: '15', reps: '12', setCount: 3, source: 'recommended' },
  'hammer-curl': { exerciseId: 'incline-dumbbell-curl', name: 'インクラインダンベルカール', equipment: 'ダンベル', weightKg: '8', reps: '10', setCount: 3, source: 'recommended' },
  'shoulder-press': { exerciseId: 'machine-shoulder-press', name: 'マシンショルダープレス', equipment: 'マシン', weightKg: '30', reps: '10', setCount: 3, source: 'recommended' },
  'side-raise': { exerciseId: 'cable-side-raise', name: 'ケーブルサイドレイズ', equipment: 'ケーブル', weightKg: '5', reps: '12', setCount: 3, source: 'recommended' },
  'cable-pushdown': { exerciseId: 'skull-crusher', name: 'スカルクラッシャー', equipment: 'EZバー', weightKg: '15', reps: '10', setCount: 3, source: 'recommended' },
  'barbell-curl': { exerciseId: 'cable-curl', name: 'ケーブルカール', equipment: 'ケーブル', weightKg: '15', reps: '12', setCount: 3, source: 'recommended' },
  'squat': { exerciseId: 'front-squat', name: 'フロントスクワット', equipment: 'バーベル', weightKg: '45', reps: '8', setCount: 3, source: 'recommended' },
  'leg-press': { exerciseId: 'bulgarian-split-squat', name: 'ブルガリアンスクワット', equipment: 'ダンベル', weightKg: '12', reps: '10', setCount: 3, source: 'recommended' },
  'leg-curl': { exerciseId: 'romanian-deadlift', name: 'ルーマニアンデッドリフト', equipment: 'バーベル', weightKg: '45', reps: '10', setCount: 3, source: 'recommended' },
  'plank': { exerciseId: 'dead-bug', name: 'デッドバグ', equipment: '自重', weightKg: '', reps: '12', setCount: 3, source: 'recommended' },
  'crunch': { exerciseId: 'cable-crunch', name: 'ケーブルクランチ', equipment: 'ケーブル', weightKg: '15', reps: '12', setCount: 3, source: 'recommended' },
  'ab-wheel': { exerciseId: 'hanging-leg-raise', name: 'ハンギングレッグレイズ', equipment: '自重', weightKg: '', reps: '10', setCount: 3, source: 'recommended' },
};

function buildMenuVariation(baseMenu: GeneratedMenuPreview, generation: number) {
  const variation = generation % 3;
  if (variation === 0) {
    return { ...baseMenu, menuId: `${baseMenu.menuId}-${generation}` };
  }

  if (variation === 1) {
    return {
      ...baseMenu,
      menuId: `${baseMenu.menuId}-${generation}`,
      estimatedMinutes: Math.max(25, baseMenu.estimatedMinutes - 5),
      reason: `前回と同じ内容が続かないように種目を入れ替えました。${baseMenu.reason}`,
      exercises: baseMenu.exercises.map((exercise) => alternativeExercises[exercise.exerciseId] ?? exercise),
    };
  }

  const [firstExercise, ...remainingExercises] = baseMenu.exercises;
  const reorderedExercises = firstExercise ? [...remainingExercises, firstExercise] : [];
  return {
    ...baseMenu,
    menuId: `${baseMenu.menuId}-${generation}`,
    estimatedMinutes: baseMenu.estimatedMinutes + 5,
    reason: `前回とは種目の順番と回数設定を変え、刺激に変化をつけました。${baseMenu.reason}`,
    exercises: reorderedExercises.map((exercise) => ({
      ...exercise,
      reps: String(Math.min(20, Number(exercise.reps) + 2)),
    })),
  };
}

export function getMenuPreview(condition: number, generation: number, style: MenuTrainingStyle = 'ai', bodyPart: MenuBodyPart | null = null) {
  if (condition <= 4) return buildMenuVariation(menuVariants[2], generation);
  if (style === 'full-body') return buildMenuVariation(fullBodyMenu, generation);
  if (style === 'split' && bodyPart) return buildMenuVariation(splitMenus[bodyPart], generation);
  return buildMenuVariation(menuVariants[generation % 2], generation);
}
