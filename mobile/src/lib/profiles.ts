// 身体プロフィール画面とバックエンドの保存・取得APIをつなぐ通信処理
import type {
  ProfileDraft,
  TrainingLocation,
} from '@/contexts/OnboardingContext';
import { apiRequest } from '@/lib/api';

export type UserProfile = {
  id: string;
  userId: string;
  heightCm: number;
  weightKg: number;
  bodyFatPercentage: number | null;
  weeklyTrainingDays: number | null;
  availableMinutes: number | null;
  trainingLocation: TrainingLocation | null;
  weakBodyParts: string[] | null;
};

type GetProfileResponse = {
  profile: UserProfile | null;
};

type SaveProfileResponse = {
  profile: UserProfile;
  profileCompleted: boolean;
};

// 保存済みの身体プロフィールを取得する
export function fetchUserProfile(token: string) {
  return apiRequest<GetProfileResponse>(
    '/api/users/profile',
    {
      method: 'GET',
      token,
    },
  );
}

// 画面入力をバックエンドへ送れる数値とnullへ変換する
export function profileDraftToApiInput(
  profile: ProfileDraft,
) {
  return {
    heightCm: Number(profile.heightCm),
    weightKg: Number(profile.weightKg),
    bodyFatPercentage:
      profile.bodyFatPercentage === ''
        ? null
        : Number(profile.bodyFatPercentage),
    weeklyTrainingDays:
      profile.weeklyTrainingDays,
    availableMinutes:
      profile.availableMinutes,
    trainingLocation:
      profile.trainingLocation,
    weakBodyParts:
      profile.weakBodyParts,
  };
}

// Neonから取得した数値を入力フォームで扱う文字列へ変換する
export function userProfileToDraft(
  profile: UserProfile,
): ProfileDraft {
  return {
    heightCm: String(profile.heightCm),
    weightKg: String(profile.weightKg),
    bodyFatPercentage:
      profile.bodyFatPercentage === null
        ? ''
        : String(profile.bodyFatPercentage),
    weeklyTrainingDays:
      profile.weeklyTrainingDays,
    availableMinutes:
      profile.availableMinutes,
    trainingLocation:
      profile.trainingLocation,
    trainingStyle: null,
    weakBodyParts:
      profile.weakBodyParts ?? [],
  };
}

// 入力した身体プロフィールをバックエンド経由でNeonへ保存する
export function saveUserProfile(
  token: string,
  profile: ProfileDraft,
) {
  return apiRequest<SaveProfileResponse>(
    '/api/users/profile',
    {
      method: 'PATCH',
      token,
      body: JSON.stringify(
        profileDraftToApiInput(profile),
      ),
    },
  );
}
