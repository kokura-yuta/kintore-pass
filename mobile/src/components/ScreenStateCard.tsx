import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type ScreenStateCardProps = {
  actionLabel?: string;
  compact?: boolean;
  embedded?: boolean;
  message?: string;
  onAction?: () => void;
  title: string;
  type: 'loading' | 'error' | 'empty';
};

export function ScreenStateCard({
  actionLabel,
  compact = false,
  embedded = false,
  message,
  onAction,
  title,
  type,
}: ScreenStateCardProps) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.card,
        compact && styles.compactCard,
        embedded && styles.embeddedCard,
        type === 'error' && styles.errorCard,
      ]}
    >
      {type === 'loading' ? <ActivityIndicator color="#F6D365" size={compact ? 'small' : 'large'} /> : null}
      {type === 'error' ? <Text style={styles.errorEyebrow}>CONNECTION ERROR</Text> : null}
      <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.actionButton}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 230,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 18,
    backgroundColor: '#151515',
  },
  compactCard: { minHeight: 132, marginTop: 11, padding: 18 },
  embeddedCard: { minHeight: 100, marginTop: 10, padding: 12, borderWidth: 0, backgroundColor: 'transparent' },
  errorCard: { borderColor: '#613535', backgroundColor: '#201414' },
  errorEyebrow: { color: '#FF7676', fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  title: { marginTop: 15, color: '#F4F6F3', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  compactTitle: { marginTop: 8, fontSize: 14 },
  message: { marginTop: 8, color: '#8E978F', fontSize: 11, lineHeight: 18, textAlign: 'center' },
  actionButton: { width: '100%', maxWidth: 320, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 13, backgroundColor: '#F6D365' },
  actionText: { textAlign: 'center', color: '#0A0A0A', fontSize: 12, fontWeight: '700' },
});
