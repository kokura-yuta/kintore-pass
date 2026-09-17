import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export function LegalDocumentScreen({ title, sections }: { title: string; sections: LegalSection[] }) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>MUSCLE PAS LEGAL</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.updated}>制定日・最終更新日：2026年9月17日</Text>
        <View style={styles.notice}>
          <Text style={styles.noticeText}>運営者の公開名と問い合わせ先は、App Store提出前に正式情報へ更新します。</Text>
        </View>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs.map((paragraph) => <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>)}
          </View>
        ))}
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>戻る</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' },
  content: { padding: 22, paddingBottom: 44 },
  eyebrow: { marginTop: 12, color: '#73E7FF', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  title: { marginTop: 8, color: '#F4F6F3', fontSize: 29, fontWeight: '700' },
  updated: { marginTop: 9, color: '#72828D', fontSize: 10 },
  notice: { marginTop: 20, padding: 14, borderWidth: 1, borderColor: '#735E24', borderRadius: 13, backgroundColor: '#1B180D' },
  noticeText: { color: '#F4D676', fontSize: 11, lineHeight: 18 },
  section: { marginTop: 24 },
  sectionTitle: { color: '#EAF8FC', fontSize: 16, fontWeight: '700' },
  paragraph: { marginTop: 9, color: '#A7B5BD', fontSize: 12, lineHeight: 21 },
  backButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 30, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 14 },
  backText: { color: '#73E7FF', fontSize: 13, fontWeight: '700' },
});
