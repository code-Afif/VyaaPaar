import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function AuthScreen() {
  const router = useRouter();
  const { completeLogin, setDemoMode } = useApp();
  const { t, language } = useLanguage();

  // Authentication mode
  const [mode, setMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');

  // Credentials inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign up merchant details
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');

  // Status tracking
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getLangCodeDisplay = () => {
    switch (language) {
      case 'hi':
        return 'हिन्दी';
      case 'hinglish':
        return 'Hinglish';
      default:
        return 'English';
    }
  };

  /**
   * Handle Email + Password Submission
   * Pure password-only authentication flow using Supabase Auth (no OTP/2FA)
   */
  const handleCredentialsSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage(t('auth.errorInvalidEmail'));
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setErrorMessage(t('auth.errorPasswordLength'));
      return;
    }

    if (mode === 'SIGN_UP') {
      if (!storeName.trim() || !ownerName.trim()) {
        setErrorMessage(t('auth.errorStoreOwnerRequired'));
        return;
      }
    }

    if (!isSupabaseConfigured()) {
      setErrorMessage(t('auth.errorSupabaseMissing'));
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'SIGN_IN') {
        // Authenticate with email + password directly
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error || !data.session) {
          setErrorMessage(error?.message || t('auth.errorInvalidEmail'));
          setIsLoading(false);
          return;
        }

        // Authenticated successfully! Load merchant data and navigate directly to dashboard
        setSuccessMessage(t('auth.successLogin'));
        await completeLogin(data.session.user.id, data.session.user.user_metadata);
        setIsLoading(false);
        router.replace('/(tabs)');
      } else {
        // Sign up new merchant
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              store_name: storeName.trim(),
              owner_name: ownerName.trim(),
              phone: phone.trim() || '+91 98000 00000',
            },
          },
        });

        if (error) {
          setErrorMessage(error.message || t('common.error'));
          setIsLoading(false);
          return;
        }

        if (data.session) {
          // Session directly available, log in immediately
          setSuccessMessage(t('auth.successRegisteredDirect'));
          await completeLogin(data.session.user.id, data.session.user.user_metadata);
          setIsLoading(false);
          router.replace('/(tabs)');
        } else {
          setSuccessMessage(t('auth.successRegisteredVerify'));
          setMode('SIGN_IN');
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('common.error'));
      setIsLoading(false);
    }
  };

  /**
   * Continue directly to Demo Mode
   */
  const handleContinueDemo = () => {
    setDemoMode(true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header Bar matching Stitch */}
        <View style={styles.topHeader}>
          <View style={styles.brandRow}>
            <Ionicons name="book" size={20} color={Theme.colors.primary} />
            <Text style={styles.brandTitle}>DukaanSaathi</Text>
          </View>
          <View style={styles.topRightActions}>
            <Pressable
              style={styles.langPill}
              onPress={() => router.push('/language?from=settings')}
              accessibilityLabel={t('common.changeLanguage')}
            >
              <Ionicons name="globe-outline" size={13} color={Theme.colors.onSurface} />
              <Text style={styles.langPillText}>{getLangCodeDisplay()}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={styles.closeBtn}
              hitSlop={10}
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={20} color={Theme.colors.onSurface} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Anchor Area */}
          <View style={styles.brandAnchor}>
            <View style={styles.trustBadge}>
              <View style={styles.trustDot} />
              <Text style={styles.trustBadgeText}>PRATISHTHA • VISHWAS</Text>
            </View>
            <Text style={styles.mainTitle}>DukaanSaathi</Text>
            <Text style={styles.mainSubtitle}>Aapka Digital Bahi-Khata</Text>
          </View>

          {/* Segmented Mode Selector */}
          <View style={styles.modeTabs}>
            <Pressable
              style={[styles.modeTab, mode === 'SIGN_IN' && styles.modeTabActive]}
              onPress={() => {
                setMode('SIGN_IN');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <Text
                style={[
                  styles.modeTabText,
                  mode === 'SIGN_IN' && styles.modeTabTextActive,
                ]}
              >
                {t('auth.tabSignIn')}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.modeTab, mode === 'SIGN_UP' && styles.modeTabActive]}
              onPress={() => {
                setMode('SIGN_UP');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <Text
                style={[
                  styles.modeTabText,
                  mode === 'SIGN_UP' && styles.modeTabTextActive,
                ]}
              >
                {t('auth.tabSignUp')}
              </Text>
            </Pressable>
          </View>

          {/* Banner Notifications */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Theme.colors.moneyRed} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color={Theme.colors.moneyGreen} />
              <Text style={styles.successBannerText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Form Fields Card */}
          <View style={styles.formCard}>
            {/* Sign Up Specific Fields */}
            {mode === 'SIGN_UP' && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('auth.storeNameLabel')}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="business-outline" size={16} color={Theme.colors.onSurfaceVariant} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('auth.storeNamePlaceholder')}
                      placeholderTextColor={Theme.colors.outline}
                      value={storeName}
                      onChangeText={setStoreName}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('auth.ownerNameLabel')}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={16} color={Theme.colors.onSurfaceVariant} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('auth.ownerNamePlaceholder')}
                      placeholderTextColor={Theme.colors.outline}
                      value={ownerName}
                      onChangeText={setOwnerName}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('auth.phoneLabel')}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={16} color={Theme.colors.onSurfaceVariant} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('auth.phonePlaceholder')}
                      placeholderTextColor={Theme.colors.outline}
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>{t('auth.emailLabel')}</Text>
                <Text style={styles.fieldHint}>Khatadhari ID</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={16} color={Theme.colors.onSurfaceVariant} />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor={Theme.colors.outline}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>{t('auth.passwordLabel')}</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={16} color={Theme.colors.onSurfaceVariant} />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={Theme.colors.outline}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={8}
                >
                  <Text style={styles.eyeBtnText}>
                    {showPassword ? 'Chhupayein' : 'Dikhayein'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              style={[styles.submitButton, isLoading && styles.buttonDisabled]}
              onPress={handleCredentialsSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Theme.colors.onPrimary} size="small" />
              ) : (
                <View style={styles.submitBtnContent}>
                  <Text style={styles.submitButtonText}>
                    {mode === 'SIGN_IN' ? t('auth.btnSignIn') : t('auth.btnSignUp')}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={Theme.colors.onPrimary} />
                </View>
              )}
            </Pressable>
          </View>

          {/* Reassurance Info Card */}
          <View style={styles.reassuranceCard}>
            <Ionicons name="receipt-outline" size={20} color={Theme.colors.primaryContainer} />
            <View style={styles.reassuranceTextCol}>
              <Text style={styles.reassuranceTitle}>Rozana Hisaab-Kitab</Text>
              <Text style={styles.reassuranceSub}>
                Dukaan ka har ek udhaar aur jama ab ek jagah, 100% surakshit aur aasan.
              </Text>
            </View>
          </View>

          {/* Demo Mode Button */}
          <View style={styles.demoSection}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable style={styles.demoBtn} onPress={handleContinueDemo}>
              <Ionicons name="play-circle-outline" size={18} color={Theme.colors.primaryContainer} />
              <Text style={styles.demoBtnText}>{t('auth.exploreDemo')}</Text>
            </Pressable>
            <Text style={styles.demoNoteText}>{t('auth.demoDesc')}</Text>
          </View>

          {/* Grounded Security Footer */}
          <View style={styles.securityFooter}>
            <Ionicons name="lock-closed" size={14} color={Theme.colors.outline} />
            <Text style={styles.securityFooterText}>
              Aapka ledger data encrypted aur surakshit hai
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceCard,
  },
  keyboardView: {
    flex: 1,
  },
  topHeader: {
    height: 56,
    paddingHorizontal: Theme.spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surfaceCard,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    ...Theme.typography.titleMd,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    backgroundColor: Theme.colors.surface,
  },
  langPillText: {
    ...Theme.typography.bodySm,
    fontWeight: '600',
    color: Theme.colors.onSurface,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  scrollContent: {
    padding: Theme.spacing.gutter,
    gap: Theme.spacing.lg,
    paddingBottom: 40,
  },

  /* Brand Anchor */
  brandAnchor: {
    marginTop: 8,
    gap: 6,
  },
  trustBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: Theme.radii.sm,
  },
  trustDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.primaryContainer,
  },
  trustBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: -0.5,
  },
  mainSubtitle: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurfaceVariant,
  },

  /* Mode Tabs */
  modeTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Theme.colors.primaryContainer,
  },
  modeTabText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.outline,
    fontWeight: '500',
  },
  modeTabTextActive: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },

  /* Banners */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.moneyRedBg,
    borderWidth: 1,
    borderColor: Theme.colors.moneyRedBorder,
    borderRadius: Theme.radii.sm,
    padding: 10,
  },
  errorBannerText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.moneyRed,
    fontWeight: '600',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.moneyGreenBg,
    borderWidth: 1,
    borderColor: Theme.colors.moneyGreenBorder,
    borderRadius: Theme.radii.sm,
    padding: 10,
  },
  successBannerText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.moneyGreen,
    fontWeight: '600',
    flex: 1,
  },

  /* Form Card */
  formCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    padding: Theme.spacing.lg,
    gap: Theme.spacing.md,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    ...Theme.typography.bodySm,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  fieldHint: {
    fontSize: 10,
    color: Theme.colors.outline,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: Theme.colors.surface,
  },
  textInput: {
    flex: 1,
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurface,
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  eyeBtnText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.secondary,
    fontWeight: '600',
  },
  submitButton: {
    height: 48,
    backgroundColor: Theme.colors.primaryContainer,
    borderRadius: Theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.onPrimary,
    fontWeight: '700',
  },

  /* Reassurance Card */
  reassuranceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    padding: Theme.spacing.md,
  },
  reassuranceTextCol: {
    flex: 1,
    gap: 2,
  },
  reassuranceTitle: {
    ...Theme.typography.bodySm,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  reassuranceSub: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    lineHeight: 18,
  },

  /* Demo Mode Section */
  demoSection: {
    gap: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.colors.hairline,
  },
  dividerText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.outline,
  },
  demoBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    backgroundColor: Theme.colors.surfaceCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  demoBtnText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.primaryContainer,
    fontWeight: '700',
  },
  demoNoteText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },

  /* Grounded Security Footer */
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  securityFooterText: {
    fontSize: 11,
    color: Theme.colors.outline,
  },
});
