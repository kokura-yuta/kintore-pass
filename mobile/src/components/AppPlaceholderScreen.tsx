import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';

type Props = {
  description: string;
  eyebrow: string;
  title: string;
};

export function AppPlaceholderScreen({ description, eyebrow, title }: Props) {
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.content}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </SafeAreaView>
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  eyebrow: { color: '#73E7FF', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { marginTop: 10, color: '#F4F6F3', fontSize: 32, fontWeight: '700' },
  description: { marginTop: 14, color: '#99AAB4', fontSize: 14, lineHeight: 22 },
});
