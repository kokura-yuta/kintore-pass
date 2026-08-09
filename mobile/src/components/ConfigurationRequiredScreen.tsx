import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ConfigurationRequiredScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.eyebrow}>CLERK SETUP</Text>
        <Text style={styles.title}>ログイン設定が必要です</Text>
        <Text style={styles.description}>
          Clerkの公開可能キーをmobile/.env.localへ設定すると、ログイン画面を確認できます。
        </Text>
        <View style={styles.notice}>
          <Text style={styles.noticeLabel}>設定する名前</Text>
          <Text selectable style={styles.code}>EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY</Text>
        </View>
        <Text style={styles.warning}>Secret Keyはアプリへ設定しないでください。</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0D0C' },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  eyebrow: { color: '#B6F24B', fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  title: { marginTop: 10, color: '#F4F6F3', fontSize: 30, fontWeight: '900' },
  description: { marginTop: 14, color: '#9DA69F', fontSize: 14, lineHeight: 22 },
  notice: {
    marginTop: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2C312D',
    borderRadius: 14,
    backgroundColor: '#141715',
  },
  noticeLabel: { color: '#9DA69F', fontSize: 11 },
  code: { marginTop: 8, color: '#B6F24B', fontSize: 12, fontWeight: '700' },
  warning: { marginTop: 16, color: '#FF8D98', fontSize: 12 },
});
