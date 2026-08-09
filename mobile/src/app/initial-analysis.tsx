import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InitialAnalysisScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.content}>
        <Text style={styles.eyebrow}>FIRST SETUP · STEP 3 / 3</Text>
        <Text style={styles.title}>初回分析</Text>
        <Text style={styles.description}>次の工程で入力内容の確認と分析結果を作成します。</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0D0C' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  eyebrow: { color: '#B6F24B', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { marginTop: 10, color: '#F4F6F3', fontSize: 32, fontWeight: '900' },
  description: { marginTop: 14, color: '#9DA69F', fontSize: 14, lineHeight: 22 },
});
