import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfigurationRequiredScreen } from '@/components/ConfigurationRequiredScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { TrainingDraftProvider } from '@/contexts/TrainingDraftContext';
import { TrainingHistoryProvider } from '@/contexts/TrainingHistoryContext';
import { WeightHistoryProvider } from '@/contexts/WeightHistoryContext';
import { ChatHistoryProvider } from '@/contexts/ChatHistoryContext';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const musclePasTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#F6D365',
    background: '#0A0A0A',
    card: '#141715',
    text: '#F4F6F3',
    border: '#303030',
    notification: '#F6D365',
  },
};

export default function RootLayout() {
  if (!publishableKey) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ConfigurationRequiredScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <ThemeProvider value={musclePasTheme}>
          <StatusBar style="light" />
          <OnboardingProvider>
            <TrainingDraftProvider>
              <TrainingHistoryProvider>
                <WeightHistoryProvider>
                  <ChatHistoryProvider>
                    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }} />
                  </ChatHistoryProvider>
                </WeightHistoryProvider>
              </TrainingHistoryProvider>
            </TrainingDraftProvider>
          </OnboardingProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
