import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Linking,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette } from '@/constants/Colors';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { TransactionItem } from '@/components/TransactionItem';
import { formatPaise, rupeesToPaise } from '@/utils/format';

export default function CustomerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const {
    getCustomerById,
    getCustomerLedger,
    recordCreditSale,
    recordRepayment,
    updateCustomer,
    merchant,
  } = useApp();

  const customer = getCustomerById(id || '');
  const transactions = getCustomerLedger(id || '');

  // Add Transaction Modal state
  const [modalType, setModalType] = useState<'CREDIT_SALE' | 'REPAYMENT' | null>(null);
  const [amountRupees, setAmountRupees] = useState('');
  const [description, setDescription] = useState('');

  // Reminder Modal state
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [reminderText, setReminderText] = useState('');

  // Edit Customer Modal state with synchronous rapid-tap guard
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const isUpdatingRef = useRef(false);

  if (!customer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>{t('customerDetail.notFoundTitle')}</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t('customerDetail.notFoundBtn')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const hasDue = customer.currentBalancePaise > 0;

  const handleOpenTransactionModal = (type: 'CREDIT_SALE' | 'REPAYMENT') => {
    setModalType(type);
    setAmountRupees('');
    setDescription(type === 'CREDIT_SALE' ? t('home.descriptionCreditPlaceholder') : t('home.descriptionRepayPlaceholder'));
  };

  const handleSaveTransaction = () => {
    const rupees = parseFloat(amountRupees);
    if (isNaN(rupees) || rupees <= 0) {
      Alert.alert(t('home.amountRequiredTitle'), t('home.amountRequiredMsg'));
      return;
    }

    const amountPaise = rupeesToPaise(rupees);
    if (modalType === 'CREDIT_SALE') {
      recordCreditSale(customer.id, amountPaise, description || t('card.creditSaleType'), 'MANUAL');
    } else {
      recordRepayment(customer.id, amountPaise, description || t('card.repaymentType'), 'MANUAL');
    }

    setModalType(null);
    setAmountRupees('');
  };

  const handleOpenReminder = () => {
    const dueAmount = formatPaise(customer.currentBalancePaise);
    const text = t('customerDetail.reminderTemplate', {
      name: customer.name,
      storeName: merchant.storeName,
      amount: dueAmount,
      upiId: merchant.upiId,
      merchantName: merchant.merchantName,
    });
    setReminderText(text);
    setReminderModalVisible(true);
  };

  const handleSendViaShare = async () => {
    try {
      await Share.share({
        message: reminderText,
        title: `${t('customerDetail.reminderModalTitle')} - ${merchant.storeName}`,
      });
      setReminderModalVisible(false);
      Alert.alert(
        t('customerDetail.reminderSuccessTitle'),
        t('customerDetail.reminderSuccessMsg')
      );
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleSendViaWhatsApp = () => {
    const cleanPhone = customer.phone?.replace(/[^0-9]/g, '') || '';
    const encoded = encodeURIComponent(reminderText);
    const url = cleanPhone
      ? `whatsapp://send?phone=${cleanPhone}&text=${encoded}`
      : `whatsapp://send?text=${encoded}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
          setReminderModalVisible(false);
        } else {
          handleSendViaShare();
        }
      })
      .catch(() => handleSendViaShare());
  };

  const handleOpenEditModal = () => {
    setEditName(customer.name);
    setEditPhone(customer.phone || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (isUpdatingRef.current) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert(t('customerNew.nameValidationTitle'), t('customerNew.nameValidationMsg'));
      return;
    }

    const cleanPhone = editPhone.replace(/[^0-9+]/g, '').trim();

    try {
      isUpdatingRef.current = true;
      setIsUpdating(true);
      await updateCustomer(customer.id, trimmedName, cleanPhone || undefined);
      setEditModalVisible(false);
      Alert.alert(t('customerDetail.editSuccessTitle'), t('customerDetail.editSuccessMsg'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || 'Failed to update customer profile');
    } finally {
      setIsUpdating(false);
      isUpdatingRef.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={Palette.darkNavy} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {customer.name}
        </Text>
        <View style={styles.headerRightActions}>
          <Pressable
            style={styles.editHeaderBtn}
            onPress={handleOpenEditModal}
            accessibilityLabel={t('customerDetail.editCustomerBtn')}
          >
            <Ionicons name="pencil" size={17} color={Palette.darkNavy} />
          </Pressable>
          {customer.phone && (
            <Pressable
              style={styles.callButton}
              onPress={() => Linking.openURL(`tel:${customer.phone}`)}
              accessibilityLabel={t('customerDetail.actionCall')}
            >
              <Ionicons name="call" size={17} color={Palette.primaryBlue} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Profile & Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {(customer.name || '')
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'C'}
              </Text>
            </View>
            <View style={styles.profileInfoCol}>
              <Text style={styles.profileName} numberOfLines={1}>
                {customer.name}
              </Text>
              <View style={styles.profilePhoneRow}>
                <Ionicons
                  name="call-outline"
                  size={13}
                  color={Palette.textSecondary}
                />
                <Text style={styles.profilePhone}>
                  {customer.phone || t('customerDetail.noPhone')}
                </Text>
              </View>
              {customer.createdAt && (
                <Text style={styles.profileCreated}>
                  {t('customerDetail.memberSince', {
                    date: new Date(customer.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }),
                  })}
                </Text>
              )}
            </View>
            <Pressable
              style={styles.editProfileBtn}
              onPress={handleOpenEditModal}
              accessibilityLabel={t('customerDetail.editCustomerBtn')}
            >
              <Ionicons name="pencil" size={13} color={Palette.primaryBlue} />
              <Text style={styles.editProfileBtnText}>
                {t('customerDetail.editCustomerBtn')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Customer Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTopRow}>
            <View>
              <Text style={styles.balanceLabel}>
                {hasDue ? t('customerDetail.totalDue') : t('customerDetail.settled')}
              </Text>
              <Text
                style={[
                  styles.balanceAmount,
                  { color: hasDue ? Palette.dangerRed : Palette.successGreen },
                ]}
              >
                {formatPaise(customer.currentBalancePaise)}
              </Text>
            </View>

            {hasDue && (
              <Pressable
                style={styles.reminderButton}
                onPress={handleOpenReminder}
              >
                <Ionicons name="logo-whatsapp" size={16} color={Palette.white} />
                <Text style={styles.reminderButtonText}>{t('customerDetail.remindBtn')}</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.totalsRow}>
            <View style={styles.totalCol}>
              <Text style={styles.totalSub}>{t('customerDetail.totalCredit')}</Text>
              <Text style={styles.totalCredit}>
                {formatPaise(customer.totalCreditPaise)}
              </Text>
            </View>
            <View style={styles.verticalSep} />
            <View style={styles.totalCol}>
              <Text style={styles.totalSub}>{t('customerDetail.totalRepaid')}</Text>
              <Text style={styles.totalRepayment}>
                {formatPaise(customer.totalRepaymentPaise)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Transaction Action Buttons */}
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionBtn, styles.creditBtn]}
            onPress={() => handleOpenTransactionModal('CREDIT_SALE')}
          >
            <Ionicons name="arrow-up" size={18} color={Palette.white} />
            <Text style={styles.actionBtnText}>{t('customerDetail.actionGiveCredit')}</Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, styles.repaymentBtn]}
            onPress={() => handleOpenTransactionModal('REPAYMENT')}
          >
            <Ionicons name="arrow-down" size={18} color={Palette.white} />
            <Text style={styles.actionBtnText}>{t('customerDetail.actionRepay')}</Text>
          </Pressable>
        </View>

        {/* Transaction History Section */}
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>
            {t('customerDetail.ledgerCount', { count: transactions.length })}
          </Text>
          <Text style={styles.historyNote}>{t('customerDetail.ledgerPaiseNote')}</Text>
        </View>

        <View style={styles.historyCard}>
          {transactions.map((entry) => (
            <TransactionItem
              key={entry.id}
              entry={entry}
              showCustomerName={false}
            />
          ))}

          {transactions.length === 0 && (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>
                {t('customerDetail.emptyLedger')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModalType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'CREDIT_SALE'
                  ? t('customerDetail.modalCreditTitle', { name: customer.name })
                  : t('customerDetail.modalRepayTitle', { name: customer.name })}
              </Text>
              <Pressable onPress={() => setModalType(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={Palette.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>{t('home.amountRupees')}</Text>
            <View style={styles.amountInputWrapper}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder={t('home.amountPlaceholder')}
                placeholderTextColor={Palette.textMuted}
                value={amountRupees}
                onChangeText={setAmountRupees}
                autoFocus
              />
            </View>

            <Text style={styles.inputLabel}>{t('home.description')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={modalType === 'CREDIT_SALE' ? t('home.descriptionCreditPlaceholder') : t('home.descriptionRepayPlaceholder')}
              placeholderTextColor={Palette.textMuted}
              value={description}
              onChangeText={setDescription}
            />

            <Pressable
              style={[
                styles.modalSubmitButton,
                {
                  backgroundColor:
                    modalType === 'CREDIT_SALE'
                      ? Palette.dangerRed
                      : Palette.successGreen,
                },
              ]}
              onPress={handleSaveTransaction}
            >
              <Text style={styles.modalSubmitText}>
                {modalType === 'CREDIT_SALE'
                  ? t('customerDetail.confirmCreditBtn')
                  : t('customerDetail.confirmRepayBtn')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* WhatsApp Reminder Modal */}
      <Modal
        visible={reminderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReminderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.reminderHeaderRow}>
                <Ionicons name="logo-whatsapp" size={22} color={Palette.successGreen} />
                <Text style={styles.modalTitle}>{t('customerDetail.reminderModalTitle')}</Text>
              </View>
              <Pressable onPress={() => setReminderModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={Palette.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>
              {t('customerDetail.editableMsgLabel')}
            </Text>
            <TextInput
              style={styles.textAreaInput}
              multiline
              numberOfLines={4}
              value={reminderText}
              onChangeText={setReminderText}
            />

            <View style={styles.reminderActionsRow}>
              <Pressable
                style={styles.shareFallbackBtn}
                onPress={handleSendViaShare}
              >
                <Ionicons name="share-social" size={18} color={Palette.darkNavy} />
                <Text style={styles.shareFallbackText}>{t('customerDetail.shareFallbackBtn')}</Text>
              </Pressable>

              <Pressable
                style={styles.whatsappSendBtn}
                onPress={handleSendViaWhatsApp}
              >
                <Ionicons name="logo-whatsapp" size={18} color={Palette.white} />
                <Text style={styles.whatsappSendText}>{t('customerDetail.whatsappSendBtn')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Customer Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isUpdating) setEditModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('customerDetail.editModalTitle')}
              </Text>
              <Pressable
                onPress={() => {
                  if (!isUpdating) setEditModalVisible(false);
                }}
                hitSlop={10}
                disabled={isUpdating}
              >
                <Ionicons name="close-circle" size={24} color={Palette.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>{t('customerDetail.nameLabel')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('customerNew.namePlaceholder')}
              placeholderTextColor={Palette.textMuted}
              value={editName}
              onChangeText={setEditName}
              editable={!isUpdating}
              autoFocus
            />

            <Text style={styles.inputLabel}>{t('customerDetail.phoneLabel')}</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="phone-pad"
              placeholder={t('customerNew.phonePlaceholder')}
              placeholderTextColor={Palette.textMuted}
              value={editPhone}
              onChangeText={setEditPhone}
              editable={!isUpdating}
              maxLength={15}
            />

            <View style={styles.editActionsRow}>
              <Pressable
                style={styles.cancelEditBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={isUpdating}
              >
                <Text style={styles.cancelEditBtnText}>
                  {t('common.cancel')}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.saveEditBtn,
                  isUpdating && styles.saveEditBtnDisabled,
                ]}
                onPress={handleSaveEdit}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={Palette.white} />
                ) : (
                  <Ionicons name="checkmark-circle" size={18} color={Palette.white} />
                )}
                <Text style={styles.saveEditBtnText}>
                  {isUpdating
                    ? t('customerDetail.savingBtn')
                    : t('customerDetail.saveChangesBtn')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.white,
  },
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: Palette.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primaryBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  reminderButton: {
    backgroundColor: Palette.successGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderButtonText: {
    color: Palette.white,
    fontSize: 12,
    fontWeight: '700',
  },
  statsDivider: {
    height: 1,
    backgroundColor: Palette.borderLight,
    marginVertical: 14,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalCol: {
    flex: 1,
  },
  verticalSep: {
    width: 1,
    backgroundColor: Palette.borderLight,
    marginHorizontal: 12,
  },
  totalSub: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginBottom: 2,
  },
  totalCredit: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.dangerRed,
  },
  totalRepayment: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.successGreen,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  creditBtn: {
    backgroundColor: Palette.dangerRed,
  },
  repaymentBtn: {
    backgroundColor: Palette.successGreen,
  },
  actionBtnText: {
    color: Palette.white,
    fontSize: 14,
    fontWeight: '700',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  historyNote: {
    fontSize: 11,
    color: Palette.textMuted,
  },
  historyCard: {
    backgroundColor: Palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  emptyHistory: {
    padding: 24,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 16,
    color: Palette.textSecondary,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: Palette.primaryBlue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: Palette.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Palette.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkNavy,
    marginBottom: 6,
    marginTop: 8,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '700',
    color: Palette.darkNavy,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Palette.darkNavy,
    paddingVertical: 10,
  },
  textInput: {
    backgroundColor: Palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.textPrimary,
    marginBottom: 16,
  },
  textAreaInput: {
    backgroundColor: Palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Palette.textPrimary,
    lineHeight: 18,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalSubmitButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.white,
  },
  reminderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareFallbackBtn: {
    flex: 1,
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareFallbackText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkNavy,
  },
  whatsappSendBtn: {
    flex: 1.5,
    backgroundColor: Palette.successGreen,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  whatsappSendText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.white,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginBottom: 12,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.primaryBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
  },
  profileInfoCol: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  profilePhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  profilePhone: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  profileCreated: {
    fontSize: 11,
    color: Palette.textMuted,
    marginTop: 2,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primaryBlueLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primaryBlueDark,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelEditBtn: {
    flex: 1,
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  saveEditBtn: {
    flex: 1.5,
    backgroundColor: Palette.primaryBlue,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveEditBtnDisabled: {
    opacity: 0.7,
  },
  saveEditBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.white,
  },
});
