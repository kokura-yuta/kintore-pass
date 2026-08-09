import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const musclePasTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#B6F24B',
    background: '#0B0D0C',
    card: '#141715',
    text: '#F4F6F3',
    border: '#2C312D',
    notification: '#B6F24B',
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={musclePasTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0D0C' } }} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
