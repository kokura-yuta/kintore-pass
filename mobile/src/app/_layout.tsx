import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
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
    primary: '#00D4FF',
    background: '#050A0F',
    card: '#0C151D',
    text: '#F4F6F3',
    border: '#203441',
    notification: '#00D4FF',
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
          <UserScopedApp />
        </ThemeProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}

function UserScopedApp() {
  const { userId } = useAuth({ treatPendingAsSignedOut: false });
  return <UserDataProviders key={userId ?? 'signed-out'} />;
}

function UserDataProviders() {
  return (
    <OnboardingProvider>
      <TrainingDraftProvider>
        <TrainingHistoryProvider>
          <WeightHistoryProvider>
            <ChatHistoryProvider>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#050A0F' } }} />
            </ChatHistoryProvider>
          </WeightHistoryProvider>
        </TrainingHistoryProvider>
      </TrainingDraftProvider>
    </OnboardingProvider>
  );
}
