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
import { Palette } from '@/constants/Colors';
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
            <Ionicons name="arrow-back" size={24} color={Palette.darkNavy} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t('settings.languageHeading')}</Text>
          <View style={{ width: 24 }} />
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
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

        {/* Continue Button */}
        <Pressable
          style={styles.continueButton}
          onPress={handleContinue}
          accessibilityLabel={t('languageScreen.continueBtn')}
        >
          <Text style={styles.continueButtonText}>
            {t('languageScreen.continueBtn')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={Palette.white} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  backButton: {
    padding: 4,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  contentContainer: {
    padding: 20,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  headerSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  mainHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.darkNavy,
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  subHeading: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginTop: 12,
    lineHeight: 20,
  },
  optionsList: {
    gap: 14,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Palette.border,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: Palette.primaryBlue,
    backgroundColor: '#F0F9FF',
  },
  optionContent: {
    flex: 1,
    marginRight: 14,
  },
  optionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nativeName: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  textSelected: {
    color: Palette.primaryBlueDark,
  },
  pill: {
    backgroundColor: Palette.primaryBlueLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
  },
  exampleText: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: Palette.primaryBlue,
  },
  radioInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Palette.primaryBlue,
  },
  continueButton: {
    backgroundColor: Palette.primaryBlue,
    borderRadius: 12,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 'auto',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  continueButtonText: {
    color: Palette.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

