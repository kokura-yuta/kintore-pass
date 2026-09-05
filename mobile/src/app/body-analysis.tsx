import { useAuth } from '@clerk/expo';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
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
import { ScreenStateCard } from '@/components/ScreenStateCard';
import {
  ApiError,
  apiUploadRequest,
} from '@/lib/api';
import { completeOnboarding } from '@/lib/onboarding';


type PhotoPosition = 'front' | 'side' | 'back';
type AnalysisStatus = 'input' | 'loading' | 'result';
type SelectedPhoto = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  width: number;
  height: number;
};

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
  photo: SelectedPhoto,
) {
  if (Platform.OS === 'web') {
    const imageResponse =
      await fetch(photo.uri);

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
      photo.fileName,
    );

    return;
  }

  formData.append(
    fieldName,
    {
      uri: photo.uri,
      name: photo.fileName,
      type: photo.mimeType,
    } as unknown as Blob,
  );
}

export default function BodyAnalysisScreen() {
  const router = useRouter();
  const { initial } = useLocalSearchParams<{
    initial?: string;
  }>();
  const isInitialAnalysis =
    initial === 'true';
    // 身体画像を本人のデータとして送るためClerkトークンを取得する
  const { getToken } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const [photos, setPhotos] = useState<Record<PhotoPosition, SelectedPhoto | null>>({ front: null, side: null, back: null });
  const [selectingPosition, setSelectingPosition] = useState<PhotoPosition | null>(null);
  const [weightKg, setWeightKg] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>('input');
  const [error, setError] = useState('');
  const [isCompleting, setIsCompleting] =
    useState(false);
  // APIから返った分析結果を画面表示用に保存する
  const [analysisResult, setAnalysisResult] =
  useState<BodyAnalysisApiResponse | null>(
    null,
  );
  const selectedPhotoCount = Object.values(photos).filter(Boolean).length;
  const hasAllPhotos = selectedPhotoCount === positions.length;

  async function selectPhoto(position: PhotoPosition, source: 'camera' | 'library') {
    if (selectingPosition) return;
    setError('');
    setSelectingPosition(position);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('撮影するには端末の設定でカメラへのアクセスを許可してください。');
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('写真を選ぶには端末の設定で写真へのアクセスを許可してください。');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        selectionLimit: 1,
        cameraType: ImagePicker.CameraType.back,
      };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) {
        setError('画像を読み込めませんでした。もう一度お試しください。');
        return;
      }
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
        setError('画像は1枚8MB以下のものを選んでください。');
        return;
      }
      if (asset.mimeType && !asset.mimeType.startsWith('image/')) {
        setError('JPG・PNG・HEICなどの画像ファイルを選んでください。');
        return;
      }
      const fallbackExtension = asset.mimeType?.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      setPhotos((current) => ({
        ...current,
        [position]: {
          uri: asset.uri,
          fileName: asset.fileName || `${position}.${fallbackExtension}`,
          mimeType: asset.mimeType || 'image/jpeg',
          fileSize: asset.fileSize ?? null,
          width: asset.width,
          height: asset.height,
        },
      }));
    } catch {
      setError(source === 'camera' ? 'カメラを起動できませんでした。' : '写真を読み込めませんでした。');
    } finally {
      setSelectingPosition(null);
    }
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
    );

    await appendPhotoToFormData(
      formData,
      'side_image',
      sideImage,
    );

    await appendPhotoToFormData(
      formData,
      'back_image',
      backImage,
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

// 初回分析なら完了状態を保存し、定期分析なら履歴へ移動する
async function finishAnalysis() {
  if (!isInitialAnalysis) {
    router.replace('/analysis-history');
    return;
  }

  setError('');
  setIsCompleting(true);

  try {
    const token = await getToken();

    if (!token) {
      throw new ApiError(
        'ログイン情報を確認できませんでした。',
        401,
      );
    }

    await completeOnboarding(token);
    router.replace('/home');
  } catch (caughtError) {
    setError(
      caughtError instanceof Error
        ? caughtError.message
        : '初回設定を完了できませんでした。',
    );
  } finally {
    setIsCompleting(false);
  }
}

  if (status === 'loading') {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.stateArea}>
          <ScreenStateCard
            message="写真とこれまでの記録を照らし合わせています。この処理には時間がかかる場合があります。"
            title="身体を分析しています"
            type="loading"
          />
        </SafeAreaView>
      </View>
    );
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

          {error ? (
            <Text style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: isCompleting, disabled: isCompleting }}
            disabled={isCompleting}
            onPress={finishAnalysis}
            style={[
              styles.primaryButton,
              isCompleting && { opacity: 0.5 },
            ]}
          >
            {isCompleting ? (
              <ActivityIndicator color="#050A0F" />
            ) : (
              <Text style={styles.primaryText}>
                {isInitialAnalysis
                  ? '初回設定を完了してホームへ'
                  : '分析履歴へ'}
              </Text>
            )}

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
          <View style={styles.header}><Pressable accessibilityLabel="分析履歴へ戻る" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable><View><Text style={styles.eyebrow}>BODY ANALYSIS</Text><Text style={styles.title}>身体写真を設定</Text></View></View>
          <Text style={styles.lead}>正面・横・背面の3枚を、できるだけ同じ場所と明るさで撮影してください。</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>写真の準備状況</Text>
            <Text style={[styles.progressCount, hasAllPhotos && styles.progressComplete]}>{selectedPhotoCount}/3枚</Text>
          </View>

          <View style={styles.photoGrid}>
            {positions.map((position) => (
              <View key={position.key} style={[styles.photoCard, photos[position.key] && styles.photoCardReady]}>
                <View style={styles.photoHeading}>
                  <Text style={styles.photoHeadingLabel}>{position.label}</Text>
                  <Text style={photos[position.key] ? styles.readyText : styles.notReadyText}>{photos[position.key] ? '✓ 準備完了' : '未設定'}</Text>
                </View>
                {photos[position.key] ? <Image alt={`${position.label}から撮影した身体写真`} contentFit="cover" source={{ uri: photos[position.key]!.uri }} style={styles.photo} /> : <View style={styles.photoPlaceholder}><Text style={styles.positionLabel}>{position.label}</Text><Text style={styles.guideText}>{position.guide}</Text></View>}
                <View style={styles.photoActions}>
                  <Pressable accessibilityLabel={`${position.label}の写真をカメラで${photos[position.key] ? '撮り直す' : '撮影する'}`} accessibilityRole="button" accessibilityState={{ disabled: Boolean(selectingPosition) }} disabled={Boolean(selectingPosition)} onPress={() => selectPhoto(position.key, 'camera')} style={styles.photoButton}><Text style={styles.photoButtonText}>{photos[position.key] ? '撮り直す' : 'カメラで撮影'}</Text></Pressable>
                  <Pressable accessibilityLabel={`${position.label}の写真をライブラリから${photos[position.key] ? '選び直す' : '選ぶ'}`} accessibilityRole="button" accessibilityState={{ disabled: Boolean(selectingPosition) }} disabled={Boolean(selectingPosition)} onPress={() => selectPhoto(position.key, 'library')} style={styles.photoButton}><Text style={styles.photoButtonText}>{photos[position.key] ? '選び直す' : '写真から選ぶ'}</Text></Pressable>
                </View>
                {selectingPosition === position.key ? <View style={styles.selectingRow}><ActivityIndicator color="#00D4FF" size="small" /><Text style={styles.selectingText}>写真を開いています…</Text></View> : null}
                {photos[position.key] ? <Pressable accessibilityLabel={`${position.label}の写真を削除`} accessibilityRole="button" accessibilityState={{ disabled: Boolean(selectingPosition) }} disabled={Boolean(selectingPosition)} onPress={() => setPhotos((current) => ({ ...current, [position.key]: null }))}><Text style={styles.removeText}>この写真を削除</Text></Pressable> : null}
              </View>
            ))}
          </View>

          <View style={styles.weightCard}><Text style={styles.cardTitle}>現在の体重 <Text style={styles.optional}>任意</Text></Text><View style={styles.weightInputWrap}><TextInput accessibilityLabel="現在の体重（任意）" inputMode="decimal" keyboardType="decimal-pad" onChangeText={(text) => setWeightKg(text.replace(/[^0-9.]/g, ''))} placeholder="66.5" placeholderTextColor="#556772" style={styles.weightInput} value={weightKg} /><Text style={styles.unit}>kg</Text></View></View>
          <View style={styles.notice}><Text style={styles.noticeTitle}>写真について</Text><Text style={styles.noticeText}>身体写真は分析APIへの送信に使用します。現在の仕様では分析結果だけを保存し、選択した写真自体は保存しません。</Text></View>
          {error ? <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: !hasAllPhotos || Boolean(selectingPosition) }} disabled={!hasAllPhotos || Boolean(selectingPosition)} onPress={beginAnalysis} style={[styles.primaryButton, (!hasAllPhotos || Boolean(selectingPosition)) && styles.disabledButton]}><Text style={styles.primaryText}>{hasAllPhotos ? 'この写真で分析する' : `あと${3 - selectedPhotoCount}枚設定してください`}</Text><Text style={styles.primaryArrow}>›</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' }, safeArea: { flex: 1 }, content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32 }, header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: '#203441', borderRadius: 13 }, backText: { color: '#F4F6F3', fontSize: 30, lineHeight: 32 }, eyebrow: { color: '#73E7FF', fontSize: 8, fontWeight: '700', letterSpacing: 1.4 }, title: { marginTop: 3, color: '#F4F6F3', fontSize: 25, fontWeight: '700' }, lead: { marginTop: 15, color: '#8798A3', fontSize: 12, lineHeight: 19 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#203441', borderRadius: 13, backgroundColor: '#0C151D' }, progressLabel: { color: '#AAB7BF', fontSize: 11, fontWeight: '600' }, progressCount: { color: '#73E7FF', fontSize: 13, fontWeight: '800' }, progressComplete: { color: '#00D4FF' },
  photoGrid: { gap: 12, marginTop: 12 }, photoCard: { padding: 12, borderWidth: 1, borderColor: '#203441', borderRadius: 17, backgroundColor: '#0C151D' }, photoCardReady: { borderColor: '#256378' }, photoHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, photoHeadingLabel: { color: '#F4F6F3', fontSize: 14, fontWeight: '700' }, readyText: { color: '#00D4FF', fontSize: 10, fontWeight: '700' }, notReadyText: { color: '#657681', fontSize: 10 }, photo: { width: '100%', height: 260, borderRadius: 13, backgroundColor: '#050A0F' }, photoPlaceholder: { height: 150, alignItems: 'center', justifyContent: 'center', padding: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: '#29434E', borderRadius: 13, backgroundColor: '#050A0F' }, positionLabel: { color: '#F4F6F3', fontSize: 18, fontWeight: '700' }, guideText: { marginTop: 8, color: '#657681', fontSize: 10, textAlign: 'center' }, photoActions: { flexDirection: 'row', gap: 8, marginTop: 10 }, photoButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 1, borderColor: '#00D4FF', borderRadius: 11 }, photoButtonText: { color: '#73E7FF', fontSize: 11, fontWeight: '700', textAlign: 'center' }, selectingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 9 }, selectingText: { color: '#8798A3', fontSize: 10 }, removeText: { marginTop: 11, paddingVertical: 4, color: '#FF8D98', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  weightCard: { marginTop: 13, padding: 16, borderWidth: 1, borderColor: '#203441', borderRadius: 17, backgroundColor: '#0C151D' }, cardTitle: { color: '#F4F6F3', fontSize: 14, fontWeight: '700' }, optional: { color: '#657681', fontSize: 9 }, weightInputWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', marginTop: 11, borderWidth: 1, borderColor: '#294653', borderRadius: 12, backgroundColor: '#050A0F' }, weightInput: { flex: 1, paddingHorizontal: 13, color: '#F4F6F3', fontSize: 15, fontWeight: '600' }, unit: { paddingRight: 13, color: '#72828D', fontSize: 10 },
  notice: { marginTop: 13, padding: 14, borderRadius: 14, backgroundColor: '#101C25' }, noticeTitle: { color: '#73E7FF', fontSize: 10, fontWeight: '700' }, noticeText: { marginTop: 6, color: '#8798A3', fontSize: 9, lineHeight: 15 }, error: { marginTop: 12, color: '#FF7676', fontSize: 11, lineHeight: 17 }, primaryButton: { minHeight: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingHorizontal: 17, borderRadius: 15, backgroundColor: '#00D4FF' }, disabledButton: { opacity: 0.4 }, primaryText: { color: '#050A0F', fontSize: 14, fontWeight: '700' }, primaryArrow: { color: '#050A0F', fontSize: 27 },
  stateArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 18 }, completeEyebrow: { marginTop: 14, color: '#73E7FF', fontSize: 9, fontWeight: '700', letterSpacing: 1.4 }, resultTitle: { marginTop: 7, color: '#F4F6F3', fontSize: 27, fontWeight: '700' }, resultCard: { marginTop: 13, padding: 17, borderWidth: 1, borderColor: '#203441', borderRadius: 17, backgroundColor: '#0C151D' }, resultNumber: { color: '#73E7FF', fontSize: 9, fontWeight: '700' }, resultLabel: { marginTop: 6, color: '#F4F6F3', fontSize: 15, fontWeight: '700' }, resultText: { marginTop: 8, color: '#AAB7BF', fontSize: 11, lineHeight: 18 }, focusRow: { flexDirection: 'row', gap: 7, marginTop: 9 }, focusChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#052C3A' }, focusText: { color: '#73E7FF', fontSize: 10, fontWeight: '700' }, previewNote: { marginTop: 13, color: '#556772', fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
