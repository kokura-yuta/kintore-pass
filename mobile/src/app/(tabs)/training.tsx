import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTrainingDraft } from '@/contexts/TrainingDraftContext';
import TrainingScreen from '@/screens/TrainingScreen';

export default function TrainingRoute() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { draft } = useTrainingDraft();
  const [menuKey, setMenuKey] = useState(draft?.menuId ?? 'manual');
  // Clearing a saved draft must not remount and discard the success message.
  // A newly generated menu, however, starts a fresh initialized form.
  if (draft && menuKey !== draft.menuId) setMenuKey(draft.menuId);
  return <TrainingScreen key={editId ? `edit:${editId}` : `menu:${menuKey}`} />;
}
