import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
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
  const { profile: savedProfile, setProfile } = useOnboarding();
  const [form, setForm] = useState<ProfileDraft>(savedProfile);
  const [errors, setErrors] = useState<Errors>({});

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

  function continueToAnalysis() {
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
    if (!form.trainingStyle) nextErrors.trainingStyle = 'トレーニング形式を選択してください。';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setProfile(form);
    router.push('/initial-analysis');
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.safeArea}
        >
          <ScrollView
            contentContainerStyle={styles.content}
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

              <Text style={styles.optionLabel}>トレーニング形式 <Text style={styles.requiredText}>必須</Text></Text>
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

            <Pressable onPress={continueToAnalysis} style={styles.continueButton}>
              <Text style={styles.continueText}>入力内容を確認して次へ</Text>
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
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 46 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: '#FFF1B8', fontSize: 11, fontWeight: '600', letterSpacing: 1.6 },
  step: { color: '#737B75', fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  title: { fontFamily: 'Yu Mincho', marginTop: 24, color: '#F4F6F3', fontSize: 32, fontWeight: '700' },
  lead: { marginTop: 9, marginBottom: 22, color: '#9DA69F', fontSize: 14, lineHeight: 21 },
  card: {
    marginBottom: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 17,
    backgroundColor: '#151515',
  },
  cardHeadingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontFamily: 'Yu Mincho', color: '#F4F6F3', fontSize: 16, fontWeight: '700' },
  cardHint: { marginTop: 4, color: '#737B75', fontSize: 11 },
  optionalBadge: { color: '#737B75', fontSize: 10, fontWeight: '600' },
  measurementRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  optionalField: { marginTop: 18 },
  locationRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  locationButton: {
    flex: 1,
    minHeight: 88,
    padding: 11,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 13,
    backgroundColor: '#0A0A0A',
  },
  selectedOption: { borderColor: '#F6D365', backgroundColor: '#F6D365' },
  locationLabel: { color: '#F4F6F3', fontSize: 14, fontWeight: '700' },
  locationDescription: { marginTop: 6, color: '#737B75', fontSize: 10, lineHeight: 15 },
  selectedOptionText: { color: '#0A0A0A' },
  selectedDescription: { color: '#3C433D' },
  optionLabel: { marginTop: 20, color: '#C9CECA', fontSize: 12, fontWeight: '600' },
  requiredText: { color: '#FFF1B8', fontSize: 9, fontWeight: '700' },
  fieldError: { marginTop: 7, color: '#FF7676', fontSize: 10 },
  sectionSpacing: { marginTop: 24 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    minWidth: 58,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 20,
    backgroundColor: '#0A0A0A',
  },
  selectedChip: { borderColor: '#F6D365', backgroundColor: '#F6D365' },
  chipText: { color: '#A5ADA7', fontSize: 12, fontWeight: '600' },
  selectedChipText: { color: '#0A0A0A' },
  continueButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: '#F6D365',
  },
  continueText: { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  continueArrow: { color: '#0A0A0A', fontSize: 20, fontWeight: '700' },
  note: { marginTop: 14, color: '#697169', fontSize: 11, textAlign: 'center' },
});
