import { useAuth } from '@clerk/expo';
import { AuthView } from '@clerk/expo/native';
import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function SignInScreen() {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });

  if (isLoaded && isSignedIn) {
    return <Redirect href="/home" />;
  }

  return (
    <View style={styles.screen}>
      <AuthView mode="signInOrUp" isDismissible={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0D0C' },
});
