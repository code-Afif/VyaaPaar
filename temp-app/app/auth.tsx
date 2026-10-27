import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
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
import { supabaseService } from '@/services/supabaseService';

export default function AuthScreen() {
  const router = useRouter();
  const { completeMfaLogin, setDemoMode, signOut } = useApp();

  // Authentication flow states
  const [mode, setMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');
  const [step, setStep] = useState<'CREDENTIALS' | 'OTP_VERIFICATION'>('CREDENTIALS');

  // Step A: Credentials inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign up merchant details
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');

  // Step B: OTP inputs and challenge tracking
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<any[]>([]);
  const [challengeId, setChallengeId] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);

  // Status tracking
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 60-second cooldown timer countdown
  useEffect(() => {
    let timer: any = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  // Helper: Mask email if backend doesn't provide masked string
  const getMaskedEmail = (rawEmail: string): string => {
    if (!rawEmail || !rawEmail.includes('@')) return rawEmail;
    const [name, domain] = rawEmail.split('@');
    if (name.length <= 2) return `${name.charAt(0)}***@${domain}`;
    return `${name.charAt(0)}***${name.charAt(name.length - 1)}@${domain}`;
  };

  /**
   * STEP A: Handle Email + Password Submission
   * Enforces password-first verification before ANY OTP challenge is created.
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
        // Authenticate with email + password first
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error || !data.session) {
          // Security requirement: generic invalid credential message; never trigger OTP on failed password
          setErrorMessage('Invalid email or password (Email ya Password galat hai).');
          setIsLoading(false);
          return;
        }

        // Password verified. Now request MFA challenge from Edge Function
        await initiateMfaChallenge(data.session.user.email || cleanEmail);
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
          // Session directly available, proceed to MFA
          await initiateMfaChallenge(cleanEmail);
        } else {
          setSuccessMessage(
            'Account created! If email confirmation is enabled, please verify your email then sign in.'
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
   * Request second factor OTP challenge from server
   * Fails closed if Edge Function or email provider is unavailable.
   */
  const initiateMfaChallenge = async (userEmailAddr: string) => {
    try {
      const challenge = await supabaseService.requestMfaChallenge();
      setChallengeId(challenge.challengeId);
      setMaskedEmail(challenge.maskedEmail || getMaskedEmail(userEmailAddr));
      setResendCooldown(60);
      setAttemptsRemaining(5);
      setOtpDigits(['', '', '', '', '', '']);
      setStep('OTP_VERIFICATION');
      setSuccessMessage('Security OTP has been sent to your email (Suraksha OTP bhej diya gaya hai).');
      setIsLoading(false);

      // Auto-focus first digit on next tick
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 300);
    } catch (err: any) {
      // Security fail-closed: do NOT allow entry if MFA service fails
      console.error('MFA challenge dispatch failed:', err);
      setErrorMessage(
        err.message ||
          'Email OTP delivery is currently unavailable. Second factor authentication cannot be bypassed.'
      );
      setIsLoading(false);
    }
  };

  /**
   * Handle per-digit OTP entry and backspace
   */
  const handleOtpDigitChange = (value: string, index: number) => {
    // Handle paste of full 6-digit code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      if (digits.length > 0) {
        const nextDigits = [...otpDigits];
        digits.forEach((d, i) => {
          if (index + i < 6) {
            nextDigits[index + i] = d;
          }
        });
        setOtpDigits(nextDigits);
        const focusIdx = Math.min(index + digits.length, 5);
        otpInputRefs.current[focusIdx]?.focus();
        return;
      }
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = digit;
    setOtpDigits(nextDigits);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  /**
   * STEP B: Verify OTP Code
   * Enforces server-side validation, attempt decrement, and session grant.
   */
  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullCode = otpDigits.join('').trim();
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter complete 6-digit OTP (Poora 6-ankon ka OTP enter karein).');
      return;
    }

    if (attemptsRemaining <= 0) {
      setErrorMessage(
        'Maximum attempts exceeded (5/5). This OTP has expired. Please request a new code.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const result = await supabaseService.verifyMfaChallenge({
        challengeId,
        otpCode: fullCode,
      });

      if (result.success) {
        setSuccessMessage('MFA Verified Successfully! Opening store...');

        // Fetch user data from session
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await completeMfaLogin(authData.user.id, authData.user.user_metadata);
        }

        // Navigate to main application dashboard
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      const remaining = Math.max(0, attemptsRemaining - 1);
      setAttemptsRemaining(remaining);

      if (remaining === 0) {
        setErrorMessage(
          'Incorrect OTP code. Maximum attempts reached (5/5). OTP challenge is locked. Click "Resend OTP" to request a new code.'
        );
      } else {
        setErrorMessage(
          `${err.message || 'Incorrect OTP code.'} Remaining attempts: ${remaining}/5.`
        );
      }

      // Clear input and refocus first box
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resend OTP with strict 60s cooldown enforcement
   */
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const challenge = await supabaseService.requestMfaChallenge();
      setChallengeId(challenge.challengeId);
      setResendCooldown(60);
      setAttemptsRemaining(5);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMessage('New OTP sent to your email (Naya OTP email par bhej diya gaya hai).');
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Switch Account / Reset to Step A
   */
  const handleSwitchAccount = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
    setStep('CREDENTIALS');
    setOtpDigits(['', '', '', '', '', '']);
    setErrorMessage(null);
    setSuccessMessage(null);
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
              onPress={() => {
                if (step === 'OTP_VERIFICATION') {
                  handleSwitchAccount();
                } else {
                  router.back();
                }
              }}
              style={styles.backButton}
              hitSlop={12}
            >
              <Ionicons
                name={step === 'OTP_VERIFICATION' ? 'arrow-back' : 'close'}
                size={24}
                color={Palette.darkNavy}
              />
            </Pressable>

            <View style={styles.brandBadge}>
              <Ionicons name="shield-checkmark" size={16} color={Palette.primaryBlueDark} />
              <Text style={styles.brandBadgeText}>Paytm MFA Secured</Text>
            </View>
          </View>

          {/* Logo & Heading */}
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={step === 'CREDENTIALS' ? 'storefront' : 'mail-unread'}
                size={34}
                color={Palette.primaryBlueDark}
              />
            </View>

            <Text style={styles.heroTitle}>
              {step === 'CREDENTIALS'
                ? mode === 'SIGN_IN'
                  ? 'DukaanSaathi Partner Login'
                  : 'Register New Dukaan'
                : '2-Step Security Verification'}
            </Text>

            <Text style={styles.heroSubtitle}>
              {step === 'CREDENTIALS'
                ? mode === 'SIGN_IN'
                  ? 'Apni dukan ke accounts aur ledger access karne ke liye login karein.'
                  : 'Apni kirana dukan ke liye surakshit khata banayein.'
                : `Suraksha code enter karein jo ${maskedEmail || 'aapke email'} par bheja gaya hai.`}
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

          {/* ---------------- STEP A: CREDENTIALS ---------------- */}
          {step === 'CREDENTIALS' && (
            <View style={styles.card}>
              {/* Mode Toggle */}
              <View style={styles.toggleRow}>
                <Pressable
                  style={[styles.toggleBtn, mode === 'SIGN_IN' && styles.toggleBtnActive]}
                  onPress={() => {
                    setMode('SIGN_IN');
                    setErrorMessage(null);
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
                        ? 'Verify Password & Request OTP'
                        : 'Create Account & Continue'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color={Palette.white} />
                  </>
                )}
              </Pressable>

              <Text style={styles.securityNote}>
                🔒 2-Factor Authentication: Step 1 verifies credentials, Step 2 dispatches a 6-digit
                code to your email.
              </Text>
            </View>
          )}

          {/* ---------------- STEP B: OTP VERIFICATION ---------------- */}
          {step === 'OTP_VERIFICATION' && (
            <View style={styles.card}>
              <View style={styles.otpHeader}>
                <Text style={styles.otpInstruction}>
                  Enter the 6-digit code sent to your verified email:
                </Text>
                <Text style={styles.maskedEmailText}>{maskedEmail}</Text>
              </View>

              {/* 6-Digit OTP Box Grid */}
              <View style={styles.otpBoxesRow}>
                {otpDigits.map((digit, index) => (
                  <TextInput
                    key={`otp-box-${index}`}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                      index === 0 && !digit ? styles.otpBoxActive : null,
                    ]}
                    value={digit}
                    onChangeText={(val) => handleOtpDigitChange(val, index)}
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? 6 : 1}
                    selectTextOnFocus
                    textAlign="center"
                  />
                ))}
              </View>

              <View style={styles.attemptsRow}>
                <Ionicons
                  name="shield-outline"
                  size={14}
                  color={attemptsRemaining <= 2 ? Palette.dangerRed : Palette.textSecondary}
                />
                <Text
                  style={[
                    styles.attemptsText,
                    attemptsRemaining <= 2 ? { color: Palette.dangerRed } : null,
                  ]}
                >
                  Attempts remaining: {attemptsRemaining}/5 • Valid for 60 mins
                </Text>
              </View>

              {/* Verify OTP Button */}
              <Pressable
                style={[
                  styles.primaryButton,
                  (isLoading || attemptsRemaining <= 0) && styles.buttonDisabled,
                ]}
                onPress={handleVerifyOtp}
                disabled={isLoading || attemptsRemaining <= 0}
              >
                {isLoading ? (
                  <ActivityIndicator color={Palette.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="lock-open" size={18} color={Palette.white} />
                    <Text style={styles.primaryButtonText}>
                      Verify & Open Store (सत्यापित करें)
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Resend OTP Button */}
              <View style={styles.resendContainer}>
                {resendCooldown > 0 ? (
                  <Text style={styles.resendCooldownText}>
                    Resend OTP in {resendCooldown}s (पुनः भेजें)
                  </Text>
                ) : (
                  <Pressable
                    onPress={handleResendOtp}
                    disabled={isLoading}
                    style={styles.resendButton}
                  >
                    <Ionicons name="refresh" size={16} color={Palette.primaryBlueDark} />
                    <Text style={styles.resendButtonText}>Resend OTP (ओटीपी दोबारा भेजें)</Text>
                  </Pressable>
                )}
              </View>

              {/* Switch Account */}
              <Pressable onPress={handleSwitchAccount} style={styles.switchAccountBtn}>
                <Text style={styles.switchAccountText}>
                  Wrong email? Log in with a different account
                </Text>
              </Pressable>
            </View>
          )}

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
  otpHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  otpInstruction: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  maskedEmailText: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.darkNavy,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Palette.border,
    backgroundColor: Palette.background,
    fontSize: 22,
    fontWeight: '800',
    color: Palette.darkNavy,
  },
  otpBoxFilled: {
    borderColor: Palette.primaryBlue,
    backgroundColor: Palette.white,
  },
  otpBoxActive: {
    borderColor: Palette.primaryBlueDark,
  },
  attemptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  attemptsText: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendCooldownText: {
    fontSize: 13,
    color: Palette.textMuted,
    fontWeight: '600',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
  },
  switchAccountBtn: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  switchAccountText: {
    fontSize: 12,
    color: Palette.textSecondary,
    textDecorationLine: 'underline',
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
