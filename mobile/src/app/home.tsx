import { useAuth, useClerk } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, userId } = useAuth({ treatPendingAsSignedOut: false });
  const { signOut } = useClerk();

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/sign-in');
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.eyebrow}>AUTHENTICATION COMPLETE</Text>
        <Text style={styles.title}>ログインできました</Text>
        <Text style={styles.description}>
          次はこのユーザーIDを使ってbootstrap APIを呼び出します。
        </Text>
        <View style={styles.userCard}>
          <Text style={styles.label}>ClerkユーザーID</Text>
          <Text selectable style={styles.userId}>{userId ?? '確認中…'}</Text>
        </View>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>ログアウト</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0D0C' },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  eyebrow: { color: '#B6F24B', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { marginTop: 10, color: '#F4F6F3', fontSize: 34, fontWeight: '900' },
  description: { marginTop: 12, color: '#9DA69F', fontSize: 14, lineHeight: 22 },
  userCard: {
    marginTop: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2C312D',
    borderRadius: 14,
    backgroundColor: '#141715',
  },
  label: { color: '#9DA69F', fontSize: 11 },
  userId: { marginTop: 8, color: '#B6F24B', fontSize: 13, fontWeight: '700' },
  signOutButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#2C312D',
    borderRadius: 14,
  },
  signOutText: { color: '#F4F6F3', fontSize: 14, fontWeight: '700' },
});
