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
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function AuthScreen() {
  const router = useRouter();
  const { completeLogin, setDemoMode } = useApp();

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
      setErrorMessage('Please enter a valid email address (Sahi email enter karein).');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters (Password kam se kam 6 akshar ka ho).');
      return;
    }

    if (mode === 'SIGN_UP') {
      if (!storeName.trim() || !ownerName.trim()) {
        setErrorMessage('Dukan aur malik ka naam anivarya hai (Store & Owner Name are required).');
        return;
      }
    }

    if (!isSupabaseConfigured()) {
      setErrorMessage(
        'Supabase backend credentials are not configured in .env.local. Please explore in Demo Mode.'
      );
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
          setErrorMessage(error?.message || 'Invalid email or password (Email ya Password galat hai).');
          setIsLoading(false);
          return;
        }

        // Authenticated successfully! Load merchant data and navigate directly to dashboard
        setSuccessMessage('Logged in successfully! Opening store...');
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
          setErrorMessage(error.message || 'Registration failed (Khata banane mein asafal).');
          setIsLoading(false);
          return;
        }

        if (data.session) {
          // Session directly available, log in immediately
          setSuccessMessage('Account created successfully! Opening store...');
          await completeLogin(data.session.user.id, data.session.user.user_metadata);
          setIsLoading(false);
          router.replace('/(tabs)');
        } else {
          setSuccessMessage(
            'Account created! If email confirmation is enabled on your Supabase project, please check your inbox and verify before signing in.'
          );
          setMode('SIGN_IN');
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error occurred.');
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
          {/* Header Close / Back */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={12}
            >
              <Ionicons name="close" size={24} color={Palette.darkNavy} />
            </Pressable>

            <View style={styles.brandBadge}>
              <Ionicons name="shield-checkmark" size={16} color={Palette.primaryBlueDark} />
              <Text style={styles.brandBadgeText}>Supabase Cloud Secured</Text>
            </View>
          </View>

          {/* Logo & Heading */}
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="storefront" size={34} color={Palette.primaryBlueDark} />
            </View>

            <Text style={styles.heroTitle}>
              {mode === 'SIGN_IN'
                ? 'DukaanSaathi Partner Login'
                : 'Register New Dukaan'}
            </Text>

            <Text style={styles.heroSubtitle}>
              {mode === 'SIGN_IN'
                ? 'Apni dukan ke accounts aur ledger access karne ke liye login karein.'
                : 'Apni kirana dukan ke liye surakshit khata banayein.'}
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
                  Sign In (लॉगिन)
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
                  Register (नया खाता)
                </Text>
              </Pressable>
            </View>

            {/* Sign Up Fields */}
            {mode === 'SIGN_UP' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Store Name (दुकान का नाम) *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="business" size={18} color={Palette.textSecondary} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Sharma Kirana Store"
                      placeholderTextColor={Palette.textMuted}
                      value={storeName}
                      onChangeText={setStoreName}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Proprietor Name (मालिक का नाम) *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person" size={18} color={Palette.textSecondary} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Rajesh Sharma"
                      placeholderTextColor={Palette.textMuted}
                      value={ownerName}
                      onChangeText={setOwnerName}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number (मोबाइल नंबर)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call" size={18} color={Palette.textSecondary} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="+91 98260 12345"
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
              <Text style={styles.label}>Email Address (ईमेल) *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={18} color={Palette.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="merchant@dukaan.com"
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
              <Text style={styles.label}>Password (पासवर्ड) *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={18} color={Palette.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter min. 6 characters"
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
                    {mode === 'SIGN_IN'
                      ? 'Sign In to Store (लॉगिन करें)'
                      : 'Create Account & Continue'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={Palette.white} />
                </>
              )}
            </Pressable>

            <Text style={styles.securityNote}>
              🔒 Secure Cloud Authentication: Direct encrypted session with Supabase Row-Level Security.
            </Text>
          </View>

          {/* Demo Mode Fallback Option */}
          <View style={styles.demoModeSection}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>YA PHIR (OR)</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable style={styles.demoButton} onPress={handleContinueDemo}>
              <Ionicons name="play-circle-outline" size={20} color={Palette.primaryBlueDark} />
              <Text style={styles.demoButtonText}>
                Explore in Demo Mode (बिना लॉगिन के दुकान देखें)
              </Text>
            </Pressable>
            <Text style={styles.demoNote}>
              Pre-loaded with sample kirana customers, credit ledger entries, and Paytm soundbox
              events.
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  brandBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.primaryBlueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.darkNavy,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.dangerRedLight,
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: Palette.dangerRed,
    fontWeight: '600',
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.successGreenLight,
    borderColor: '#A7F3D0',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  successBannerText: {
    flex: 1,
    fontSize: 13,
    color: Palette.successGreen,
    fontWeight: '600',
    lineHeight: 18,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Palette.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Palette.border,
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
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  toggleBtnTextActive: {
    color: Palette.darkNavy,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.darkNavy,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    height: 48,
  },
  textInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: Palette.textPrimary,
  },
  eyeIconBtn: {
    padding: 6,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.darkNavy,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
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
    marginTop: 12,
    lineHeight: 16,
  },
  demoModeSection: {
    marginTop: 24,
    alignItems: 'center',
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
    fontSize: 11,
    fontWeight: '800',
    color: Palette.textMuted,
    paddingHorizontal: 12,
    letterSpacing: 1,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.card,
    borderWidth: 1.5,
    borderColor: Palette.primaryBlue,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.primaryBlueDark,
  },
  demoNote: {
    fontSize: 11,
    color: Palette.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
});
