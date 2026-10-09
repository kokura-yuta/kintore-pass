import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '@/components/BottomNavigation';
import { usePlanAccess } from '@/hooks/usePlanAccess';

export function PremiumScreen({ title, children }: { title: string; children: ReactNode }) {
  const plan = usePlanAccess();
  const router = useRouter();
  // Do not mount paid screens or fetch their data behind the blur.
  if (plan.allowed) return <>{children}</>;
  return <View style={styles.screen}>
    <SafeAreaView edges={['top']} style={styles.area}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.preview}>
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.placeholder}>
            {[0, 1, 2, 3].map((item) => <View key={item} style={styles.sample}><View style={styles.line} /><View style={[styles.line, { width: '55%' }]} /></View>)}
          </View>
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.overlay}>
            <View style={styles.card}>
              {plan.error ? <><Text style={styles.title}>プランを確認できませんでした</Text><Text style={styles.description}>{plan.error}</Text><Pressable onPress={plan.refresh} style={styles.button}><Text style={styles.buttonText}>もう一度確認する</Text></Pressable></> : !plan.data && !plan.isFreePreview ? <><ActivityIndicator color="#73E7FF" /><Text style={styles.description}>プランを確認しています…</Text></> : <>
                <Text style={styles.eyebrow}>PREMIUM</Text>
                <Text style={styles.title}>{title}を利用する</Text>
                <Text style={styles.description}>現在はFreeプランです。AI機能はPremiumまたは無料体験中に利用できます。</Text>
                <Pressable accessibilityRole="button" onPress={() => router.push('/subscription')} style={styles.button}><Text style={styles.buttonText}>Premiumプランを見る</Text></Pressable>
                <Text style={styles.note}>トレーニング・食事の手動記録は無料です</Text>
              </>}
              <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/training')} style={styles.back}><Text style={styles.description}>戻る</Text></Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    <BottomNavigation />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' }, area: { flex: 1 },
  content: { flexGrow: 1, padding: 20, gap: 20 },
  title: { color: '#F4F6F3', fontSize: 22, fontWeight: '700' },
  preview: { flexGrow: 1, minHeight: 420, overflow: 'hidden', borderRadius: 24, backgroundColor: '#0C151D' },
  placeholder: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, padding: 20, gap: 24 },
  sample: { height: 90, padding: 20, gap: 12, borderRadius: 16, backgroundColor: '#173341' },
  line: { height: 10, width: '80%', backgroundColor: '#40788B', borderRadius: 5 },
  overlay: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: '#050A0F66' },
  card: { padding: 22, gap: 16, borderWidth: 1, borderColor: '#295361', borderRadius: 20, backgroundColor: '#0C151DF2' },
  eyebrow: { color: '#73E7FF', letterSpacing: 2, fontSize: 12, fontWeight: '700' },
  description: { color: '#B2C3CD', fontSize: 14, lineHeight: 22 },
  button: { minHeight: 50, borderRadius: 14, backgroundColor: '#00D4FF', justifyContent: 'center', alignItems: 'center', padding: 12 },
  buttonText: { color: '#050A0F', fontWeight: '700', fontSize: 15 },
  note: { color: '#91A6B2', fontSize: 12, lineHeight: 18 }, back: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
