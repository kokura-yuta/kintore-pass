import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOnboarding } from '@/contexts/OnboardingContext';
import { ApiError } from '@/lib/api';
import { getGoalBodyLabel } from '@/lib/initialAnalysisPreview';
import { completeOnboarding } from '@/lib/onboarding';

const locationLabels = {
  home: '自宅',
  gym: 'ジム',
  both: '両方',
} as const;

// 保存済みの初回設定を確認し、実際の身体写真分析へ案内する画面
export default function InitialAnalysisScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { goalBody, profile } =
    useOnboarding();
  const [isSkipping, setIsSkipping] =
    useState(false);
  const [skipError, setSkipError] =
    useState('');
  const hasRequiredProfile = Boolean(
    profile.heightCm &&
      profile.weightKg &&
      goalBody,
  );

  // 身体分析を行わず、保存済みの必須情報だけで初回設定を完了する
  async function skipBodyAnalysis() {
    setSkipError('');
    setIsSkipping(true);

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
    } catch (error) {
      setSkipError(
        error instanceof Error
          ? error.message
          : '初回設定を完了できませんでした。',
      );
    } finally {
      setIsSkipping(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView
        edges={['top']}
        style={styles.safeArea}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              FIRST SETUP
            </Text>
            <Text style={styles.step}>
              STEP 3 / 3
            </Text>
          </View>

          <Text style={styles.title}>
            初回分析
          </Text>
          <Text style={styles.lead}>
            保存した身体情報を確認し、正面・横・背面の写真から最初の身体分析を行います。
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>
              YOUR PROFILE
            </Text>
            <SummaryRow
              label="目標体型"
              value={getGoalBodyLabel(goalBody)}
            />
            <SummaryRow
              label="身長・体重"
              value={`${profile.heightCm || '—'}cm / ${profile.weightKg || '—'}kg`}
            />
            <SummaryRow
              label="トレーニング場所"
              value={
                profile.trainingLocation
                  ? locationLabels[
                      profile.trainingLocation
                    ]
                  : '未設定'
              }
            />
            <SummaryRow
              label="週の回数・時間"
              value={`${profile.weeklyTrainingDays ? `週${profile.weeklyTrainingDays}回` : '未設定'} / ${profile.availableMinutes ? `${profile.availableMinutes}分` : '未設定'}`}
            />
            <SummaryRow
              label="苦手な部位"
              value={
                profile.weakBodyParts.length
                  ? profile.weakBodyParts.join('・')
                  : '未設定'
              }
              withBorder={false}
            />
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>
              分析に必要な写真
            </Text>
            <Text style={styles.noticeText}>
              身体分析は任意です。今は行わず、ホームやマイページから後で分析することもできます。
            </Text>
          </View>

          {!hasRequiredProfile ? (
            <Text style={styles.error}>
              理想体型・身長・体重を入力してから分析してください。
            </Text>
          ) : null}

          {skipError ? (
            <Text style={styles.error}>
              {skipError}
            </Text>
          ) : null}

          <Pressable
            disabled={!hasRequiredProfile}
            onPress={() =>
              router.push({
                pathname: '/body-analysis',
                params: {
                  initial: 'true',
                },
              })
            }
            style={[
              styles.primaryButton,
              !hasRequiredProfile &&
                styles.disabledButton,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              身体写真を設定して分析する
            </Text>
            <Text style={styles.primaryArrow}>→</Text>
          </Pressable>

          <Pressable
            disabled={
              !hasRequiredProfile || isSkipping
            }
            onPress={() => void skipBodyAnalysis()}
            style={styles.textButton}
          >
            <Text style={styles.textButtonLabel}>
              {isSkipping
                ? '初回設定を完了しています…'
                : '今は分析せずホームへ進む'}
            </Text>
            {isSkipping ? (
              <ActivityIndicator
                color="#FFF1B8"
                size="small"
              />
            ) : null}
          </Pressable>

          <Pressable
            disabled={isSkipping}
            onPress={() => router.back()}
            style={styles.changeButton}
          >
            <Text style={styles.changeButtonLabel}>
              入力内容を変更する
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  withBorder = true,
}: {
  label: string;
  value: string;
  withBorder?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryRow,
        !withBorder && styles.lastSummaryRow,
      ]}
    >
      <Text style={styles.summaryLabel}>
        {label}
      </Text>
      <Text style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  safeArea: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 46 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: '#FFF1B8', fontSize: 11, fontWeight: '600', letterSpacing: 1.6 },
  step: { color: '#737B75', fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  title: { marginTop: 24, color: '#F4F6F3', fontSize: 31, fontWeight: '700' },
  lead: { marginTop: 10, color: '#9DA69F', fontSize: 14, lineHeight: 22 },
  card: { marginTop: 24, padding: 17, borderWidth: 1, borderColor: '#303030', borderRadius: 17, backgroundColor: '#151515' },
  cardEyebrow: { marginBottom: 6, color: '#FFF1B8', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#303030' },
  lastSummaryRow: { borderBottomWidth: 0, paddingBottom: 2 },
  summaryLabel: { color: '#737B75', fontSize: 12 },
  summaryValue: { flex: 1, color: '#F4F6F3', fontSize: 12, fontWeight: '600', textAlign: 'right' },
  noticeCard: { marginTop: 15, padding: 14, borderRadius: 13, backgroundColor: '#222222' },
  noticeTitle: { color: '#FFF1B8', fontSize: 11, fontWeight: '700' },
  noticeText: { marginTop: 5, color: '#899189', fontSize: 11, lineHeight: 17 },
  error: { marginTop: 12, color: '#FF7676', fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 18, borderRadius: 15, backgroundColor: '#F6D365' },
  disabledButton: { opacity: 0.4 },
  primaryButtonText: { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  primaryArrow: { color: '#0A0A0A', fontSize: 20, fontWeight: '700' },
  textButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 17 },
  textButtonLabel: { color: '#FFF1B8', fontSize: 13, fontWeight: '600' },
  changeButton: { alignItems: 'center', paddingVertical: 8 },
  changeButtonLabel: { color: '#737B75', fontSize: 12, fontWeight: '600' },
});
