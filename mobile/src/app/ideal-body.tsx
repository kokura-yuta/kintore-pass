import { useAuth } from '@clerk/expo';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BodyTypeCard } from '@/components/BodyTypeCard';
import { type GoalBodySelection, useOnboarding } from '@/contexts/OnboardingContext';
import { isApiBypassEnabled } from '@/lib/api';
import { saveGoalBodyType } from '@/lib/goals';
import bulkUpImage from '../../assets/images/body-types/bulk-up.png';
import leanMuscleImage from '../../assets/images/body-types/lean-muscle.png';
import physiqueImage from '../../assets/images/body-types/physique.png';
import vShapeImage from '../../assets/images/body-types/v-shape.png';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const bodyTypes = [
  {
    id: 'lean-muscle',
    name: '細マッチョ',
    description: '体脂肪を抑えた、引き締まった体型',
    image: leanMuscleImage,
  },
  {
    id: 'v-shape',
    name: '逆三角形',
    description: '肩と背中が広く、ウエストが細い体型',
    image: vShapeImage,
  },
  {
    id: 'physique',
    name: 'フィジーク',
    description: '肩・胸・背中のバランスを重視した体型',
    image: physiqueImage,
  },
  {
    id: 'bulk-up',
    name: 'バルクアップ',
    description: '身体全体の筋肉量とサイズを重視した体型',
    image: bulkUpImage,
  },
] as const;

export default function IdealBodyScreen() {
  const router = useRouter();
    // Clerkからバックエンドへ送る認証トークンを取得する
  const { getToken } = useAuth();
  const { goalBody, setGoalBody } = useOnboarding();
  const [selection, setSelection] = useState<GoalBodySelection | null>(goalBody);
  const [errorMessage, setErrorMessage] = useState('');
    // 保存中の二重送信を防ぐための状態
  const [isSaving, setIsSaving] =
    useState(false);

  async function pickReferenceImage() {
    setErrorMessage('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('参考画像を選ぶには、写真へのアクセスを許可してください。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
      setErrorMessage('画像は5MB以下のものを選択してください。');
      return;
    }

    setSelection({ kind: 'custom-image', imageUri: asset.uri, fileName: asset.fileName ?? null });
  }

    // 選択した理想体型をNeonへ保存し、成功後に身体情報画面へ進む
  async function continueToProfile() {
    // 何も選ばれていなければ保存処理を開始しない
    if (!selection) {
      setErrorMessage(
        '目標にする体型または参考画像を選んでください。',
      );
      return;
    }

    // 参考画像は保存先を作成するまでNeon保存を行わない
    if (selection.kind === 'custom-image') {
      setErrorMessage(
        '参考画像の保存機能は現在準備中です。',
      );
      return;
    }

    // 選択されたIDと一致する理想体型の表示名を取得する
    const selectedBodyType =
      bodyTypes.find(
        (bodyType) =>
          bodyType.id ===
          selection.bodyTypeId,
      );

    // 一致する理想体型がなければ不正な選択として中止する
    if (!selectedBodyType) {
      setErrorMessage(
        '選択した理想体型を確認してください。',
      );
      return;
    }

    // 前回のエラーを消して保存中にする
    setErrorMessage('');
    setIsSaving(true);

    try {
      if (isApiBypassEnabled) {
        setGoalBody(selection);
        router.push('/profile-setup');
        return;
      }

      // Clerkから現在のログイン用トークンを取得する
      const token = await getToken();

      // トークンがなければ本人確認できないため保存しない
      if (!token) {
        setErrorMessage(
          'ログイン状態を確認できませんでした。',
        );
        return;
      }

      // バックエンド経由で選択した理想体型をNeonへ保存する
      await saveGoalBodyType(
        token,
        selectedBodyType.name,
      );

      // 通信中の画面表示にも選択内容を保持する
      setGoalBody(selection);

      // Neonへの保存成功後だけ身体情報入力画面へ進む
      router.push('/profile-setup');
    } catch (error) {
      // APIから返されたエラーを画面へ表示する
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '理想体型を保存できませんでした。',
      );
    } finally {
      // 成功・失敗に関係なく保存中の状態を解除する
      setIsSaving(false);
    }
  }

  const selectedLabel =
    selection?.kind === 'preset'
      ? bodyTypes.find((bodyType) => bodyType.id === selection.bodyTypeId)?.name
      : selection?.fileName || (selection ? 'アップロード画像' : '未選択');

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>FIRST SETUP</Text>
            <Text style={styles.step}>STEP 1 / 3</Text>
          </View>

          <Text style={styles.title}>理想の体を選ぶ</Text>
          <Text style={styles.description}>なりたい体に一番近いものを1つ選んでください。</Text>

          <View accessibilityRole="radiogroup" style={styles.grid}>
            {bodyTypes.map((bodyType) => (
              <BodyTypeCard
                key={bodyType.id}
                {...bodyType}
                isSelected={selection?.kind === 'preset' && selection.bodyTypeId === bodyType.id}
                onPress={() => {
                  setSelection({ kind: 'preset', bodyTypeId: bodyType.id });
                  setErrorMessage('');
                }}
              />
            ))}
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>または</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.uploadPanel}>
            <View style={styles.uploadCopy}>
              <Text style={styles.uploadTitle}>自分で参考画像を選ぶ</Text>
              <Text style={styles.uploadHint}>JPG・PNGなど、5MBまで</Text>
            </View>
            <Pressable onPress={pickReferenceImage} style={styles.uploadButton}>
              <Text style={styles.uploadButtonText}>画像を選択</Text>
            </Pressable>
          </View>

          {selection?.kind === 'custom-image' ? (
            <View style={styles.previewArea}>
              <Image
                alt="選択した目標体型の参考画像"
                contentFit="contain"
                source={{ uri: selection.imageUri }}
                style={styles.preview}
              />
              <Pressable onPress={() => setSelection(null)}>
                <Text style={styles.removeText}>画像を削除</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>現在の選択</Text>
            <Text style={styles.summaryValue}>{selectedLabel}</Text>
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <Pressable
            disabled={isSaving}
            onPress={continueToProfile}
            style={styles.continueButton}
          >
            <Text style={styles.continueText}>
              {isSaving
                ? '保存しています…'
                : 'この目標で次へ'}
            </Text>
            <Text style={styles.continueArrow}>
              →
            </Text>
          </Pressable>
          <Text style={styles.note}>目標体型はあとからマイページで変更できます。</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 46 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#FFF1B8', fontSize: 11, fontWeight: '600', letterSpacing: 1.6 },
  step: { color: '#737B75', fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  title: { marginTop: 24, color: '#F4F6F3', fontSize: 32, fontWeight: '700' },
  description: { marginTop: 9, color: '#9DA69F', fontSize: 14, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 24 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  divider: { height: 1, flex: 1, backgroundColor: '#303030' },
  dividerText: { color: '#737B75', fontSize: 12 },
  uploadPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 15,
    backgroundColor: '#151515',
  },
  uploadCopy: { flex: 1, paddingRight: 8 },
  uploadTitle: { color: '#F4F6F3', fontSize: 14, fontWeight: '600' },
  uploadHint: { marginTop: 5, color: '#737B75', fontSize: 11 },
  uploadButton: { paddingHorizontal: 12, paddingVertical: 10 },
  uploadButtonText: { color: '#FFF1B8', fontSize: 13, fontWeight: '700' },
  previewArea: { marginTop: 14 },
  preview: {
    width: '100%',
    height: 280,
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 15,
    backgroundColor: '#151515',
  },
  removeText: { marginTop: 12, color: '#FF8D98', fontSize: 13, fontWeight: '600' },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 15,
    backgroundColor: '#151515',
  },
  summaryLabel: { color: '#737B75', fontSize: 13 },
  summaryValue: { color: '#F4F6F3', fontSize: 13, fontWeight: '700' },
  error: { marginTop: 12, color: '#FF7676', fontSize: 13, lineHeight: 19 },
  continueButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: '#F6D365',
  },
  continueText: { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  continueArrow: { color: '#0A0A0A', fontSize: 20, fontWeight: '700' },
  note: { marginTop: 14, color: '#697169', fontSize: 11, textAlign: 'center' },
});
