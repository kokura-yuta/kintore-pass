import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function AuthGateScreen() {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });

  if (!isLoaded) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color="#B6F24B" />
        <Text style={styles.message}>ログイン状態を確認しています…</Text>
      </View>
    );
  }

  return <Redirect href={isSignedIn ? '/home' : '/sign-in'} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: '#0B0D0C',
  },
  message: { color: '#9DA69F', fontSize: 13 },
});
