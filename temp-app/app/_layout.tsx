import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { AppProvider } from '@/context/AppContext';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { Theme } from '@/theme';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const DukaanTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Theme.colors.primary,
    background: Theme.colors.surface,
    card: Theme.colors.surfaceCard,
    text: Theme.colors.onSurface,
    border: Theme.colors.hairline,
  },
};

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { isLoadingLanguage, hasLanguagePreference } = useLanguage();

  useEffect(() => {
    if (isLoadingLanguage) return;

    const inLanguageScreen = segments[0] === 'language';

    if (!hasLanguagePreference && !inLanguageScreen) {
      router.replace('/language');
    }
  }, [isLoadingLanguage, hasLanguagePreference, segments]);

  if (isLoadingLanguage) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="language"
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="customer/[id]"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="customer/new"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="payment/[id]"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="voice"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="auth"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <LanguageProvider>
      <AppProvider>
        <ThemeProvider value={DukaanTheme}>
          <StatusBar style="dark" />
          <RootNavigator />
        </ThemeProvider>
      </AppProvider>
    </LanguageProvider>
  );
}
