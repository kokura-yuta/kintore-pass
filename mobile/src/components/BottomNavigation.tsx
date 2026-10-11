import { type Href, usePathname, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef } from 'react';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { canNavigateTab, planLabel } from '@/lib/planPresentation';
import { isApiBypassEnabled, isScreenshotMode } from '@/lib/api';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const navigationItems = [
  { href: '/training', label: 'トレーニング', icon: { ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' } },
  { href: '/food', label: '食事管理', icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' } },
  { href: '/chat', label: 'AI', icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } },
  { href: '/my-page', label: 'マイページ', icon: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' } },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const lastPress = useRef(0);
  const plan = usePlanAccess();
  const label = plan.isFreePreview ? 'Free表示の確認用（契約変更なし）' : isScreenshotMode ? 'Premium' : isApiBypassEnabled ? '開発プレビュー' : plan.error ? 'プラン確認エラー' : planLabel(plan.data);

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <Pressable accessibilityRole="button" accessibilityLabel={`現在のプラン：${label}。プラン詳細を開く`} onPress={() => router.push('/subscription')} style={styles.planBar}>
        <Text style={styles.planText}>{label}</Text><Text style={styles.planLink}>プラン詳細 ›</Text>
      </Pressable>
      <View accessibilityRole="tablist" style={styles.navigation}>
        {navigationItems.map((item) => {
          const atTabRoot = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const active = atTabRoot || (item.href === '/chat' && pathname === '/home');

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              key={item.href}
              onPress={() => {
                if (!canNavigateTab(atTabRoot, lastPress.current, Date.now())) return;
                lastPress.current = Date.now();
                router.replace((plan.isFreePreview ? `${item.href}?previewPlan=free` : item.href) as Href);
              }}
              style={styles.item}
            >
              <View style={[styles.icon, active && styles.selectedIcon]}><SymbolView name={item.icon} size={22} tintColor={active ? '#73E7FF' : '#8195A2'} /></View>
              <Text style={[styles.label, active && styles.active]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    borderTopWidth: 1,
    borderTopColor: '#142833',
    backgroundColor: '#081018',
  },
  planBar: { minHeight: 30, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planText: { color: '#B2C3CD', fontSize: 11, fontWeight: '600' },
  planLink: { color: '#73E7FF', fontSize: 11 },
  navigation: { minHeight: 58, flexDirection: 'row', alignItems: 'stretch' },
  item: { flex: 1, minWidth: 0, paddingHorizontal: 3, paddingVertical: 5, alignItems: 'center', justifyContent: 'center', gap: 3 },
  icon: { width: 46, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  selectedIcon: { backgroundColor: '#123542' },
  label: { maxWidth: '100%', textAlign: 'center', color: '#72828D', fontSize: 9, fontWeight: '600' },
  active: { color: '#73E7FF' },
});
