// AIメニュー画面とバックエンドの生成・最新取得APIをつなぐ通信処理
import { apiRequest } from '@/lib/api';
import { exerciseCatalog } from '@/lib/exerciseCatalog';
import type { GeneratedMenuPreview } from '@/lib/aiMenuPreview';
import type { MenuBodyPart } from '@/lib/aiMenuPreview';

export type AiMenuExercise = {
  exerciseName: string;
  bodyPart: string;
  bodyArea: string | null;
  targetWeightKg: number | null;
  targetReps: string;
  sets: number;
  restSeconds: number;
  note: string;
};

export type SavedAiMenu = {
  id: string;
  recommendedBodyPart: string;
  reason: string;
  estimatedMinutes: number;
  exercises: AiMenuExercise[];
  advice: string[];
  conditionScore: number | null;
  requestNote: string | null;
  createdAt: string;
};

type AiMenuResponse = {
  menu: SavedAiMenu;
};

type LatestAiMenuResponse = {
  menu: SavedAiMenu | null;
};

const menuBodyParts: MenuBodyPart[] = ['胸', '背中', '肩', '腕', '脚', '腹筋'];

function toMenuBodyPart(bodyPart: string): MenuBodyPart {
  return menuBodyParts.find((part) => bodyPart.includes(part)) ?? '胸';
}

export function generateAiMenu(
  token: string,
  conditionScore: number,
  requestedBodyPart: MenuBodyPart | null,
  requestId: string,
) {
  return apiRequest<AiMenuResponse>('/api/ai-menu', {
    method: 'POST',
    token,
    body: JSON.stringify({
      conditionScore,
      note: null,
      requestedBodyPart,
      requestId,
    }),
  });
}

export function fetchLatestAiMenu(token: string) {
  return apiRequest<LatestAiMenuResponse>('/api/ai-menu', {
    method: 'GET',
    token,
  });
}

// バックエンドの保存形式を、既存のAIメニュー画面が表示できる形式へ変換する
export function toGeneratedMenuPreview(
  menu: SavedAiMenu,
): GeneratedMenuPreview {
  return {
    menuId: menu.id,
    targetArea: menu.recommendedBodyPart,
    estimatedMinutes: menu.estimatedMinutes,
    reason: menu.reason,
    advice: menu.advice.join('\n'),
    exercises: menu.exercises.map((exercise, index) => {
      const catalogExercise = exerciseCatalog.find(
        (item) => item.name === exercise.exerciseName,
      );

      return {
        exerciseId: catalogExercise?.id ?? `ai-exercise-${index}`,
        name: exercise.exerciseName,
        equipment: catalogExercise?.equipment ?? exercise.bodyPart,
        category: catalogExercise?.category ?? toMenuBodyPart(exercise.bodyPart),
        weightKg:
          exercise.targetWeightKg === null
            ? ''
            : String(exercise.targetWeightKg),
        reps: exercise.targetReps,
        setCount: exercise.sets,
        source: 'recommended',
      };
    }),
  };
}
