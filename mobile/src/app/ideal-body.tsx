import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BodyTypeCard } from '@/components/BodyTypeCard';
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

export type GoalBodySelection =
  | { kind: 'preset'; bodyTypeId: (typeof bodyTypes)[number]['id'] }
  | { kind: 'custom-image'; imageUri: string; fileName: string | null };

export default function IdealBodyScreen() {
  const router = useRouter();
  const [selection, setSelection] = useState<GoalBodySelection | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

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

  function continueToProfile() {
    if (!selection) {
      setErrorMessage('目標にする体型または参考画像を選んでください。');
      return;
    }

    // 保存API完成後、このselectionを送信してから身体情報入力へ進みます。
    router.push('/profile-setup');
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

          <Pressable onPress={continueToProfile} style={styles.continueButton}>
            <Text style={styles.continueText}>この目標で次へ</Text>
            <Text style={styles.continueArrow}>→</Text>
          </Pressable>
          <Text style={styles.note}>目標体型はあとからマイページで変更できます。</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0D0C' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 46 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#B6F24B', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  step: { color: '#737B75', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { marginTop: 24, color: '#F4F6F3', fontSize: 32, fontWeight: '900' },
  description: { marginTop: 9, color: '#9DA69F', fontSize: 14, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 24 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  divider: { height: 1, flex: 1, backgroundColor: '#2C312D' },
  dividerText: { color: '#737B75', fontSize: 12 },
  uploadPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#2C312D',
    borderRadius: 15,
    backgroundColor: '#151816',
  },
  uploadCopy: { flex: 1, paddingRight: 8 },
  uploadTitle: { color: '#F4F6F3', fontSize: 14, fontWeight: '800' },
  uploadHint: { marginTop: 5, color: '#737B75', fontSize: 11 },
  uploadButton: { paddingHorizontal: 12, paddingVertical: 10 },
  uploadButtonText: { color: '#B6F24B', fontSize: 13, fontWeight: '900' },
  previewArea: { marginTop: 14 },
  preview: {
    width: '100%',
    height: 280,
    borderWidth: 1,
    borderColor: '#2C312D',
    borderRadius: 15,
    backgroundColor: '#151816',
  },
  removeText: { marginTop: 12, color: '#FF8D98', fontSize: 13, fontWeight: '800' },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C312D',
    borderRadius: 15,
    backgroundColor: '#151816',
  },
  summaryLabel: { color: '#737B75', fontSize: 13 },
  summaryValue: { color: '#F4F6F3', fontSize: 13, fontWeight: '900' },
  error: { marginTop: 12, color: '#FF7676', fontSize: 13, lineHeight: 19 },
  continueButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: '#B6F24B',
  },
  continueText: { color: '#0B0D0C', fontSize: 15, fontWeight: '900' },
  continueArrow: { color: '#0B0D0C', fontSize: 20, fontWeight: '900' },
  note: { marginTop: 14, color: '#697169', fontSize: 11, textAlign: 'center' },
});
