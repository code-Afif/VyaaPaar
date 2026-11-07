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
          <Ionicons name="arrow-forward" size={18} color={Palette.white} />
        </Pressable>
      </View>
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
    paddingVertical: 10,
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  mainHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.darkNavy,
    lineHeight: 25,
    letterSpacing: 0.1,
  },
  subHeading: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  optionsList: {
    gap: 10,
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: Palette.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Palette.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
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
    marginRight: 12,
  },
  optionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nativeName: {
    fontSize: 17,
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
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: Palette.primaryBlue,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.primaryBlue,
  },
  bottomBar: {
    backgroundColor: Palette.white,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  continueButton: {
    backgroundColor: Palette.primaryBlue,
    borderRadius: 10,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  continueButtonText: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

