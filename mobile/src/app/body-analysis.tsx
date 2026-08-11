import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PhotoPosition = 'front' | 'side' | 'back';
type AnalysisStatus = 'input' | 'loading' | 'result';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const positions: { key: PhotoPosition; label: string; guide: string }[] = [
  { key: 'front', label: '正面', guide: '腕を自然に下ろして全身を撮影' },
  { key: 'side', label: '横', guide: '身体の真横から全身を撮影' },
  { key: 'back', label: '背面', guide: '背筋を伸ばして後ろから撮影' },
];

export default function BodyAnalysisScreen() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Record<PhotoPosition, string | null>>({ front: null, side: null, back: null });
  const [weightKg, setWeightKg] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>('input');
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('result'), 1700);
    return () => clearTimeout(timer);
  }, [status]);

  async function selectPhoto(position: PhotoPosition, source: 'camera' | 'library') {
    setError('');
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('撮影するにはカメラへのアクセスを許可してください。');
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('写真を選ぶには写真ライブラリへのアクセスを許可してください。');
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 0.85, selectionLimit: 1 };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
      setError('画像は1枚8MB以下のものを選んでください。');
      return;
    }
    setPhotos((current) => ({ ...current, [position]: asset.uri }));
  }

  function beginAnalysis() {
    if (positions.some((position) => !photos[position.key])) {
      setError('正面・横・背面の3枚を設定してください。');
      return;
    }
    if (weightKg && (Number(weightKg) < 30 || Number(weightKg) > 300)) {
      setError('体重を30〜300kgで入力してください。');
      return;
    }
    setError('');
    setStatus('loading');
  }

  if (status === 'loading') {
    return <View style={styles.screen}><SafeAreaView edges={['top', 'bottom']} style={styles.loadingArea}><ActivityIndicator color="#B6F24B" size="large" /><Text style={styles.loadingTitle}>身体を分析しています</Text><Text style={styles.loadingText}>写真とこれまでの記録を照らし合わせています…</Text></SafeAreaView></View>;
  }

  if (status === 'result') {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.completeEyebrow}>ANALYSIS COMPLETE</Text><Text style={styles.resultTitle}>身体分析が完了しました</Text>
            <View style={styles.resultCard}><Text style={styles.resultNumber}>01</Text><Text style={styles.resultLabel}>今回の変化</Text><Text style={styles.resultText}>前回より肩まわりの輪郭が安定しています。体重は大きく変化していないため、継続して上半身の筋量を増やす方針がおすすめです。</Text></View>
            <View style={styles.resultCard}><Text style={styles.resultNumber}>02</Text><Text style={styles.resultLabel}>重点部位</Text><View style={styles.focusRow}><View style={styles.focusChip}><Text style={styles.focusText}>背中</Text></View><View style={styles.focusChip}><Text style={styles.focusText}>肩</Text></View></View><Text style={styles.resultText}>背中の頻度が最近少ないため、次回はローイング系種目を追加してバランスを整えましょう。</Text></View>
            <View style={styles.resultCard}><Text style={styles.resultNumber}>03</Text><Text style={styles.resultLabel}>AIアドバイス</Text><Text style={styles.resultText}>同じ場所・明るさ・姿勢で定期的に撮影すると、変化を比較しやすくなります。写真だけで断定せず、体重やトレーニング記録も合わせて確認します。</Text></View>
            <Pressable onPress={() => router.replace('/analysis-history')} style={styles.primaryButton}><Text style={styles.primaryText}>結果を保存して分析履歴へ</Text><Text style={styles.primaryArrow}>›</Text></Pressable>
            <Text style={styles.previewNote}>現在は確認用のAI結果です。API接続後に画像を送信し、実際の分析結果を保存します。</Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}><Pressable accessibilityLabel="分析履歴へ戻る" onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable><View><Text style={styles.eyebrow}>BODY ANALYSIS</Text><Text style={styles.title}>身体写真を設定</Text></View></View>
          <Text style={styles.lead}>正面・横・背面の3枚を、できるだけ同じ場所と明るさで撮影してください。</Text>

          <View style={styles.photoGrid}>
            {positions.map((position) => (
              <View key={position.key} style={styles.photoCard}>
                {photos[position.key] ? <Image alt={`${position.label}から撮影した身体写真`} contentFit="cover" source={{ uri: photos[position.key]! }} style={styles.photo} /> : <View style={styles.photoPlaceholder}><Text style={styles.positionLabel}>{position.label}</Text><Text style={styles.guideText}>{position.guide}</Text></View>}
                <View style={styles.photoActions}>
                  <Pressable onPress={() => selectPhoto(position.key, 'camera')} style={styles.photoButton}><Text style={styles.photoButtonText}>撮影</Text></Pressable>
                  <Pressable onPress={() => selectPhoto(position.key, 'library')} style={styles.photoButton}><Text style={styles.photoButtonText}>写真</Text></Pressable>
                </View>
                {photos[position.key] ? <Pressable onPress={() => setPhotos((current) => ({ ...current, [position.key]: null }))}><Text style={styles.removeText}>削除</Text></Pressable> : null}
              </View>
            ))}
          </View>

          <View style={styles.weightCard}><Text style={styles.cardTitle}>現在の体重 <Text style={styles.optional}>任意</Text></Text><View style={styles.weightInputWrap}><TextInput inputMode="decimal" keyboardType="decimal-pad" onChangeText={(text) => setWeightKg(text.replace(/[^0-9.]/g, ''))} placeholder="66.5" placeholderTextColor="#59605A" style={styles.weightInput} value={weightKg} /><Text style={styles.unit}>kg</Text></View></View>
          <View style={styles.notice}><Text style={styles.noticeTitle}>写真について</Text><Text style={styles.noticeText}>身体写真は機密性の高いデータです。現在は端末のプレビューだけに使用し、API接続後はユーザー本人だけがアクセスできる保存方式にします。</Text></View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={beginAnalysis} style={styles.primaryButton}><Text style={styles.primaryText}>この写真で分析する</Text><Text style={styles.primaryArrow}>›</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0D0C' }, safeArea: { flex: 1 }, content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32 }, header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: '#2C312D', borderRadius: 13 }, backText: { color: '#F4F6F3', fontSize: 30, lineHeight: 32 }, eyebrow: { color: '#B6F24B', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 }, title: { marginTop: 3, color: '#F4F6F3', fontSize: 25, fontWeight: '900' }, lead: { marginTop: 15, color: '#8E978F', fontSize: 12, lineHeight: 19 },
  photoGrid: { gap: 12, marginTop: 18 }, photoCard: { padding: 12, borderWidth: 1, borderColor: '#2C312D', borderRadius: 17, backgroundColor: '#151816' }, photo: { width: '100%', height: 260, borderRadius: 13, backgroundColor: '#0B0D0C' }, photoPlaceholder: { height: 150, alignItems: 'center', justifyContent: 'center', padding: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: '#3A403B', borderRadius: 13, backgroundColor: '#0B0D0C' }, positionLabel: { color: '#F4F6F3', fontSize: 18, fontWeight: '900' }, guideText: { marginTop: 8, color: '#697169', fontSize: 10, textAlign: 'center' }, photoActions: { flexDirection: 'row', gap: 8, marginTop: 10 }, photoButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: '#B6F24B', borderRadius: 11 }, photoButtonText: { color: '#B6F24B', fontSize: 11, fontWeight: '900' }, removeText: { marginTop: 9, color: '#FF8D98', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  weightCard: { marginTop: 13, padding: 16, borderWidth: 1, borderColor: '#2C312D', borderRadius: 17, backgroundColor: '#151816' }, cardTitle: { color: '#F4F6F3', fontSize: 14, fontWeight: '900' }, optional: { color: '#697169', fontSize: 9 }, weightInputWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', marginTop: 11, borderWidth: 1, borderColor: '#343A35', borderRadius: 12, backgroundColor: '#0B0D0C' }, weightInput: { flex: 1, paddingHorizontal: 13, color: '#F4F6F3', fontSize: 15, fontWeight: '800' }, unit: { paddingRight: 13, color: '#737B75', fontSize: 10 },
  notice: { marginTop: 13, padding: 14, borderRadius: 14, backgroundColor: '#20251F' }, noticeTitle: { color: '#B6F24B', fontSize: 10, fontWeight: '900' }, noticeText: { marginTop: 6, color: '#8E978F', fontSize: 9, lineHeight: 15 }, error: { marginTop: 12, color: '#FF7676', fontSize: 11, lineHeight: 17 }, primaryButton: { minHeight: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingHorizontal: 17, borderRadius: 15, backgroundColor: '#B6F24B' }, primaryText: { color: '#0B0D0C', fontSize: 14, fontWeight: '900' }, primaryArrow: { color: '#0B0D0C', fontSize: 27 },
  loadingArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, loadingTitle: { marginTop: 21, color: '#F4F6F3', fontSize: 22, fontWeight: '900' }, loadingText: { marginTop: 9, color: '#737B75', fontSize: 11, textAlign: 'center' }, completeEyebrow: { marginTop: 14, color: '#B6F24B', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 }, resultTitle: { marginTop: 7, color: '#F4F6F3', fontSize: 27, fontWeight: '900' }, resultCard: { marginTop: 13, padding: 17, borderWidth: 1, borderColor: '#2C312D', borderRadius: 17, backgroundColor: '#151816' }, resultNumber: { color: '#B6F24B', fontSize: 9, fontWeight: '900' }, resultLabel: { marginTop: 6, color: '#F4F6F3', fontSize: 15, fontWeight: '900' }, resultText: { marginTop: 8, color: '#A5ADA7', fontSize: 11, lineHeight: 18 }, focusRow: { flexDirection: 'row', gap: 7, marginTop: 9 }, focusChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#29331E' }, focusText: { color: '#B6F24B', fontSize: 10, fontWeight: '900' }, previewNote: { marginTop: 13, color: '#59605A', fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
