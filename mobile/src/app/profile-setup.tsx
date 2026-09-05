import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileNumberField } from '@/components/ProfileNumberField';
import {
  type ProfileDraft,
  type TrainingLocation,
  type TrainingStyle,
  useOnboarding,
} from '@/contexts/OnboardingContext';
import { isApiBypassEnabled } from '@/lib/api';
import { saveUserProfile } from '@/lib/profiles';

const locations: { value: TrainingLocation; label: string; description: string }[] = [
  { value: 'home', label: '自宅', description: '自重・ダンベル中心' },
  { value: 'gym', label: 'ジム', description: 'マシン・器具を活用' },
  { value: 'both', label: '両方', description: '日によって使い分け' },
];

const weeklyOptions = [1, 2, 3, 4, 5, 6, 7];
const minuteOptions = [20, 30, 45, 60, 90, 120, 150, 180];
const weakPartOptions = ['胸', '背中', '肩', '腕', '脚', '腹筋'];
const trainingStyleOptions: { value: TrainingStyle; label: string }[] = [
  { value: 'full-body', label: '全身' },
  { value: 'split', label: '部位別' },
  { value: 'ai', label: 'AIにおまかせ' },
];

type Errors = Partial<Record<'heightCm' | 'weightKg' | 'bodyFatPercentage' | 'trainingStyle', string>>;

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { getToken } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const { profile: savedProfile, setProfile } = useOnboarding();
  const [form, setForm] = useState<ProfileDraft>(savedProfile);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] =
    useState('');
  const [isSaving, setIsSaving] =
    useState(false);

  function updateField<K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === 'heightCm' || field === 'weightKg' || field === 'bodyFatPercentage') {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
    if (field === 'trainingStyle') setErrors((current) => ({ ...current, trainingStyle: undefined }));
  }

  function toggleWeakPart(bodyPart: string) {
    updateField(
      'weakBodyParts',
      form.weakBodyParts.includes(bodyPart)
        ? form.weakBodyParts.filter((part) => part !== bodyPart)
        : [...form.weakBodyParts, bodyPart],
    );
  }

  async function continueToAnalysis() {
    const nextErrors: Errors = {};
    const height = Number(form.heightCm);
    const weight = Number(form.weightKg);
    const bodyFat = Number(form.bodyFatPercentage);

    if (!form.heightCm) nextErrors.heightCm = '身長を入力してください。';
    else if (height < 100 || height > 250) nextErrors.heightCm = '100〜250cmで入力してください。';

    if (!form.weightKg) nextErrors.weightKg = '体重を入力してください。';
    else if (weight < 30 || weight > 300) nextErrors.weightKg = '30〜300kgで入力してください。';

    if (form.bodyFatPercentage && (bodyFat < 2 || bodyFat > 70)) {
      nextErrors.bodyFatPercentage = '2〜70%で入力してください。';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitError('');
    setIsSaving(true);

    try {
      if (isApiBypassEnabled) {
        setProfile(form);
        router.push('/initial-analysis');
        return;
      }

      const token = await getToken();

      if (!token) {
        throw new Error(
          'ログイン状態を確認できませんでした。',
        );
      }

      // 身体プロフィールをバックエンド経由でNeonへ保存する
      await saveUserProfile(token, form);
      setProfile(form);
      router.push('/initial-analysis');
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : '身体情報を保存できませんでした。',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.safeArea}
        >
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.content}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.eyebrow}>FIRST SETUP</Text>
              <Text style={styles.step}>STEP 2 / 3</Text>
            </View>
            <Text style={styles.title}>身体情報</Text>
            <Text style={styles.lead}>あなたに合ったメニューを作るための基本情報です。</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>基本情報</Text>
              <View style={styles.measurementRow}>
                <ProfileNumberField
                  error={errors.heightCm}
                  label="身長"
                  onChangeText={(value) => updateField('heightCm', value)}
                  placeholder="170"
                  required
                  unit="cm"
                  value={form.heightCm}
                />
                <ProfileNumberField
                  error={errors.weightKg}
                  label="体重"
                  onChangeText={(value) => updateField('weightKg', value)}
                  placeholder="65"
                  required
                  unit="kg"
                  value={form.weightKg}
                />
              </View>
              <View style={styles.optionalField}>
                <ProfileNumberField
                  error={errors.bodyFatPercentage}
                  label="体脂肪率"
                  onChangeText={(value) => updateField('bodyFatPercentage', value)}
                  placeholder="分からなければ空欄でOK"
                  unit="%"
                  value={form.bodyFatPercentage}
                />
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeadingRow}>
                <View>
                  <Text style={styles.cardTitle}>トレーニング場所</Text>
                  <Text style={styles.cardHint}>普段利用する場所を選択</Text>
                </View>
                <Text style={styles.optionalBadge}>任意</Text>
              </View>
              <View style={styles.locationRow}>
                {locations.map((location) => {
                  const selected = form.trainingLocation === location.value;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={location.value}
                      onPress={() => updateField('trainingLocation', location.value)}
                      style={[styles.locationButton, selected && styles.selectedOption]}
                    >
                      <Text style={[styles.locationLabel, selected && styles.selectedOptionText]}>
                        {location.label}
                      </Text>
                      <Text style={[styles.locationDescription, selected && styles.selectedDescription]}>
                        {location.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeadingRow}>
                <View>
                  <Text style={styles.cardTitle}>トレーニング習慣</Text>
                  <Text style={styles.cardHint}>決まっていなければ空欄でOK</Text>
                </View>
                <Text style={styles.optionalBadge}>任意</Text>
              </View>

              <Text style={styles.optionLabel}>トレーニング形式 <Text style={styles.optionalBadge}>任意</Text></Text>
              <View style={styles.chipRow}>
                {trainingStyleOptions.map((style) => (
                  <Pressable key={style.value} onPress={() => updateField('trainingStyle', style.value)} style={[styles.chip, form.trainingStyle === style.value && styles.selectedChip]}>
                    <Text style={[styles.chipText, form.trainingStyle === style.value && styles.selectedChipText]}>{style.label}</Text>
                  </Pressable>
                ))}
              </View>
              {errors.trainingStyle ? <Text style={styles.fieldError}>{errors.trainingStyle}</Text> : null}

              <Text style={styles.optionLabel}>週にできる回数</Text>
              <View style={styles.chipRow}>
                {weeklyOptions.map((days) => (
                  <Pressable
                    key={days}
                    onPress={() => updateField('weeklyTrainingDays', days)}
                    style={[styles.chip, form.weeklyTrainingDays === days && styles.selectedChip]}
                  >
                    <Text style={[styles.chipText, form.weeklyTrainingDays === days && styles.selectedChipText]}>
                      {days}回
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.optionLabel, styles.sectionSpacing]}>1回に使える時間</Text>
              <View style={styles.chipRow}>
                {minuteOptions.map((minutes) => (
                  <Pressable
                    key={minutes}
                    onPress={() => updateField('availableMinutes', minutes)}
                    style={[styles.chip, form.availableMinutes === minutes && styles.selectedChip]}
                  >
                    <Text style={[styles.chipText, form.availableMinutes === minutes && styles.selectedChipText]}>
                      {minutes}分
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.optionLabel, styles.sectionSpacing]}>苦手な部位</Text>
              <View style={styles.chipRow}>
                {weakPartOptions.map((bodyPart) => {
                  const selected = form.weakBodyParts.includes(bodyPart);
                  return (
                    <Pressable
                      key={bodyPart}
                      onPress={() => toggleWeakPart(bodyPart)}
                      style={[styles.chip, selected && styles.selectedChip]}
                    >
                      <Text style={[styles.chipText, selected && styles.selectedChipText]}>{bodyPart}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {submitError ? <Text style={styles.fieldError}>{submitError}</Text> : null}
            <Pressable disabled={isSaving} onPress={continueToAnalysis} style={[styles.continueButton, isSaving && { opacity: 0.5 }]}>
              {isSaving ? <ActivityIndicator color="#050A0F" /> : <Text style={styles.continueText}>入力内容を保存して次へ</Text>}
              <Text style={styles.continueArrow}>→</Text>
            </Pressable>
            <Text style={styles.note}>入力内容はあとからマイページで変更できます。</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050A0F' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 46 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: '#73E7FF', fontSize: 11, fontWeight: '600', letterSpacing: 1.6 },
  step: { color: '#72828D', fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  title: { marginTop: 24, color: '#F4F6F3', fontSize: 32, fontWeight: '700' },
  lead: { marginTop: 9, marginBottom: 22, color: '#99AAB4', fontSize: 14, lineHeight: 21 },
  card: {
    marginBottom: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#203441',
    borderRadius: 17,
    backgroundColor: '#0C151D',
  },
  cardHeadingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: '#F4F6F3', fontSize: 16, fontWeight: '700' },
  cardHint: { marginTop: 4, color: '#72828D', fontSize: 11 },
  optionalBadge: { color: '#72828D', fontSize: 10, fontWeight: '600' },
  measurementRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  optionalField: { marginTop: 18 },
  locationRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  locationButton: {
    flex: 1,
    minHeight: 88,
    padding: 11,
    borderWidth: 1,
    borderColor: '#294653',
    borderRadius: 13,
    backgroundColor: '#050A0F',
  },
  selectedOption: { borderColor: '#00D4FF', backgroundColor: '#00D4FF' },
  locationLabel: { color: '#F4F6F3', fontSize: 14, fontWeight: '700' },
  locationDescription: { marginTop: 6, color: '#72828D', fontSize: 10, lineHeight: 15 },
  selectedOptionText: { color: '#050A0F' },
  selectedDescription: { color: '#3C433D' },
  optionLabel: { marginTop: 20, color: '#CDD7DD', fontSize: 12, fontWeight: '600' },
  requiredText: { color: '#73E7FF', fontSize: 9, fontWeight: '700' },
  fieldError: { marginTop: 7, color: '#FF7676', fontSize: 10 },
  sectionSpacing: { marginTop: 24 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    minWidth: 58,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#294653',
    borderRadius: 20,
    backgroundColor: '#050A0F',
  },
  selectedChip: { borderColor: '#00D4FF', backgroundColor: '#00D4FF' },
  chipText: { color: '#AAB7BF', fontSize: 12, fontWeight: '600' },
  selectedChipText: { color: '#050A0F' },
  continueButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: '#00D4FF',
  },
  continueText: { color: '#050A0F', fontSize: 15, fontWeight: '700' },
  continueArrow: { color: '#050A0F', fontSize: 20, fontWeight: '700' },
  note: { marginTop: 14, color: '#657681', fontSize: 11, textAlign: 'center' },
});
