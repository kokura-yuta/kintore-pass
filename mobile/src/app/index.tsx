import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StartScreen() {
  const router = useRouter();

  useEffect(() => {
    const timerId = setTimeout(() => router.replace('/auth-gate'), 2500);
    return () => clearTimeout(timerId);
  }, [router]);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.brandBlock}>
          <Text style={styles.eyebrow}>PERSONAL AI TRAINING COACH</Text>
          <Text style={styles.title}>
            筋トレ<Text style={styles.accent}>PAS</Text>
          </Text>
          <Text style={styles.message}>理想まで、迷わない。</Text>
        </View>

        <View style={styles.loadingTrack}>
          <View style={styles.loadingBar} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0D0C',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brandBlock: {
    alignItems: 'center',
  },
  eyebrow: {
    marginBottom: 14,
    color: '#B6F24B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  title: {
    color: '#F4F6F3',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -3,
  },
  accent: {
    color: '#B6F24B',
  },
  message: {
    marginTop: 18,
    color: '#9DA69F',
    fontSize: 14,
    letterSpacing: 1.4,
  },
  loadingTrack: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    left: 24,
    height: 3,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: '#202420',
  },
  loadingBar: {
    width: '70%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#B6F24B',
  },
});
