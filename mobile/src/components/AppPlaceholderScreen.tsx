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
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  eyebrow: { color: '#FFF1B8', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { fontFamily: 'Yu Mincho', marginTop: 10, color: '#F4F6F3', fontSize: 32, fontWeight: '700' },
  description: { marginTop: 14, color: '#9DA69F', fontSize: 14, lineHeight: 22 },
});
