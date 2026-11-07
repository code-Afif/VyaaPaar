import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette } from '@/constants/Colors';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Language } from '@/i18n';

export default function ModalScreen() {
  const router = useRouter();
  const {
    merchant,
    resetToDemoSeed,
    isAuthenticated,
    userEmail,
    signOut,
    seedCurrentSupabaseAccount,
  } = useApp();
  const { language, setLanguage, t } = useLanguage();

  const handleResetData = () => {
    Alert.alert(
      t('settings.resetConfirmTitle'),
      t('settings.resetConfirmMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.resetBtn'),
          style: 'destructive',
          onPress: () => {
            resetToDemoSeed();
            Alert.alert(t('settings.resetCompleteTitle'), t('settings.resetCompleteMsg'));
            router.back();
          },
        },
      ]
    );
  };

  const handleSeedSupabase = async () => {
    Alert.alert(
      t('settings.seedConfirmTitle'),
      t('settings.seedConfirmMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.seedBtn'),
          onPress: async () => {
            const success = await seedCurrentSupabaseAccount();
            if (success) {
              Alert.alert(t('settings.seedSuccessTitle'), t('settings.seedSuccessMsg'));
              router.back();
            } else {
              Alert.alert(t('settings.seedErrorTitle'), t('settings.seedErrorMsg'));
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(t('settings.signOutConfirmTitle'), t('settings.signOutConfirmMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOutBtn'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.back();
        },
      },
    ]);
  };

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'hinglish', label: 'Hinglish' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10} accessibilityLabel={t('common.close')}>
          <Ionicons name="close" size={24} color={Palette.darkNavy} />
        </Pressable>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Merchant Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="storefront" size={28} color={Palette.primaryBlueDark} />
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.storeNameRow}>
              <Text style={styles.storeName}>{merchant.storeName}</Text>
              <View
                style={[
                  styles.modeBadge,
                  {
                    backgroundColor: isAuthenticated
                      ? Palette.successGreenLight
                      : Palette.primaryBlueLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modeBadgeText,
                    {
                      color: isAuthenticated
                        ? Palette.successGreen
                        : Palette.primaryBlueDark,
                    },
                  ]}
                >
                  {isAuthenticated ? t('header.cloud') : t('header.demo')}
                </Text>
              </View>
            </View>
            <Text style={styles.merchantName}>{t('settings.proprietor', { name: merchant.merchantName })}</Text>
            {userEmail && <Text style={styles.emailText}>{t('settings.account', { email: userEmail })}</Text>}
            <Text style={styles.city}>{merchant.city} • {merchant.phone}</Text>
            <Text style={styles.upiId}>{t('settings.paytmUpi', { upi: merchant.upiId })}</Text>
          </View>
        </View>

        {/* App Language Section */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="globe-outline" size={18} color={Palette.primaryBlueDark} />
            <Text style={styles.sectionHeading}>{t('settings.languageHeading')}</Text>
          </View>
          <Text style={styles.sectionSubHeading}>{t('settings.languageSub')}</Text>

          <View style={styles.langPillsRow}>
            {languages.map((l) => {
              const isActive = language === l.code;
              return (
                <Pressable
                  key={l.code}
                  style={[styles.langPill, isActive && styles.langPillActive]}
                  onPress={() => setLanguage(l.code)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.langPillText, isActive && styles.langPillTextActive]}>
                    {l.label}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={14} color={Palette.white} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Auth / Account Management Section */}
        <View style={styles.authSection}>
          <Text style={styles.sectionHeading}>{t('settings.accountStateHeading')}</Text>

          {isAuthenticated ? (
            <View style={styles.authActionsCol}>
              <Pressable style={styles.seedBtn} onPress={handleSeedSupabase}>
                <Ionicons name="cloud-upload" size={18} color={Palette.primaryBlueDark} />
                <Text style={styles.seedBtnText}>{t('settings.seedBtn')}</Text>
              </Pressable>

              <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                <Ionicons name="log-out" size={18} color={Palette.dangerRed} />
                <Text style={styles.signOutBtnText}>{t('settings.signOutBtn')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.authActionsCol}>
              <Pressable
                style={styles.signInBtn}
                onPress={() => {
                  router.push('/auth');
                }}
              >
                <Ionicons name="person-circle" size={20} color={Palette.white} />
                <Text style={styles.signInBtnText}>
                  {t('settings.signInBtn')}
                </Text>
              </Pressable>
              <Text style={styles.authHint}>
                {isSupabaseConfigured()
                  ? t('settings.supabaseReady')
                  : t('settings.demoHint')}
              </Text>
            </View>
          )}
        </View>

        {/* Reset Demo Data Button */}
        <Pressable style={styles.resetButton} onPress={handleResetData}>
          <Ionicons name="refresh" size={18} color={Palette.dangerRed} />
          <Text style={styles.resetButtonText}>{t('settings.resetBtn')}</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  closeBtn: {
    padding: 4,
  },
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.primaryBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  modeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  merchantName: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  emailText: {
    fontSize: 11,
    color: Palette.primaryBlueDark,
    marginTop: 1,
  },
  city: {
    fontSize: 11,
    color: Palette.textMuted,
    marginTop: 2,
  },
  upiId: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.darkNavy,
    marginTop: 3,
  },
  cardSection: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  sectionSubHeading: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  langPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: Palette.background,
    borderWidth: 1.5,
    borderColor: Palette.border,
    gap: 6,
  },
  langPillActive: {
    backgroundColor: Palette.primaryBlue,
    borderColor: Palette.primaryBlue,
  },
  langPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  langPillTextActive: {
    color: Palette.white,
  },
  authSection: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 16,
  },
  authActionsCol: {
    gap: 10,
    marginTop: 12,
  },
  signInBtn: {
    backgroundColor: Palette.primaryBlue,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signInBtnText: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: '700',
  },
  seedBtn: {
    backgroundColor: Palette.primaryBlueLight,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  seedBtnText: {
    color: Palette.primaryBlueDark,
    fontSize: 13,
    fontWeight: '700',
  },
  signOutBtn: {
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutBtnText: {
    color: Palette.dangerRed,
    fontSize: 13,
    fontWeight: '700',
  },
  authHint: {
    fontSize: 11,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  resetButton: {
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetButtonText: {
    color: Palette.dangerRed,
    fontSize: 14,
    fontWeight: '700',
  },
});
