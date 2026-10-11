import { forwardRef } from 'react';
import { Pressable as NativePressable, type PressableProps, type View } from 'react-native';
import { feedback, type FeedbackKind } from '@/lib/haptics';

type Props = PressableProps & { haptic?: FeedbackKind | false };

// Trigger only a completed press: touching while scrolling must stay silent.
export const Pressable = forwardRef<View, Props>(function FeedbackPressable(
  { onPress, disabled, accessibilityState, accessibilityRole, haptic, ...props }, ref,
) {
  const unavailable = disabled || accessibilityState?.disabled || accessibilityState?.busy;
  const selection = accessibilityRole === 'radio' || accessibilityRole === 'tab';
  const alreadySelected = selection && (accessibilityState?.checked === true || accessibilityState?.selected === true);
  return <NativePressable {...props} ref={ref} disabled={disabled}
    accessibilityRole={accessibilityRole} accessibilityState={accessibilityState}
    onPress={onPress ? event => {
      if (!unavailable && !alreadySelected && haptic !== false) feedback(haptic ?? (selection ? 'selection' : 'tap'));
      onPress(event);
    } : undefined} />;
});
