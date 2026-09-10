// 体重履歴画面とバックエンドの保存・取得・更新・削除APIをつなぐ通信処理
import { apiRequest } from '@/lib/api';

export type WeightRecord = {
  id: string;
  recordedOn: string;
  weightKg: number;
};

type ApiWeightRecord = {
  id: string;
  recordedDate: string;
  weightKg: number;
};

type WeightRecordsResponse = {
  records: ApiWeightRecord[];
  summary: {
    firstWeightKg: number | null;
    latestWeightKg: number | null;
    changeKg: number | null;
    recordCount: number;
  };
};

type WeightRecordResponse = {
  record: ApiWeightRecord;
};

// APIのrecordedDateを、画面で使っているrecordedOnへ変換する
function toWeightRecord(
  record: ApiWeightRecord,
): WeightRecord {
  return {
    id: record.id,
    recordedOn: record.recordedDate,
    weightKg: record.weightKg,
  };
}

// 本人の体重履歴をNeonから取得する
export async function fetchWeightRecords(
  token: string,
) {
  const response =
    await apiRequest<WeightRecordsResponse>(
      '/api/weight-records',
      {
        method: 'GET',
        token,
      },
    );

  return {
    records: response.records.map(toWeightRecord),
    summary: response.summary,
  };
}

// 新しい日付の体重をNeonへ保存する
export async function createWeightRecord(
  token: string,
  recordedOn: string,
  weightKg: number,
) {
  const response =
    await apiRequest<WeightRecordResponse>(
      '/api/weight-records',
      {
        method: 'POST',
        token,
        body: JSON.stringify({
          recordedDate: recordedOn,
          weightKg,
        }),
      },
    );

  return toWeightRecord(response.record);
}

// 本人が選んだ体重記録の数値を更新する
export async function updateWeightRecord(
  token: string,
  recordId: string,
  weightKg: number,
) {
  const response =
    await apiRequest<WeightRecordResponse>(
      '/api/weight-records',
      {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          recordId,
          weightKg,
        }),
      },
    );

  return toWeightRecord(response.record);
}

// 本人が選んだ体重記録を1件削除する
export function deleteWeightRecord(
  token: string,
  recordId: string,
) {
  return apiRequest<{
    message: string;
    deletedRecordId: string;
  }>(
    `/api/weight-records?recordId=${encodeURIComponent(recordId)}`,
    {
      method: 'DELETE',
      token,
    },
  );
}
