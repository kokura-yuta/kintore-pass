import { type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Keep identical geometry across startup, authentication and bootstrap.
// No pretend percentage or fixed delay: the real request determines when we leave.
export function BrandSplash({ children }: PropsWithChildren) {
  return (
    <View style={styles.screen} accessibilityLabel="筋トレPAS 起動中" accessibilityState={{ busy: true }}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.brandBlock}>
          <Text style={styles.eyebrow}>PERSONAL AI TRAINING COACH</Text>
          <Text style={styles.title}>筋トレ<Text style={styles.accent}>PAS</Text></Text>
          <Text style={styles.message}>理想まで、迷わない。</Text>
        </View>
        {children ? <View style={styles.developmentActions}>{children}</View> : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  brandBlock: { alignItems: 'center' },
  eyebrow: { marginBottom: 14, color: '#73E7FF', fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  title: { color: '#F4F6F3', fontSize: 52, fontWeight: '700', letterSpacing: -3 },
  accent: { color: '#73E7FF' },
  message: { marginTop: 18, color: '#99AAB4', fontSize: 14, letterSpacing: 1.4 },
  developmentActions: { position: 'absolute', bottom: 48, left: 24, right: 24 },
});
