import { apiRequest } from '@/lib/api';
import type { SavedAiMenu } from '@/lib/aiMenus';

export type HomeCondition = {
  score: number | null;
  label: string | null;
};

// GET /api/home でバックエンドから受け取るホーム画面専用データ
export type HomeResponse = {
  goalBodyType: string | null;
  menu: SavedAiMenu | null;
  condition: HomeCondition | null;
  aiMessage: string | null;
};

export function fetchHome(token: string) {
  return apiRequest<HomeResponse>('/api/home', {
    method: 'GET',
    token,
  });
}
