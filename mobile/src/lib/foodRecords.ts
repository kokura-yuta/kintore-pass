// 食事管理画面とバックエンドの保存・取得・変更・削除APIをつなぐ通信処理
import { apiRequest } from '@/lib/api';

export type MealType = '朝食' | '昼食' | '夕食' | '間食';

export type FoodRecord = {
  id: string;
  recordedDate: string;
  mealType: MealType;
  name: string;
  calories: number;
  proteinGrams: number;
};

export type FoodRecordInput = Omit<FoodRecord, 'id'>;

type FoodRecordsResponse = {
  date: string;
  records: FoodRecord[];
  summary: {
    totalCalories: number;
    totalProteinGrams: number;
    recordCount: number;
  };
};

type FoodRecordResponse = {
  record: FoodRecord;
};

// 指定日の本人の食事記録をNeonから取得する
export function fetchFoodRecords(
  token: string,
  recordedDate: string,
) {
  return apiRequest<FoodRecordsResponse>(
    `/api/food-records?date=${encodeURIComponent(recordedDate)}`,
    {
      method: 'GET',
      token,
    },
  );
}

// 新しい食事を本人の記録としてNeonへ保存する
export async function createFoodRecord(
  token: string,
  input: FoodRecordInput,
) {
  const response = await apiRequest<FoodRecordResponse>(
    '/api/food-records',
    {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    },
  );

  return response.record;
}

// 既存の食事記録を本人のデータに限って変更する
export async function updateFoodRecord(
  token: string,
  recordId: string,
  input: FoodRecordInput,
) {
  const response = await apiRequest<FoodRecordResponse>(
    '/api/food-records',
    {
      method: 'PATCH',
      token,
      body: JSON.stringify({ recordId, ...input }),
    },
  );

  return response.record;
}

// 本人が選んだ食事記録を1件削除する
export function deleteFoodRecord(
  token: string,
  recordId: string,
) {
  return apiRequest<{
    message: string;
    deletedRecordId: string;
  }>(
    `/api/food-records?recordId=${encodeURIComponent(recordId)}`,
    {
      method: 'DELETE',
      token,
    },
  );
}
