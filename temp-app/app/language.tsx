import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { useLanguage } from '@/context/LanguageContext';
import { Language } from '@/i18n';

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  example: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    example: 'Clear, professional English for retail management',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    example: 'सरल और स्पष्ट हिंदी (देवनागरी लिपि)',
  },
  {
    code: 'hinglish',
    name: 'Hinglish',
    nativeName: 'Hinglish',
    example: 'Hindi in English letters (e.g. Udhaar, Khata, Jama)',
  },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { language, setLanguage, t } = useLanguage();

  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);

  const handleSelectLanguage = (code: Language) => {
    setSelectedLanguage(code);
  };

  const handleContinue = async () => {
    await setLanguage(selectedLanguage);

    if (from === 'settings') {
      router.back();
    } else {
      router.replace('/auth');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Bar if navigated from settings */}
      {from === 'settings' && (
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={10}
            accessibilityLabel="Go Back"
          >
            <Ionicons name="arrow-back" size={22} color={Theme.colors.onSurface} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t('settings.languageHeading')}</Text>
          <View style={{ width: 24 }} />
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Multilingual Heading */}
        <View style={styles.headerSection}>
          <Text style={styles.mainHeading}>
            Choose your language{'\n'}अपनी भाषा चुनें{'\n'}Apni bhasha chunein
          </Text>
          <Text style={styles.subHeading}>
            {t('languageScreen.subtitle')}
          </Text>
        </View>

        {/* Language Options List */}
        <View style={styles.optionsList}>
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = selectedLanguage === opt.code;

            return (
              <Pressable
                key={opt.code}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
                onPress={() => handleSelectLanguage(opt.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${opt.nativeName}: ${opt.example}`}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionNameRow}>
                    <Text
                      style={[
                        styles.nativeName,
                        isSelected && styles.textSelected,
                      ]}
                    >
                      {opt.nativeName}
                    </Text>
                    {opt.code !== 'en' && opt.code !== 'hi' && (
                      <View style={styles.pill}>
                        <Text style={styles.pillText}>Retail Mix</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.exampleText}>{opt.example}</Text>
                </View>

                <View
                  style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleSelected,
                  ]}
                >
                  {isSelected && (
                    <View style={styles.radioInnerCircle} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.continueButton}
          onPress={handleContinue}
          accessibilityLabel={t('languageScreen.continueBtn')}
        >
          <Text style={styles.continueButtonText}>
            {t('languageScreen.continueBtn')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={Theme.colors.onPrimary} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceCard,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.gutter,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surfaceCard,
  },
  backButton: {
    padding: 6,
  },
  topBarTitle: {
    ...Theme.typography.titleMd,
    color: Theme.colors.onSurface,
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  contentContainer: {
    paddingHorizontal: Theme.spacing.gutter,
    paddingTop: Theme.spacing.md,
    paddingBottom: 24,
  },
  headerSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  mainHeading: {
    ...Theme.typography.titleMd,
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.onSurface,
    lineHeight: 28,
  },
  subHeading: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 6,
    lineHeight: 18,
  },
  optionsList: {
    gap: 12,
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
  },
  optionCardSelected: {
    borderColor: Theme.colors.primaryContainer,
    backgroundColor: Theme.colors.surfaceContainerLow,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  optionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nativeName: {
    ...Theme.typography.bodyLg,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  textSelected: {
    color: Theme.colors.primaryContainer,
  },
  pill: {
    backgroundColor: Theme.colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.sm,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.primaryContainer,
  },
  exampleText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    lineHeight: 16,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Theme.colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: Theme.colors.primaryContainer,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.primaryContainer,
  },
  bottomBar: {
    backgroundColor: Theme.colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.hairline,
    paddingHorizontal: Theme.spacing.gutter,
    paddingVertical: Theme.spacing.md,
  },
  continueButton: {
    backgroundColor: Theme.colors.primaryContainer,
    borderRadius: Theme.radii.sm,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.onPrimary,
    fontWeight: '700',
  },
});
