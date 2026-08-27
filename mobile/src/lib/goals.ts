// 理想体型画面とバックエンドの保存・取得APIをつなぐ通信処理
import { apiRequest } from '@/lib/api';
import type { GoalBodySelection } from '@/contexts/OnboardingContext';

// バックエンドへの保存を許可する4種類の理想体型
export type GoalBodyType =
  | '細マッチョ'
  | '逆三角形'
  | 'フィジーク'
  | 'バルクアップ';

const goalBodySelectionByType: Record<
  GoalBodyType,
  GoalBodySelection
> = {
  細マッチョ: {
    kind: 'preset',
    bodyTypeId: 'lean-muscle',
  },
  逆三角形: {
    kind: 'preset',
    bodyTypeId: 'v-shape',
  },
  フィジーク: {
    kind: 'preset',
    bodyTypeId: 'physique',
  },
  バルクアップ: {
    kind: 'preset',
    bodyTypeId: 'bulk-up',
  },
};

// Neonの日本語名を理想体型画面で使う選択形式へ変換する
export function goalBodyTypeToSelection(
  goalBodyType: string,
) {
  return goalBodySelectionByType[
    goalBodyType as GoalBodyType
  ] ?? null;
}

// 理想体型取得APIから返されるJSONの設計図
type GetGoalResponse = {
  goalBodyType: GoalBodyType | null;
};

// 理想体型保存APIから返されるJSONの設計図
type SaveGoalResponse = {
  user: {
    goalBodyType: GoalBodyType | null;
  };
};

// Neonに保存済みの理想体型を取得する
export function fetchGoalBodyType(
  token: string,
) {
  return apiRequest<GetGoalResponse>(
    '/api/users/goal',
    {
      method: 'GET',
      token,
    },
  );
}

// 選択した理想体型をバックエンド経由でNeonへ保存する
export function saveGoalBodyType(
  token: string,
  goalBodyType: GoalBodyType,
) {
  return apiRequest<SaveGoalResponse>(
    '/api/users/goal',
    {
      method: 'PATCH',
      token,
      body: JSON.stringify({
        goalBodyType,
      }),
    },
  );
}
