import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { Theme } from '@/theme';

export default function NotFoundScreen() {
  const { t } = useLanguage();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('notFound.title')}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('notFound.link')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.xl,
    backgroundColor: Theme.colors.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.onSurface,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: Theme.colors.secondary,
  },
});
