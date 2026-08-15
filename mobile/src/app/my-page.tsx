import { useUser } from '@clerk/expo';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/BottomNavigation';
import { ProfileNumberField } from '@/components/ProfileNumberField';
import { type ProfileDraft, type TrainingLocation, type TrainingStyle, useOnboarding } from '@/contexts/OnboardingContext';
import { getGoalBodyLabel } from '@/lib/initialAnalysisPreview';

const locations: { value: TrainingLocation; label: string }[] = [
  { value: 'home', label: '自宅' },
  { value: 'gym', label: 'ジム' },
  { value: 'both', label: '両方' },
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

export default function MyPageScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { goalBody, profile, setProfile } = useOnboarding();
  const [form, setForm] = useState<ProfileDraft>(profile);
  const [errors, setErrors] = useState<Errors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  function updateField<K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setSavedMessage('');
    if (field === 'heightCm' || field === 'weightKg' || field === 'bodyFatPercentage') {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
    if (field === 'trainingStyle') setErrors((current) => ({ ...current, trainingStyle: undefined }));
  }

  function toggleWeakPart(bodyPart: string) {
    updateField('weakBodyParts', form.weakBodyParts.includes(bodyPart)
      ? form.weakBodyParts.filter((part) => part !== bodyPart)
      : [...form.weakBodyParts, bodyPart]);
  }

  async function saveProfile() {
    const nextErrors: Errors = {};
    const height = Number(form.heightCm);
    const weight = Number(form.weightKg);
    const bodyFat = Number(form.bodyFatPercentage);

    if (!form.heightCm) nextErrors.heightCm = '身長を入力してください。';
    else if (height < 100 || height > 250) nextErrors.heightCm = '100〜250cmで入力してください。';
    if (!form.weightKg) nextErrors.weightKg = '体重を入力してください。';
    else if (weight < 30 || weight > 300) nextErrors.weightKg = '30〜300kgで入力してください。';
    if (form.bodyFatPercentage && (bodyFat < 2 || bodyFat > 70)) nextErrors.bodyFatPercentage = '2〜70%で入力してください。';
    if (!form.trainingStyle) nextErrors.trainingStyle = 'トレーニング形式を選択してください。';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setProfile(form);
    setIsSaving(false);
    setSavedMessage('プロフィールを保存しました。');
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>MY PAGE</Text>
            <Text style={styles.title}>マイページ</Text>
            <Text style={styles.account}>{user?.primaryEmailAddress?.emailAddress ?? 'ログイン中のユーザー'}</Text>

            <View style={styles.shortcutRow}>
              <ShortcutCard label="体重記録" onPress={() => router.push('/weight-history' as Href)} value="推移を見る" />
              <ShortcutCard label="カレンダー" onPress={() => router.push('/calendar' as Href)} value="記録を見る" />
              <ShortcutCard label="分析履歴" onPress={() => router.push('/analysis-history' as Href)} value="結果を見る" />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <View>
                  <Text style={styles.cardTitle}>目標体型</Text>
                  <Text style={styles.goalValue}>{getGoalBodyLabel(goalBody)}</Text>
                </View>
                <Pressable onPress={() => router.push('/ideal-body' as Href)} style={styles.outlineButton}>
                  <Text style={styles.outlineButtonText}>変更</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>身体データ</Text>
              <View style={styles.measurementRow}>
                <ProfileNumberField error={errors.heightCm} label="身長" onChangeText={(value) => updateField('heightCm', value)} placeholder="170" required unit="cm" value={form.heightCm} />
                <ProfileNumberField error={errors.weightKg} label="体重" onChangeText={(value) => updateField('weightKg', value)} placeholder="65" required unit="kg" value={form.weightKg} />
              </View>
              <View style={styles.singleField}>
                <ProfileNumberField error={errors.bodyFatPercentage} label="体脂肪率" onChangeText={(value) => updateField('bodyFatPercentage', value)} placeholder="分からなければ空欄" unit="%" value={form.bodyFatPercentage} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>トレーニング設定</Text>
              <OptionTitle label="場所" optional />
              <View style={styles.chipRow}>
                {locations.map((location) => <OptionChip key={location.value} label={location.label} onPress={() => updateField('trainingLocation', location.value)} selected={form.trainingLocation === location.value} />)}
              </View>

              <OptionTitle label="トレーニング形式" />
              <View style={styles.chipRow}>
                {trainingStyleOptions.map((style) => <OptionChip key={style.value} label={style.label} onPress={() => updateField('trainingStyle', style.value)} selected={form.trainingStyle === style.value} />)}
              </View>
              {errors.trainingStyle ? <Text style={styles.fieldError}>{errors.trainingStyle}</Text> : null}

              <OptionTitle label="週にできる回数" optional />
              <View style={styles.chipRow}>
                {weeklyOptions.map((days) => <OptionChip key={days} label={`${days}回`} onPress={() => updateField('weeklyTrainingDays', days)} selected={form.weeklyTrainingDays === days} />)}
              </View>

              <OptionTitle label="1回に使える時間" optional />
              <View style={styles.chipRow}>
                {minuteOptions.map((minutes) => <OptionChip key={minutes} label={`${minutes}分`} onPress={() => updateField('availableMinutes', minutes)} selected={form.availableMinutes === minutes} />)}
              </View>

              <OptionTitle label="苦手な部位" optional />
              <View style={styles.chipRow}>
                {weakPartOptions.map((part) => <OptionChip key={part} label={part} onPress={() => toggleWeakPart(part)} selected={form.weakBodyParts.includes(part)} />)}
              </View>
            </View>

            {savedMessage ? <Text style={styles.success}>{savedMessage}</Text> : null}
            <Pressable disabled={isSaving} onPress={saveProfile} style={[styles.saveButton, isSaving && styles.disabledButton]}>
              {isSaving ? <ActivityIndicator color="#0A0A0A" /> : <Text style={styles.saveText}>プロフィールを保存</Text>}
            </Pressable>
            <Text style={styles.previewNote}>現在はフロントエンド内の仮保存です。プロフィールAPI接続後にサーバー保存へ切り替えます。</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <BottomNavigation />
    </View>
  );
}

function ShortcutCard({ label, onPress, value }: { label: string; onPress?: () => void; value: string }) {
  return <Pressable disabled={!onPress} onPress={onPress} style={styles.shortcutCard}><Text style={styles.shortcutLabel}>{label}</Text><Text style={[styles.shortcutValue, onPress && styles.activeShortcut]}>{value}</Text></Pressable>;
}

function OptionTitle({ label, optional }: { label: string; optional?: boolean }) {
  return <Text style={styles.optionTitle}>{label} {optional ? <Text style={styles.optional}>任意</Text> : null}</Text>;
}

function OptionChip({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return <Pressable onPress={onPress} style={[styles.chip, selected && styles.selectedChip]}><Text style={[styles.chipText, selected && styles.selectedChipText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 17, paddingBottom: 30 },
  eyebrow: { color: '#FFF1B8', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  title: { fontFamily: 'Yu Mincho', marginTop: 5, color: '#F4F6F3', fontSize: 29, fontWeight: '700' },
  account: { marginTop: 6, color: '#737B75', fontSize: 11 },
  shortcutRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  shortcutCard: { flex: 1, minHeight: 72, padding: 11, borderWidth: 1, borderColor: '#303030', borderRadius: 14, backgroundColor: '#151515' },
  shortcutLabel: { color: '#E8EBE8', fontSize: 11, fontWeight: '700' },
  shortcutValue: { marginTop: 9, color: '#697169', fontSize: 8, fontWeight: '600' },
  activeShortcut: { color: '#FFF1B8' },
  card: { marginTop: 13, padding: 16, borderWidth: 1, borderColor: '#303030', borderRadius: 17, backgroundColor: '#151515' },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: 'Yu Mincho', color: '#F4F6F3', fontSize: 16, fontWeight: '700' },
  goalValue: { marginTop: 6, color: '#FFF1B8', fontSize: 14, fontWeight: '700' },
  outlineButton: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: '#F6D365', borderRadius: 11 },
  outlineButtonText: { color: '#FFF1B8', fontSize: 11, fontWeight: '700' },
  measurementRow: { flexDirection: 'row', gap: 10, marginTop: 17 },
  singleField: { marginTop: 17 },
  optionTitle: { marginTop: 20, color: '#C9CECA', fontSize: 11, fontWeight: '600' },
  optional: { color: '#697169', fontSize: 9 },
  fieldError: { marginTop: 7, color: '#FF7676', fontSize: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 },
  chip: { minWidth: 55, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 20, backgroundColor: '#0A0A0A' },
  selectedChip: { borderColor: '#F6D365', backgroundColor: '#F6D365' },
  chipText: { color: '#A5ADA7', fontSize: 11, fontWeight: '600' },
  selectedChipText: { color: '#0A0A0A' },
  success: { marginTop: 13, color: '#FFF1B8', fontSize: 12, fontWeight: '600' },
  saveButton: { minHeight: 55, alignItems: 'center', justifyContent: 'center', marginTop: 14, borderRadius: 15, backgroundColor: '#F6D365' },
  disabledButton: { opacity: 0.5 },
  saveText: { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  previewNote: { marginTop: 12, color: '#59605A', fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
