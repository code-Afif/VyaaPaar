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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette } from '@/constants/Colors';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { rupeesToPaise } from '@/utils/format';
import { generateUUID } from '@/utils/uuid';

export default function NewCustomerScreen() {
  const router = useRouter();
  const { addCustomer } = useApp();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSave = async () => {
    // Synchronous guard checked BEFORE the first await
    if (isSubmittingRef.current) {
      return;
    }

    if (!name.trim()) {
      Alert.alert(t('customerNew.nameValidationTitle'), t('customerNew.nameValidationMsg'));
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    // Generate ONE operation / customer ID (random UUID) per intentional submit attempt
    const operationCustomerId = generateUUID();

    try {
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10} accessibilityLabel={t('common.close')}>
          <Ionicons name="close" size={24} color={Palette.darkNavy} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('customerNew.headerTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.formCard}>
          {/* Customer Name */}
          <Text style={styles.label}>
            {t('customerNew.nameLabel')} <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={Palette.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder={t('customerNew.namePlaceholder')}
              placeholderTextColor={Palette.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          {/* Mobile Number */}
          <Text style={styles.label}>{t('customerNew.phoneLabel')}</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={18} color={Palette.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder={t('customerNew.phonePlaceholder')}
              placeholderTextColor={Palette.textMuted}
              keyboardType="phone-pad"
              maxLength={13}
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Opening Balance */}
          <Text style={styles.label}>
            {t('customerNew.openingBalanceLabel')}
          </Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.rupeePrefix}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder={t('customerNew.openingBalancePlaceholder')}
              placeholderTextColor={Palette.textMuted}
              keyboardType="numeric"
              value={openingBalance}
              onChangeText={setOpeningBalance}
            />
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <ActivityIndicator size="small" color={Palette.white} />
              <Text style={styles.saveButtonText}>{t('customerNew.creatingBtn')}</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Palette.white} />
              <Text style={styles.saveButtonText}>{t('customerNew.createBtn')}</Text>
            </>
          )}
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
    backgroundColor: Palette.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  contentContainer: {
    padding: 16,
  },
  formCard: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkNavy,
    marginBottom: 6,
    marginTop: 10,
  },
  required: {
    color: Palette.dangerRed,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 6,
  },
  rupeePrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: Palette.textPrimary,
  },
  saveButton: {
    backgroundColor: Palette.primaryBlue,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
