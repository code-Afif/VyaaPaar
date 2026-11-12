import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseService } from '@/services/supabaseService';
import { rupeesToPaise } from '@/utils/format';
import { generateUUID } from '@/utils/uuid';

export default function NewCustomerScreen() {
  const router = useRouter();
  const { addCustomer, customers, merchant } = useApp();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const isAlertOpenRef = useRef(false);

  const handleSave = async (forceCreate: boolean = false) => {
    if (!name.trim()) {
      Alert.alert(t('customerNew.nameValidationTitle'), t('customerNew.nameValidationMsg'));
      return;
    }

    // Synchronous guard checked and acquired BEFORE any await
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Pre-check existing customers for duplicate name or phone before proceeding
      if (!forceCreate) {
        let matches: Array<{ id: string; name: string; phone?: string }> = [];

        // In real mode, query Supabase public.customers via read-only service method
        if (!merchant.isDemoMode && merchant.id) {
          try {
            matches = await supabaseService.findPossibleDuplicates(merchant.id, name, phone);
          } catch (err) {
            console.warn('[customer/new] Duplicate check in Supabase failed, falling back to local list:', err);
            matches = [];
          }
        }

        // In demo mode, or as fallback if the service call failed or returned empty:
        if (matches.length === 0) {
          const cleanInputName = name.trim().toLowerCase();
          const inputDigits = phone.replace(/\D/g, '').slice(-10);

          const localMatches = customers.filter((c) => {
            const cName = c.name.trim().toLowerCase();
            if (cleanInputName && cName === cleanInputName) return true;
            if (inputDigits.length === 10 && c.phone) {
              const cDigits = c.phone.replace(/\D/g, '').slice(-10);
              if (cDigits && cDigits === inputDigits) return true;
            }
            return false;
          });

          if (localMatches.length > 0) {
            matches = localMatches;
          }
        }

        if (matches.length > 0) {
          // Release guard on early exit when duplicate alert is shown
          isSubmittingRef.current = false;
          setIsSubmitting(false);

          if (isAlertOpenRef.current) return;
          isAlertOpenRef.current = true;

          const allMatchLines = matches
            .map((m) => `• ${m.name}${m.phone ? ` (${m.phone})` : ''}`)
            .join('\n');

          let alertMessage: string;
          if (matches.length === 1) {
            alertMessage = t('customerNew.duplicateAlertMsg', {
              name: matches[0].name,
              phone: matches[0].phone ? `(${matches[0].phone})` : '',
            });
          } else if (matches.length === 2) {
            alertMessage = `${t('customerNew.duplicateMultipleMsg')}\n\n${allMatchLines}`;
          } else {
            alertMessage = `${t('customerNew.duplicateMultipleMsg')}\n\n${allMatchLines}\n\n${t('customerNew.duplicateMaxButtonsNotice')}`;
          }

          const inputDigits = phone.replace(/\D/g, '').slice(-10);
          const hasPhoneMatch =
            inputDigits.length === 10 &&
            matches.some((m) => {
              const mDigits = (m.phone || '').replace(/\D/g, '').slice(-10);
              return mDigits.length === 10 && mDigits === inputDigits;
            });

          if (hasPhoneMatch) {
            alertMessage = `${alertMessage}\n\n${t('customerNew.duplicatePhoneMatchNotice')}`;
          }

          const alertButtons: Array<{
            text: string;
            style?: 'default' | 'cancel' | 'destructive';
            onPress?: () => void;
          }> = [];

          if (matches.length === 1) {
            alertButtons.push({
              text: t('customerNew.duplicateOpenExistingBtn'),
              onPress: () => {
                isAlertOpenRef.current = false;
                isSubmittingRef.current = false;
                setIsSubmitting(false);
                router.push(`/customer/${matches[0].id}`);
              },
            });
          } else {
            // Show at most 2 named "open khata" buttons
            matches.slice(0, 2).forEach((m) => {
              alertButtons.push({
                text: t('customerNew.duplicateOpenNamedBtn', { name: m.name }),
                onPress: () => {
                  isAlertOpenRef.current = false;
                  isSubmittingRef.current = false;
                  setIsSubmitting(false);
                  router.push(`/customer/${m.id}`);
                },
              });
            });
          }

          if (hasPhoneMatch) {
            // Show only the open-existing buttons (max 2 named plus a cancel)
            alertButtons.push({
              text: t('common.cancel'),
              style: 'cancel',
              onPress: () => {
                isAlertOpenRef.current = false;
                isSubmittingRef.current = false;
                setIsSubmitting(false);
              },
            });
          } else {
            // Keep "Naya Banayein Phir Bhi" only when every match is name-only, with a different or empty phone
            alertButtons.push({
              text: t('customerNew.duplicateCreateAnywayBtn'),
              onPress: () => {
                isAlertOpenRef.current = false;
                isSubmittingRef.current = false;
                setIsSubmitting(false);
                handleSave(true);
              },
            });
          }

          Alert.alert(
            t('customerNew.duplicateAlertTitle'),
            alertMessage,
            alertButtons,
            {
              onDismiss: () => {
                isAlertOpenRef.current = false;
                isSubmittingRef.current = false;
                setIsSubmitting(false);
              },
            }
          );
          return;
        }
      }

      // Generate ONE operation / customer ID (random UUID) per intentional submit attempt
      const operationCustomerId = generateUUID();

      const openingPaise = openingBalance ? rupeesToPaise(openingBalance) : 0;
      const cleanPhone = phone.trim() ? (phone.startsWith('+91') ? phone : `+91 ${phone.trim()}`) : undefined;

      const newCust = await addCustomer(name, cleanPhone, openingPaise, operationCustomerId);

      Alert.alert(
        t('customerNew.successTitle'),
        t('customerNew.successMsg', { name: newCust.name }),
        [
          {
            text: t('customerNew.openKhataBtn'),
            onPress: () => router.replace(`/customer/${newCust.id}`),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(t('customerNew.errorTitle'), err?.message || t('customerNew.errorMsg'));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Sheet Drag Handle & Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.dragHandle} />
          <View style={styles.headerBar}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.sheetTitle}>{t('customerNew.headerTitle')}</Text>
              <Text style={styles.sheetSubtitle}>{t('customerNew.headerSubtitle')}</Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              style={styles.closeBtn}
              hitSlop={10}
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={22} color={Theme.colors.onSurface} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Customer Details Card */}
          <View style={styles.formCard}>
            {/* Customer Name Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {t('customerNew.nameLabel')}{' '}
                <Text style={styles.requiredStar}>{t('customerNew.nameRequired')}</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={Theme.colors.onSurfaceVariant}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('customerNew.namePlaceholder')}
                  placeholderTextColor={Theme.colors.outline}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                />
              </View>
            </View>

            {/* Mobile Number Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('customerNew.phoneLabel')}</Text>
              <View style={styles.phoneInputWrapper}>
                <View style={styles.countryCodeBox}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneTextInput}
                  placeholder={t('customerNew.phonePlaceholder')}
                  placeholderTextColor={Theme.colors.outline}
                  keyboardType="phone-pad"
                  maxLength={13}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>
          </View>

          {/* Section: Opening Balance Card */}
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>{t('customerNew.openingBalanceLabel')}</Text>

            {/* Segmented Type Toggle (Udhaar Baaki Active, Advance Jama Disabled) */}
            <View style={styles.toggleRow}>
              <View style={[styles.toggleBtn, styles.toggleBtnActive]}>
                <Ionicons name="remove-circle" size={16} color={Theme.colors.moneyRed} />
                <Text style={styles.toggleTextActive}>{t('customerNew.udhaarToggle')}</Text>
              </View>

              <View
                style={[styles.toggleBtn, styles.toggleBtnDisabled]}
                accessibilityLabel={`${t('customerNew.advanceToggle')} - ${t('account.comingSoon')}`}
              >
                <Ionicons name="add-circle-outline" size={16} color={Theme.colors.outline} />
                <Text style={styles.toggleTextDisabled}>
                  {t('customerNew.advanceToggle')} ({t('account.comingSoon')})
                </Text>
              </View>
            </View>

            {/* Amount Ruled Input */}
            <View style={styles.amountInputWrapper}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.amountTextInput}
                placeholder={t('customerNew.openingBalancePlaceholder')}
                placeholderTextColor={Theme.colors.outline}
                keyboardType="numeric"
                value={openingBalance}
                onChangeText={setOpeningBalance}
              />
            </View>
          </View>
        </ScrollView>

        {/* Docked Bottom CTA Bar */}
        <View style={styles.bottomDockedBar}>
          <Pressable
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={() => handleSave(false)}
            disabled={isSubmitting}
            accessibilityLabel={t('customerNew.createBtn')}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color={Theme.colors.onPrimary} />
                <Text style={styles.submitButtonText}>{t('customerNew.creatingBtn')}</Text>
              </>
            ) : (
              <>
                <Ionicons name="person-add" size={18} color={Theme.colors.onPrimary} />
                <Text style={styles.submitButtonText}>{t('customerNew.createBtn')}</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  keyboardAvoid: {
    flex: 1,
  },

  /* Top Sheet Header */
  sheetHeader: {
    backgroundColor: Theme.colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    alignItems: 'center',
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.gutter,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: Theme.radii.sm,
    backgroundColor: Theme.colors.hairline,
    marginBottom: Theme.spacing.sm,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerTitleCol: {
    flex: 1,
  },
  sheetTitle: {
    ...Theme.typography.titleMd,
    color: Theme.colors.primary,
  },
  sheetSubtitle: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeBtn: {
    padding: Theme.spacing.xs,
    borderRadius: Theme.radii.sm,
  },

  /* Body Content */
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  contentContainer: {
    padding: Theme.spacing.gutter,
    gap: Theme.spacing.md,
  },

  /* Form Cards */
  formCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.md,
    padding: Theme.spacing.lg,
    gap: Theme.spacing.md,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurface,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  requiredStar: {
    color: Theme.colors.moneyRed,
    fontWeight: '700',
  },

  /* Name Input */
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: Theme.spacing.sm,
  },
  textInput: {
    flex: 1,
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurface,
    paddingVertical: 0,
  },

  /* Phone Input */
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    height: 48,
    overflow: 'hidden',
  },
  countryCodeBox: {
    backgroundColor: Theme.colors.surfaceContainer,
    paddingHorizontal: 12,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Theme.colors.hairline,
  },
  countryCodeText: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  phoneTextInput: {
    flex: 1,
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurface,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 0,
  },

  /* Opening Balance Toggle */
  toggleRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: Theme.radii.sm,
    borderWidth: 1,
  },
  toggleBtnActive: {
    backgroundColor: Theme.colors.moneyRedBg,
    borderColor: Theme.colors.moneyRedBorder,
  },
  toggleBtnDisabled: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderColor: Theme.colors.hairline,
    opacity: 0.65,
  },
  toggleTextActive: {
    ...Theme.typography.labelMd,
    color: Theme.colors.moneyRed,
    fontWeight: '700',
  },
  toggleTextDisabled: {
    ...Theme.typography.bodySm,
    color: Theme.colors.outline,
    fontWeight: '500',
  },

  /* Amount Input */
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    paddingHorizontal: Theme.spacing.md,
    height: 52,
    gap: 8,
  },
  rupeeSymbol: {
    fontSize: 22,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    paddingVertical: 0,
  },

  /* Docked Bottom CTA Bar */
  bottomDockedBar: {
    backgroundColor: Theme.colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.hairline,
    paddingHorizontal: Theme.spacing.gutter,
    paddingVertical: Theme.spacing.md,
  },
  submitButton: {
    backgroundColor: Theme.colors.primaryContainer,
    borderRadius: Theme.radii.md,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.onPrimary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
