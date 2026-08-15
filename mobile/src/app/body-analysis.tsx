import { useAuth } from '@clerk/expo';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ApiError,
  apiUploadRequest,
} from '@/lib/api';


type PhotoPosition = 'front' | 'side' | 'back';
type AnalysisStatus = 'input' | 'loading' | 'result';

// 身体分析APIから返るJSONの形
type BodyAnalysisApiResponse = {
  bodyAnalysisId: string;
  analysis: {
    summary: string;
    goal_difference: string;
    areas: {
      body_part: string;
      score: number;
      priority: string;
      observation: string;
      recommendation: string;
    }[];
  };
};

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const positions: { key: PhotoPosition; label: string; guide: string }[] = [
  { key: 'front', label: '正面', guide: '腕を自然に下ろして全身を撮影' },
  { key: 'side', label: '横', guide: '身体の真横から全身を撮影' },
  { key: 'back', label: '背面', guide: '背筋を伸ばして後ろから撮影' },
];

// ブラウザとiPhoneに合った形式で画像をFormDataへ追加する
async function appendPhotoToFormData(
  formData: FormData,
  fieldName: string,
  imageUri: string,
  fileName: string,
) {
  if (Platform.OS === 'web') {
    const imageResponse =
      await fetch(imageUri);

    if (!imageResponse.ok) {
      throw new ApiError(
        '選択した画像を読み込めませんでした。',
      );
    }

    const imageBlob =
      await imageResponse.blob();

    formData.append(
      fieldName,
      imageBlob,
      fileName,
    );

    return;
  }

  formData.append(
    fieldName,
    {
      uri: imageUri,
      name: fileName,
      type: 'image/jpeg',
    } as unknown as Blob,
  );
}

export default function BodyAnalysisScreen() {
  const router = useRouter();
    // 身体画像を本人のデータとして送るためClerkトークンを取得する
  const { getToken } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const [photos, setPhotos] = useState<Record<PhotoPosition, string | null>>({ front: null, side: null, back: null });
  const [weightKg, setWeightKg] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>('input');
  const [error, setError] = useState('');
  // APIから返った分析結果を画面表示用に保存する
  const [analysisResult, setAnalysisResult] =
  useState<BodyAnalysisApiResponse | null>(
    null,
  );

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

  // 3枚の身体画像を認証付きでバックエンドへ送信する
async function beginAnalysis() {
  const frontImage = photos.front;
  const sideImage = photos.side;
  const backImage = photos.back;

  if (
    !frontImage ||
    !sideImage ||
    !backImage
  ) {
    setError(
      '正面・横・背面の3枚を設定してください。',
    );
    return;
  }

  if (
    weightKg &&
    (
      Number(weightKg) < 30 ||
      Number(weightKg) > 300
    )
  ) {
    setError(
      '体重を30〜300kgで入力してください。',
    );
    return;
  }

  setError('');
  setAnalysisResult(null);
  setStatus('loading');

  try {
    const token = await getToken();

    if (!token) {
      throw new ApiError(
        'ログイン情報を確認できませんでした。',
        401,
      );
    }

    // TypeScriptバックエンドへ送る3枚入りの荷物を作る
    const formData = new FormData();

    await appendPhotoToFormData(
      formData,
      'front_image',
      frontImage,
      'front.jpg',
    );

    await appendPhotoToFormData(
      formData,
      'side_image',
      sideImage,
      'side.jpg',
    );

    await appendPhotoToFormData(
      formData,
      'back_image',
      backImage,
      'back.jpg',
    );

    const result =
      await apiUploadRequest<BodyAnalysisApiResponse>(
        '/api/body-analysis',
        token,
        formData,
      );

    setAnalysisResult(result);
    setStatus('result');
  } catch (caughtError) {
    setStatus('input');

    setError(
      caughtError instanceof Error
        ? caughtError.message
        : '身体分析に失敗しました。',
    );
  }
}

  if (status === 'loading') {
    return <View style={styles.screen}><SafeAreaView edges={['top', 'bottom']} style={styles.loadingArea}><ActivityIndicator color="#F6D365" size="large" /><Text style={styles.loadingTitle}>身体を分析しています</Text><Text style={styles.loadingText}>写真とこれまでの記録を照らし合わせています…</Text></SafeAreaView></View>;
  }

  // APIから分析結果が返った場合だけ結果画面を表示する
if (
  status === 'result' &&
  analysisResult
) {
  return (
    <View style={styles.screen}>
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.safeArea}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.completeEyebrow}>
            ANALYSIS COMPLETE
          </Text>

          <Text style={styles.resultTitle}>
            身体分析が完了しました
          </Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultNumber}>
              01
            </Text>

            <Text style={styles.resultLabel}>
              分析結果
            </Text>

            <Text style={styles.resultText}>
              {analysisResult.analysis.summary}
            </Text>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultNumber}>
              02
            </Text>

            <Text style={styles.resultLabel}>
              理想体型との差
            </Text>

            <Text style={styles.resultText}>
              {
                analysisResult.analysis
                  .goal_difference
              }
            </Text>
          </View>

          {analysisResult.analysis.areas.map(
            (area, index) => (
              <View
                key={`${area.body_part}-${index}`}
                style={styles.resultCard}
              >
                <Text style={styles.resultNumber}>
                  {String(index + 3).padStart(
                    2,
                    '0',
                  )}
                </Text>

                <Text style={styles.resultLabel}>
                  {area.body_part}
                  {'　'}
                  {area.score}/10
                </Text>

                <Text style={styles.resultText}>
                  {area.observation}
                </Text>

                <Text style={styles.resultText}>
                  おすすめ：
                  {area.recommendation}
                </Text>
              </View>
            ),
          )}

          <Pressable
            onPress={() =>
              router.replace(
                '/analysis-history',
              )
            }
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>
              分析履歴へ
            </Text>

            <Text style={styles.primaryArrow}>
              ›
            </Text>
          </Pressable>

          <Text style={styles.previewNote}>
            分析結果は保存済みです。身体写真自体は現在保存していません。
          </Text>
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
  screen: { flex: 1, backgroundColor: '#0A0A0A' }, safeArea: { flex: 1 }, content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32 }, header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: '#303030', borderRadius: 13 }, backText: { color: '#F4F6F3', fontSize: 30, lineHeight: 32 }, eyebrow: { color: '#FFF1B8', fontSize: 8, fontWeight: '700', letterSpacing: 1.4 }, title: { marginTop: 3, color: '#F4F6F3', fontSize: 25, fontWeight: '700' }, lead: { marginTop: 15, color: '#8E978F', fontSize: 12, lineHeight: 19 },
  photoGrid: { gap: 12, marginTop: 18 }, photoCard: { padding: 12, borderWidth: 1, borderColor: '#303030', borderRadius: 17, backgroundColor: '#151515' }, photo: { width: '100%', height: 260, borderRadius: 13, backgroundColor: '#0A0A0A' }, photoPlaceholder: { height: 150, alignItems: 'center', justifyContent: 'center', padding: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: '#3A403B', borderRadius: 13, backgroundColor: '#0A0A0A' }, positionLabel: { color: '#F4F6F3', fontSize: 18, fontWeight: '700' }, guideText: { marginTop: 8, color: '#697169', fontSize: 10, textAlign: 'center' }, photoActions: { flexDirection: 'row', gap: 8, marginTop: 10 }, photoButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: '#F6D365', borderRadius: 11 }, photoButtonText: { color: '#FFF1B8', fontSize: 11, fontWeight: '700' }, removeText: { marginTop: 9, color: '#FF8D98', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  weightCard: { marginTop: 13, padding: 16, borderWidth: 1, borderColor: '#303030', borderRadius: 17, backgroundColor: '#151515' }, cardTitle: { color: '#F4F6F3', fontSize: 14, fontWeight: '700' }, optional: { color: '#697169', fontSize: 9 }, weightInputWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', marginTop: 11, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 12, backgroundColor: '#0A0A0A' }, weightInput: { flex: 1, paddingHorizontal: 13, color: '#F4F6F3', fontSize: 15, fontWeight: '600' }, unit: { paddingRight: 13, color: '#737B75', fontSize: 10 },
  notice: { marginTop: 13, padding: 14, borderRadius: 14, backgroundColor: '#222222' }, noticeTitle: { color: '#FFF1B8', fontSize: 10, fontWeight: '700' }, noticeText: { marginTop: 6, color: '#8E978F', fontSize: 9, lineHeight: 15 }, error: { marginTop: 12, color: '#FF7676', fontSize: 11, lineHeight: 17 }, primaryButton: { minHeight: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingHorizontal: 17, borderRadius: 15, backgroundColor: '#F6D365' }, primaryText: { color: '#0A0A0A', fontSize: 14, fontWeight: '700' }, primaryArrow: { color: '#0A0A0A', fontSize: 27 },
  loadingArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, loadingTitle: { marginTop: 21, color: '#F4F6F3', fontSize: 22, fontWeight: '700' }, loadingText: { marginTop: 9, color: '#737B75', fontSize: 11, textAlign: 'center' }, completeEyebrow: { marginTop: 14, color: '#FFF1B8', fontSize: 9, fontWeight: '700', letterSpacing: 1.4 }, resultTitle: { marginTop: 7, color: '#F4F6F3', fontSize: 27, fontWeight: '700' }, resultCard: { marginTop: 13, padding: 17, borderWidth: 1, borderColor: '#303030', borderRadius: 17, backgroundColor: '#151515' }, resultNumber: { color: '#FFF1B8', fontSize: 9, fontWeight: '700' }, resultLabel: { marginTop: 6, color: '#F4F6F3', fontSize: 15, fontWeight: '700' }, resultText: { marginTop: 8, color: '#A5ADA7', fontSize: 11, lineHeight: 18 }, focusRow: { flexDirection: 'row', gap: 7, marginTop: 9 }, focusChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#332B00' }, focusText: { color: '#FFF1B8', fontSize: 10, fontWeight: '700' }, previewNote: { marginTop: 13, color: '#59605A', fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
