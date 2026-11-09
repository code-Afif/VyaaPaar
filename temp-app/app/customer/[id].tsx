import React, { useState, useRef, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatPaise, rupeesToPaise, formatDisplayPhone } from '@/utils/format';
import { LedgerEntry } from '@/types';

interface LedgerEntryWithBalance extends LedgerEntry {
  runningBalancePaise: number;
}

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
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const isSubmittingTxRef = useRef(false);
  const idempotencyKeyRef = useRef('');

  // Reminder Modal state
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [reminderText, setReminderText] = useState('');

  // Edit Customer Modal state with synchronous rapid-tap guard
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const isUpdatingRef = useRef(false);

  // Anchored backwards from customer.currentBalancePaise (newest entry = current balance).
  // Note: If transactions loaded in memory represent a recent window (e.g. 50 entries) rather
  // than the full historical ledger, running balances prior to the window reflect the relative delta
  // backwards from the real authoritative current balance. Integer paise only.
  const currentBalance = customer?.currentBalancePaise || 0;
  const transactionsWithRunningBalance = useMemo<LedgerEntryWithBalance[]>(() => {
    let running = currentBalance;

    return transactions.map((entry) => {
      const balanceForThisRow = running;
      if (entry.type === 'CREDIT_SALE') {
        running -= entry.amountPaise;
      } else {
        running += entry.amountPaise;
      }
      return {
        ...entry,
        runningBalancePaise: balanceForThisRow,
      };
    });
  }, [transactions, currentBalance]);

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
  const isSettled = customer.currentBalancePaise === 0;

  const handleOpenTransactionModal = (type: 'CREDIT_SALE' | 'REPAYMENT') => {
    setModalType(type);
    setAmountRupees('');
    setDescription(
      type === 'CREDIT_SALE'
        ? t('home.descriptionCreditPlaceholder')
        : t('home.descriptionRepayPlaceholder')
    );
    // Generate ONE idempotency key per modal open and reuse it for that entry
    idempotencyKeyRef.current = `${type === 'CREDIT_SALE' ? 'sale' : 'repay'}-${customer.id}-${Date.now()}`;
    isSubmittingTxRef.current = false;
    setIsSubmittingTx(false);
  };

  const handleSaveTransaction = async () => {
    // Synchronous guard checked BEFORE the first await
    if (isSubmittingTxRef.current) return;

    const rupees = parseFloat(amountRupees);
    if (isNaN(rupees) || rupees <= 0) {
      Alert.alert(t('home.amountRequiredTitle'), t('home.amountRequiredMsg'));
      return;
    }

    isSubmittingTxRef.current = true;
    setIsSubmittingTx(true);

    try {
      const amountPaise = rupeesToPaise(rupees);
      if (modalType === 'CREDIT_SALE') {
        await recordCreditSale(
          customer.id,
          amountPaise,
          description || t('card.creditSaleType'),
          'MANUAL',
          idempotencyKeyRef.current
        );
      } else {
        await recordRepayment(
          customer.id,
          amountPaise,
          description || t('card.repaymentType'),
          'MANUAL',
          undefined,
          idempotencyKeyRef.current
        );
      }

      setModalType(null);
      setAmountRupees('');
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || 'Failed to record transaction');
    } finally {
      isSubmittingTxRef.current = false;
      setIsSubmittingTx(false);
    }
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
      // Clean share failure handling without sensitive logging
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

  const cleanDialPhone = customer.phone?.replace(/[^0-9+]/g, '') || '';
  const hasPhone = Boolean(cleanDialPhone);
  const maskedPhone = formatDisplayPhone(customer.phone);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Docked 56dp TopAppBar matching Stitch */}
      <View style={styles.topAppBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={22} color={Theme.colors.onSurface} />
        </Pressable>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerCustomerName} numberOfLines={1}>
            {customer.name}
          </Text>
          {maskedPhone ? (
            <Text style={styles.headerCustomerPhone}>{maskedPhone}</Text>
          ) : null}
        </View>

        <View style={styles.headerRightActions}>
          <Pressable
            style={styles.headerActionBtn}
            onPress={handleOpenEditModal}
            hitSlop={10}
            accessibilityLabel={t('customerDetail.editCustomerBtn')}
          >
            <Ionicons name="pencil" size={18} color={Theme.colors.onSurface} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Monolithic Customer Masthead */}
        <View style={styles.masthead}>
          <Text style={styles.mastheadLabel}>
            {hasDue
              ? t('stitch.dueUdhaarLabel')
              : isSettled
              ? t('stitch.hisaabBarabar')
              : t('stitch.advanceJama')}
          </Text>

          <Text
            style={[
              styles.mastheadAmount,
              hasDue ? styles.amountDue : styles.amountSettled,
            ]}
          >
            {formatPaise(Math.abs(customer.currentBalancePaise))}
          </Text>

          {/* Quick Contact Action Pills */}
          <View style={styles.contactActionsRow}>
            {hasPhone ? (
              <>
                <Pressable
                  style={styles.contactPill}
                  onPress={() => Linking.openURL(`tel:${cleanDialPhone}`)}
                  accessibilityLabel={t('customerDetail.actionCall')}
                >
                  <Ionicons name="call" size={15} color={Theme.colors.onPrimary} />
                  <Text style={styles.contactPillText}>
                    {t('customerDetail.actionCall')}
                  </Text>
                </Pressable>

                {hasDue && (
                  <Pressable
                    style={[styles.contactPill, styles.whatsappPill]}
                    onPress={handleOpenReminder}
                    accessibilityLabel={t('customerDetail.remindBtn')}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color={Theme.colors.white} />
                    <Text style={styles.contactPillText}>
                      {t('customerDetail.remindBtn')}
                    </Text>
                  </Pressable>
                )}
              </>
            ) : null}
          </View>
        </View>

        {/* Aggregate Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statsCol}>
            <Text style={styles.statsLabel}>{t('customerDetail.totalCredit')}</Text>
            <Text style={styles.statsCreditValue}>
              {formatPaise(customer.totalCreditPaise)}
            </Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsCol}>
            <Text style={styles.statsLabel}>{t('customerDetail.totalRepaid')}</Text>
            <Text style={styles.statsRepaidValue}>
              {formatPaise(customer.totalRepaymentPaise)}
            </Text>
          </View>
        </View>

        {/* Ledger Transaction History Section */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyHeaderTitle}>
              {t('customerDetail.ledgerCount', { count: transactions.length })}
            </Text>
            <Text style={styles.historyHeaderSub}>
              {t('customerDetail.ledgerPaiseNote')}
            </Text>
          </View>

          <View style={styles.ledgerCard}>
            {transactionsWithRunningBalance.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="receipt-outline"
                  size={42}
                  color={Theme.colors.outline}
                />
                <Text style={styles.emptyTitle}>
                  {t('customerDetail.emptyLedger')}
                </Text>
              </View>
            ) : (
              transactionsWithRunningBalance.map((item, idx) => {
                const isCredit = item.type === 'CREDIT_SALE';
                const isLast = idx === transactionsWithRunningBalance.length - 1;

                return (
                  <View
                    key={item.id}
                    style={[styles.txRow, !isLast && styles.txRowBorder]}
                  >
                    {/* Left: Tx Info */}
                    <View style={styles.txLeftCol}>
                      <View style={styles.txBadgeRow}>
                        <View
                          style={[
                            styles.txBadge,
                            isCredit ? styles.txBadgeCredit : styles.txBadgeRepay,
                          ]}
                        >
                          <Text
                            style={[
                              styles.txBadgeText,
                              isCredit
                                ? styles.txBadgeTextCredit
                                : styles.txBadgeTextRepay,
                            ]}
                          >
                            {isCredit
                              ? t('card.creditSaleType')
                              : t('card.repaymentType')}
                          </Text>
                        </View>
                        <Text style={styles.txDate}>{item.createdAt}</Text>
                      </View>

                      {item.description ? (
                        <Text style={styles.txDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>

                    {/* Right: Amounts */}
                    <View style={styles.txRightCol}>
                      <Text
                        style={[
                          styles.txAmount,
                          isCredit ? styles.txAmountCredit : styles.txAmountRepay,
                        ]}
                      >
                        {isCredit ? '-' : '+'} {formatPaise(item.amountPaise)}
                      </Text>
                      <Text style={styles.txRunningBalance}>
                        Baaki: {formatPaise(item.runningBalancePaise)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Docked Ruled Bottom Action Bar */}
      <View style={styles.bottomDockedBar}>
        <Pressable
          style={[styles.dockedActionBtn, styles.dockedCreditBtn]}
          onPress={() => handleOpenTransactionModal('CREDIT_SALE')}
          accessibilityLabel={t('customerDetail.actionGiveCredit')}
        >
          <Ionicons name="remove-circle-outline" size={20} color={Theme.colors.moneyRed} />
          <Text style={styles.dockedCreditText}>
            {t('customerDetail.actionGiveCredit')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.dockedActionBtn, styles.dockedRepayBtn]}
          onPress={() => handleOpenTransactionModal('REPAYMENT')}
          accessibilityLabel={t('customerDetail.actionRepay')}
        >
          <Ionicons name="add-circle-outline" size={20} color={Theme.colors.moneyGreen} />
          <Text style={styles.dockedRepayText}>
            {t('customerDetail.actionRepay')}
          </Text>
        </Pressable>
      </View>

      {/* Add Transaction Modal */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModalType(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'CREDIT_SALE'
                  ? t('customerDetail.modalCreditTitle', { name: customer.name })
                  : t('customerDetail.modalRepayTitle', { name: customer.name })}
              </Text>
              <Pressable onPress={() => setModalType(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={Theme.colors.onSurfaceVariant} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>{t('home.amountRupees')}</Text>
            <View style={styles.amountInputWrapper}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder={t('home.amountPlaceholder')}
                placeholderTextColor={Theme.colors.outline}
                value={amountRupees}
                onChangeText={setAmountRupees}
                autoFocus
              />
            </View>

            <Text style={styles.inputLabel}>{t('home.description')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={
                modalType === 'CREDIT_SALE'
                  ? t('home.descriptionCreditPlaceholder')
                  : t('home.descriptionRepayPlaceholder')
              }
              placeholderTextColor={Theme.colors.outline}
              value={description}
              onChangeText={setDescription}
            />

            <Pressable
              style={[
                styles.modalSubmitButton,
                {
                  backgroundColor:
                    modalType === 'CREDIT_SALE'
                      ? Theme.colors.moneyRed
                      : Theme.colors.moneyGreen,
                  opacity: isSubmittingTx ? 0.6 : 1,
                },
              ]}
              disabled={isSubmittingTx}
              onPress={handleSaveTransaction}
            >
              {isSubmittingTx ? (
                <ActivityIndicator size="small" color={Theme.colors.white} />
              ) : (
                <Text style={styles.modalSubmitText}>
                  {modalType === 'CREDIT_SALE'
                    ? t('customerDetail.confirmCreditBtn')
                    : t('customerDetail.confirmRepayBtn')}
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* WhatsApp Reminder Modal */}
      <Modal
        visible={reminderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReminderModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.reminderHeaderRow}>
                <Ionicons name="logo-whatsapp" size={22} color={Theme.colors.moneyGreen} />
                <Text style={styles.modalTitle}>
                  {t('customerDetail.reminderModalTitle')}
                </Text>
              </View>
              <Pressable onPress={() => setReminderModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={Theme.colors.onSurfaceVariant} />
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
                <Ionicons name="share-social" size={18} color={Theme.colors.primary} />
                <Text style={styles.shareFallbackText}>
                  {t('customerDetail.shareFallbackBtn')}
                </Text>
              </Pressable>

              <Pressable
                style={styles.whatsappSendBtn}
                onPress={handleSendViaWhatsApp}
              >
                <Ionicons name="logo-whatsapp" size={18} color={Theme.colors.white} />
                <Text style={styles.whatsappSendText}>
                  {t('customerDetail.whatsappSendBtn')}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
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
                <Ionicons name="close-circle" size={24} color={Theme.colors.onSurfaceVariant} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>{t('customerDetail.nameLabel')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('customerNew.namePlaceholder')}
              placeholderTextColor={Theme.colors.outline}
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
              placeholderTextColor={Theme.colors.outline}
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
                  <ActivityIndicator size="small" color={Theme.colors.white} />
                ) : (
                  <Ionicons name="checkmark-circle" size={18} color={Theme.colors.white} />
                )}
                <Text style={styles.saveEditBtnText}>
                  {isUpdating
                    ? t('customerDetail.savingBtn')
                    : t('customerDetail.saveChangesBtn')}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.lg,
  },
  notFoundText: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.onSurfaceVariant,
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radii.sm,
  },
  backBtnText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onPrimary,
    fontWeight: '700',
  },

  /* TopAppBar */
  topAppBar: {
    height: Theme.layout.topBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.gutter,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surface,
  },
  backButton: {
    padding: Theme.spacing.xs,
    marginRight: Theme.spacing.sm,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerCustomerName: {
    ...Theme.typography.titleMd,
    color: Theme.colors.primary,
  },
  headerCustomerPhone: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionBtn: {
    padding: Theme.spacing.xs,
  },

  /* Content */
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  contentContainer: {
    paddingBottom: 80,
  },

  /* Masthead Hero */
  masthead: {
    backgroundColor: Theme.colors.primaryContainer,
    paddingHorizontal: Theme.spacing.gutter,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  mastheadLabel: {
    ...Theme.typography.labelMd,
    color: Theme.colors.surfaceContainerHigh,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  mastheadAmount: {
    ...Theme.typography.headlineHero,
    marginTop: 4,
  },
  amountDue: {
    color: Theme.colors.white,
  },
  amountSettled: {
    color: Theme.colors.moneyGreenBorder,
  },

  /* Contact Action Pills */
  contactActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Theme.spacing.md,
  },
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Theme.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  whatsappPill: {
    backgroundColor: '#1E8E3E',
    borderColor: '#1E8E3E',
  },
  contactPillText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.white,
    fontWeight: '700',
  },
  contactPillSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.radii.full,
  },
  contactPillTextSecondary: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
  },

  /* Stats Bar */
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.gutter,
  },
  statsCol: {
    flex: 1,
    alignItems: 'center',
  },
  statsDivider: {
    width: 1,
    backgroundColor: Theme.colors.hairline,
  },
  statsLabel: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  statsCreditValue: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.moneyRed,
    fontWeight: '700',
  },
  statsRepaidValue: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.moneyGreen,
    fontWeight: '700',
  },

  /* History Section */
  historySection: {
    marginTop: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.gutter,
  },
  historyHeader: {
    marginBottom: Theme.spacing.sm,
  },
  historyHeaderTitle: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyHeaderSub: {
    ...Theme.typography.bodySm,
    color: Theme.colors.outline,
    marginTop: 2,
  },
  ledgerCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    overflow: 'hidden',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  emptyTitle: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurfaceVariant,
  },

  /* Transaction Row */
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surfaceCard,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
  },
  txLeftCol: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  txBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  txBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.sm,
    borderWidth: 1,
  },
  txBadgeCredit: {
    backgroundColor: Theme.colors.moneyRedBg,
    borderColor: Theme.colors.moneyRedBorder,
  },
  txBadgeRepay: {
    backgroundColor: Theme.colors.moneyGreenBg,
    borderColor: Theme.colors.moneyGreenBorder,
  },
  txBadgeText: {
    ...Theme.typography.labelMd,
    fontSize: 10,
  },
  txBadgeTextCredit: {
    color: Theme.colors.moneyRed,
  },
  txBadgeTextRepay: {
    color: Theme.colors.moneyGreen,
  },
  txDate: {
    ...Theme.typography.bodySm,
    color: Theme.colors.outline,
  },
  txDesc: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurface,
  },
  txRightCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    ...Theme.typography.bodyLg,
    fontWeight: '700',
  },
  txAmountCredit: {
    color: Theme.colors.moneyRed,
  },
  txAmountRepay: {
    color: Theme.colors.moneyGreen,
  },
  txRunningBalance: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 2,
  },

  /* Bottom Docked Action Bar */
  bottomDockedBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: Theme.colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.hairline,
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.gutter,
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  dockedActionBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radii.sm,
    borderWidth: 1,
    gap: 6,
  },
  dockedCreditBtn: {
    backgroundColor: Theme.colors.moneyRedBg,
    borderColor: Theme.colors.moneyRedBorder,
  },
  dockedRepayBtn: {
    backgroundColor: Theme.colors.moneyGreenBg,
    borderColor: Theme.colors.moneyGreenBorder,
  },
  dockedCreditText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.moneyRed,
    fontWeight: '700',
  },
  dockedRepayText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.moneyGreen,
    fontWeight: '700',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: Theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.surfaceCard,
    borderTopLeftRadius: Theme.radii.md,
    borderTopRightRadius: Theme.radii.md,
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.hairline,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  modalTitle: {
    ...Theme.typography.titleMd,
    color: Theme.colors.primary,
  },
  inputLabel: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurface,
    marginBottom: 6,
    marginTop: 10,
  },
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
  currencySymbol: {
    fontSize: 22,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    paddingVertical: 0,
  },
  textInput: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurface,
  },
  modalSubmitButton: {
    borderRadius: Theme.radii.sm,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.lg,
  },
  modalSubmitText: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.white,
    fontWeight: '700',
  },

  /* Reminder Modal Specifics */
  reminderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textAreaInput: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    padding: Theme.spacing.md,
    minHeight: 90,
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurface,
    textAlignVertical: 'top',
  },
  reminderActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Theme.spacing.md,
  },
  shareFallbackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    height: 46,
  },
  shareFallbackText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  whatsappSendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E8E3E',
    borderRadius: Theme.radii.sm,
    height: 46,
  },
  whatsappSendText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.white,
    fontWeight: '700',
  },

  /* Edit Modal Specifics */
  editActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Theme.spacing.lg,
  },
  cancelEditBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    height: 46,
  },
  cancelEditBtnText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  saveEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Theme.colors.primaryContainer,
    borderRadius: Theme.radii.sm,
    height: 46,
  },
  saveEditBtnDisabled: {
    opacity: 0.6,
  },
  saveEditBtnText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.white,
    fontWeight: '700',
  },
});
