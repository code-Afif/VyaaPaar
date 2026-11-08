import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { ScreenHeader } from '@/components/ui';
import { useLanguage } from '@/context/LanguageContext';

export default function AccountScreenPlaceholder() {
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={t('tabs.account')} />
      <View style={styles.container}>
        <Text style={styles.text}>{t('account.comingSoon')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.lg,
  },
  text: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.onSurfaceVariant,
  },
});
