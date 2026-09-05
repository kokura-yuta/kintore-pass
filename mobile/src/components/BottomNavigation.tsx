import { type Href, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const navigationItems = [
  { href: '/home', label: 'ホーム', icon: '⌂' },
  { href: '/training', label: 'トレーニング', icon: '▤' },
  { href: '/ai-coach', label: 'AIコーチ', icon: '✦' },
  { href: '/chat', label: 'チャット', icon: '◌' },
  { href: '/my-page', label: 'マイページ', icon: '●' },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View accessibilityRole="tablist" style={styles.navigation}>
        {navigationItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              key={item.href}
              onPress={() => router.replace(item.href as Href)}
              style={styles.item}
            >
              <Text style={[styles.icon, active && styles.active]}>{item.icon}</Text>
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
  navigation: { minHeight: 64, flexDirection: 'row', alignItems: 'stretch' },
  item: { flex: 1, minWidth: 0, paddingHorizontal: 3, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 4 },
  icon: { color: '#72828D', fontSize: 19, fontWeight: '600' },
  label: { maxWidth: '100%', textAlign: 'center', color: '#72828D', fontSize: 9, fontWeight: '600' },
  active: { color: '#73E7FF' },
});
