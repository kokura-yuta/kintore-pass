export type AnalysisHistoryItem = {
  id: string;
  analyzedOn: string;
  type: 'initial' | 'periodic';
  weightKg: number;
  bmi: number;
  summary: string;
  focusAreas: string[];
  changes: string[];
};

export const analysisHistoryPreview: AnalysisHistoryItem[] = [
  {
    id: 'analysis-2026-08-10',
    analyzedOn: '2026-08-10',
    type: 'periodic',
    weightKg: 66.5,
    bmi: 23.0,
    summary: '上半身の輪郭が少し明確になっています。胸と肩のトレーニングを継続しながら、背中の頻度も増やすのがおすすめです。',
    focusAreas: ['背中', '肩'],
    changes: ['前回比 -0.4kg', '胸のトレーニング頻度が増加', '背中は最近少なめ'],
  },
  {
    id: 'analysis-2026-07-20',
    analyzedOn: '2026-07-20',
    type: 'periodic',
    weightKg: 66.9,
    bmi: 23.1,
    summary: '体重は安定しています。目標体型に向けて、胸・肩を中心にしつつ脚の記録も維持していきましょう。',
    focusAreas: ['胸', '肩'],
    changes: ['初回比 -0.5kg', '週3回のペースを維持'],
  },
  {
    id: 'analysis-2026-07-01',
    analyzedOn: '2026-07-01',
    type: 'initial',
    weightKg: 67.4,
    bmi: 23.3,
    summary: '現在の身体情報を基準として記録しました。まずは無理のない重量でフォームと継続を優先します。',
    focusAreas: ['胸', '背中', '肩'],
    changes: ['初回分析'],
  },
];
