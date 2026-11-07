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
import { Palette } from '@/constants/Colors';
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
   * Pure password-only authentication flow using Supabase Auth
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
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Close / Back & Language Switcher */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={12}
              accessibilityLabel="Back"
            >
              <Ionicons name="close" size={24} color={Palette.darkNavy} />
            </Pressable>

            <View style={styles.topRightRow}>
              {/* Language Switcher */}
              <Pressable
                style={styles.langBtn}
                onPress={() => router.push('/language?from=settings')}
                accessibilityLabel={t('common.changeLanguage')}
              >
                <Ionicons name="globe-outline" size={14} color={Palette.darkNavy} />
                <Text style={styles.langBtnText}>{getLangCodeDisplay()}</Text>
              </Pressable>

              <View style={styles.brandBadge}>
                <Ionicons name="shield-checkmark" size={15} color={Palette.primaryBlueDark} />
                <Text style={styles.brandBadgeText}>{t('auth.cloudSecured')}</Text>
              </View>
            </View>
          </View>

          {/* Logo & Heading */}
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="storefront" size={34} color={Palette.primaryBlueDark} />
            </View>

            <Text style={styles.heroTitle}>
              {mode === 'SIGN_IN' ? t('auth.titleSignIn') : t('auth.titleSignUp')}
            </Text>

            <Text style={styles.heroSubtitle}>
              {mode === 'SIGN_IN' ? t('auth.subtitleSignIn') : t('auth.subtitleSignUp')}
            </Text>
          </View>

          {/* Banner Notifications */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color={Palette.dangerRed} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={20} color={Palette.successGreen} />
              <Text style={styles.successBannerText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Credentials Form */}
          <View style={styles.card}>
            {/* Mode Toggle */}
            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleBtn, mode === 'SIGN_IN' && styles.toggleBtnActive]}
                onPress={() => {
                  setMode('SIGN_IN');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                <Text
                  style={[styles.toggleBtnText, mode === 'SIGN_IN' && styles.toggleBtnTextActive]}
                >
                  {t('auth.tabSignIn')}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.toggleBtn, mode === 'SIGN_UP' && styles.toggleBtnActive]}
                onPress={() => {
                  setMode('SIGN_UP');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                <Text
                  style={[styles.toggleBtnText, mode === 'SIGN_UP' && styles.toggleBtnTextActive]}
                >
                  {t('auth.tabSignUp')}
                </Text>
              </Pressable>
            </View>

            {/* Sign Up Fields */}
            {mode === 'SIGN_UP' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('auth.storeNameLabel')}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="business" size={18} color={Palette.textSecondary} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('auth.storeNamePlaceholder')}
                      placeholderTextColor={Palette.textMuted}
                      value={storeName}
                      onChangeText={setStoreName}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('auth.ownerNameLabel')}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person" size={18} color={Palette.textSecondary} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('auth.ownerNamePlaceholder')}
                      placeholderTextColor={Palette.textMuted}
                      value={ownerName}
                      onChangeText={setOwnerName}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('auth.phoneLabel')}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call" size={18} color={Palette.textSecondary} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('auth.phonePlaceholder')}
                      placeholderTextColor={Palette.textMuted}
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.emailLabel')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={18} color={Palette.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor={Palette.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.passwordLabel')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={18} color={Palette.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={Palette.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIconBtn}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Palette.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleCredentialsSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Palette.white} size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {mode === 'SIGN_IN' ? t('auth.btnSignIn') : t('auth.btnSignUp')}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={Palette.white} />
                </>
              )}
            </Pressable>

            <Text style={styles.securityNote}>
              {t('auth.cloudSecured')}
            </Text>
          </View>

          {/* Demo Mode Fallback Option */}
          <View style={styles.demoModeSection}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable style={styles.demoButton} onPress={handleContinueDemo}>
              <Ionicons name="play-circle-outline" size={20} color={Palette.primaryBlueDark} />
              <Text style={styles.demoButtonText}>
                {t('auth.exploreDemo')}
              </Text>
            </Pressable>
            <Text style={styles.demoNote}>
              {t('auth.demoDesc')}
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
    backgroundColor: Palette.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primaryBlueLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.primaryBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.darkNavy,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: Palette.dangerRed,
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.successGreenLight,
    borderWidth: 1,
    borderColor: '#86EFAC',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  successBannerText: {
    flex: 1,
    fontSize: 13,
    color: Palette.successGreen,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Palette.background,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: Palette.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  toggleBtnTextActive: {
    color: Palette.darkNavy,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.darkNavy,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: Palette.textPrimary,
  },
  eyeIconBtn: {
    padding: 4,
  },
  primaryButton: {
    backgroundColor: Palette.primaryBlue,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: '700',
  },
  securityNote: {
    fontSize: 11,
    color: Palette.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  demoModeSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textMuted,
    letterSpacing: 0.5,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.white,
    borderWidth: 1.5,
    borderColor: Palette.primaryBlue,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
  },
  demoNote: {
    fontSize: 11,
    color: Palette.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    lineHeight: 16,
  },
});
