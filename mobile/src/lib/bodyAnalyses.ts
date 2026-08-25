// 身体分析履歴画面とバックエンドのGET APIをつなぐ通信処理
import { apiRequest } from '@/lib/api';

export type BodyAnalysisArea = {
  id: string;
  bodyPart: string;
  score: number | null;
  priority: string | null;
  observation: string | null;
  recommendation: string | null;
};

export type BodyAnalysisHistoryItem = {
  id: string;
  summary: string | null;
  goalDifference: string | null;
  analyzedAt: string | null;
  areas: BodyAnalysisArea[];
};

type BodyAnalysisHistoryResponse = {
  analyses: BodyAnalysisHistoryItem[];
};

export function fetchBodyAnalysisHistory(
  token: string,
) {
  return apiRequest<BodyAnalysisHistoryResponse>(
    '/api/body-analysis',
    {
      method: 'GET',
      token,
    },
  );
}
