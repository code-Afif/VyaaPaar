import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { ScreenHeader, AmountText } from '@/components/ui';
import { formatPaise, rupeesToPaise } from '@/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const {
    merchant,
    briefing,
    ledgerEntries,
    customers,
    paymentEvents,
    recordCreditSale,
    recordRepayment,
  } = useApp();
  const { t } = useLanguage();

  // Quick Action Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'CREDIT_SALE' | 'REPAYMENT'>('CREDIT_SALE');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [amountRupees, setAmountRupees] = useState('');
  const [description, setDescription] = useState('');

  const recentTransactions = useMemo(() => ledgerEntries.slice(0, 5), [ledgerEntries]);

  // Derived real alerts (NO FAKE / INVENTED DATA)
  // Strictly calculate real today's repayments from ledgerEntries (no fake seeds)
  const todayCollectedPaise = useMemo(() => {
    return ledgerEntries
      .filter(
        (l) =>
          l.type === 'REPAYMENT' &&
          (l.createdAt.includes('Today') || l.createdAt.includes('Just now'))
      )
      .reduce((sum, l) => sum + l.amountPaise, 0);
  }, [ledgerEntries]);

  // Strictly calculate real today's transactions count
  const todayEntriesCount = useMemo(() => {
    return ledgerEntries.filter(
      (l) => l.createdAt.includes('Today') || l.createdAt.includes('Just now')
    ).length;
  }, [ledgerEntries]);

  const topOverdueCustomer = useMemo(() => {
    return customers
      .filter((c) => (c.currentBalancePaise || 0) > 0)
      .sort((a, b) => (b.currentBalancePaise || 0) - (a.currentBalancePaise || 0))[0];
  }, [customers]);

  const unmatchedPayment = useMemo(() => {
    return paymentEvents.find((p) => p.status === 'UNMATCHED');
  }, [paymentEvents]);

  const handleOpenQuickAction = (type: 'CREDIT_SALE' | 'REPAYMENT') => {
    setActionType(type);
    setSelectedCustomerId(customers[0]?.id || '');
    setAmountRupees('');
    setDescription(
      type === 'CREDIT_SALE'
        ? t('home.descriptionCreditPlaceholder')
        : t('home.descriptionRepayPlaceholder')
    );
    setModalVisible(true);
  };

  const handleSubmitQuickAction = () => {
    const rupees = parseFloat(amountRupees);
    if (isNaN(rupees) || rupees <= 0) {
      Alert.alert(t('home.amountRequiredTitle'), t('home.amountRequiredMsg'));
      return;
    }

    if (!selectedCustomerId) {
      Alert.alert(t('home.customerRequiredTitle'), t('home.customerRequiredMsg'));
      return;
    }

    const amountPaise = rupeesToPaise(rupees);
    if (actionType === 'CREDIT_SALE') {
      recordCreditSale(selectedCustomerId, amountPaise, description, 'MANUAL');
    } else {
      recordRepayment(selectedCustomerId, amountPaise, description, 'MANUAL');
    }

    setModalVisible(false);
    setAmountRupees('');
  };

  const storeTitle = merchant?.storeName?.trim() || t('stitch.vyapaarKirana');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Docked 56dp TopAppBar matching Stitch */}
      <ScreenHeader
        title={storeTitle}
        rightAction={
          <Pressable
            style={styles.headerIconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={Theme.colors.onSurface} />
            <View style={styles.notificationAlertDot} />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Monolithic Deep Navy Masthead Panel */}
        <View style={styles.heroPanel}>
          <Text style={styles.heroSubLabel}>{t('stitch.totalUdhaarOwed')}</Text>
          <AmountText
            amountPaise={briefing.totalOutstandingPaise || 0}
            variant="white"
            size="hero"
            style={styles.heroAmount}
          />

          <View style={styles.heroDualRow}>
            {/* Left: Total Grahak */}
            <View style={styles.heroColLeft}>
              <Text style={styles.heroColLabel}>{t('stitch.totalGrahak')}</Text>
              <Text style={styles.heroColValue}>
                {t('stitch.grahakCountUnit', { count: customers.length })}
              </Text>
            </View>

            {/* Right: Aaj ka Payment (Strictly today's repayments) */}
            <View style={styles.heroColRight}>
              <Text style={styles.heroColLabel}>{t('stitch.aajKaPayment')}</Text>
              <Text style={styles.heroColValueGreen}>
                + {formatPaise(todayCollectedPaise)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Action Ruled Ledger Bar */}
        <View style={styles.quickActionBar}>
          <Pressable
            style={[styles.quickActionBtn, styles.quickActionBtnLeft]}
            onPress={() => handleOpenQuickAction('CREDIT_SALE')}
            accessibilityLabel={t('stitch.udhaarDiyaBtn')}
          >
            <Ionicons name="remove-circle-outline" size={20} color={Theme.colors.moneyRed} />
            <Text style={styles.quickActionTextRed}>{t('stitch.udhaarDiyaBtn')}</Text>
          </Pressable>

          <Pressable
            style={styles.quickActionBtn}
            onPress={() => handleOpenQuickAction('REPAYMENT')}
            accessibilityLabel={t('stitch.jamaMilaBtn')}
          >
            <Ionicons name="add-circle-outline" size={20} color={Theme.colors.moneyGreen} />
            <Text style={styles.quickActionTextGreen}>{t('stitch.jamaMilaBtn')}</Text>
          </Pressable>
        </View>

        {/* Section: Zaroori Alerts */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderLabel}>{t('stitch.zarooriAlerts')}</Text>

          <View style={styles.ledgerGroup}>
            {/* Alert Row 1: Overdue customer */}
            {topOverdueCustomer ? (
              <View style={styles.ledgerRow}>
                <View style={styles.ledgerRowTextCol}>
                  <Text style={styles.ledgerRowTitle}>{topOverdueCustomer.name}</Text>
                  <Text style={styles.ledgerRowSubtitle}>
                    {formatPaise(topOverdueCustomer.currentBalancePaise)} {t('stitch.owedSubtitle')}
                  </Text>
                </View>
                <Pressable
                  style={styles.actionPillBtn}
                  onPress={() => router.push(`/customer/${topOverdueCustomer.id}`)}
                >
                  <Text style={styles.actionPillText}>{t('stitch.tagaadaBhejein')}</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Alert Row 2: Unmatched payment or clean state */}
            {unmatchedPayment ? (
              <View style={styles.ledgerRow}>
                <View style={styles.ledgerRowTextCol}>
                  <Text style={styles.ledgerRowTitle}>{t('stitch.unmatchedAlertTitle')}</Text>
                  <Text style={styles.ledgerRowSubtitle}>
                    {formatPaise(unmatchedPayment.amountPaise)} {t('stitch.unmatchedAlertSub')}
                  </Text>
                </View>
                <Pressable
                  style={styles.actionPillBtn}
                  onPress={() => router.push('/(tabs)/payments')}
                >
                  <Text style={styles.actionPillText}>{t('stitch.linkKarein')}</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Alert Row 3: Aaj ka Hisaab */}
            <Pressable
              style={styles.ledgerRow}
              onPress={() => router.push('/(tabs)/khata')}
            >
              <View style={styles.ledgerRowTextCol}>
                <Text style={styles.ledgerRowTitle}>{t('stitch.aajKaHisaabTitle')}</Text>
                <Text style={styles.ledgerRowSubtitle}>
                  {t('stitch.aajKaHisaabSub', { count: todayEntriesCount })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Theme.colors.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>

        {/* Section: Haal ke Lenden (Recent Transactions Roll) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderLabel}>{t('stitch.haalKeLenden')}</Text>
            <Pressable onPress={() => router.push('/(tabs)/khata')}>
              <Text style={styles.viewAllText}>{t('stitch.sabhiDekhein')}</Text>
            </Pressable>
          </View>

          <View style={styles.ledgerGroup}>
            {recentTransactions.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyRowText}>{t('customerDetail.emptyLedger')}</Text>
              </View>
            ) : (
              recentTransactions.map((item) => {
                const customer = customers.find((c) => c.id === item.customerId);
                const isCredit = item.type === 'CREDIT_SALE';
                const displayName = customer?.name || item.customerName || 'Grahak';
                const note = item.description || (isCredit ? 'Udhaar' : 'Jama');

                return (
                  <Pressable
                    key={item.id}
                    style={styles.ledgerRow}
                    onPress={() => router.push(`/customer/${item.customerId}`)}
                  >
                    <View style={styles.ledgerRowTextCol}>
                      <Text style={styles.ledgerRowTitle}>{displayName}</Text>
                      <Text style={styles.ledgerRowSubtitle}>{note}</Text>
                    </View>
                    <View style={styles.ledgerRowAmountCol}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          isCredit ? styles.amountRed : styles.amountGreen,
                        ]}
                      >
                        {isCredit ? '- ' : '+ '}
                        {formatPaise(item.amountPaise)}
                      </Text>
                      <Text style={styles.transactionLabel}>
                        {isCredit ? t('stitch.dueUdhaarLabel') : t('stitch.jamaLabel')}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        {/* Footer Seal Notation */}
        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>{t('stitch.pannaPurna')}</Text>
        </View>
      </ScrollView>

      {/* Contextual Floating Voice Action Button (Stitch Mic FAB) */}
      <Pressable
        style={styles.voiceFab}
        onPress={() => router.push('/voice')}
        accessibilityLabel={t('stitch.boloKhata')}
      >
        <Ionicons name="mic" size={20} color={Theme.colors.onPrimary} />
        <Text style={styles.voiceFabText}>{t('stitch.boloKhata')}</Text>
      </Pressable>

      {/* Quick Action Modal (Preserved with existing functional dispatch) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionType === 'CREDIT_SALE'
                  ? t('home.quickModalCreditTitle')
                  : t('home.quickModalRepayTitle')}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={Theme.colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {/* Select Customer */}
            <Text style={styles.inputLabel}>{t('home.selectCustomer')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.customerChipsRow}
            >
              {customers.map((c) => {
                const isSelected = c.id === selectedCustomerId;
                return (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.customerChip,
                      isSelected && styles.customerChipSelected,
                    ]}
                    onPress={() => setSelectedCustomerId(c.id)}
                  >
                    <Text
                      style={[
                        styles.customerChipText,
                        isSelected && styles.customerChipTextSelected,
                      ]}
                    >
                      {c.name}
                    </Text>
                    {c.currentBalancePaise > 0 && (
                      <Text
                        style={[
                          styles.chipDue,
                          isSelected && styles.chipDueSelected,
                        ]}
                      >
                        ₹{(c.currentBalancePaise / 100).toFixed(0)}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Amount Input */}
            <Text style={styles.inputLabel}>{t('home.amountLabel')}</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.rupeeSign}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={Theme.colors.outline}
                keyboardType="numeric"
                value={amountRupees}
                onChangeText={setAmountRupees}
                autoFocus
              />
            </View>

            {/* Description */}
            <Text style={styles.inputLabel}>{t('home.descriptionLabel')}</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder={t('home.descriptionPlaceholder')}
              placeholderTextColor={Theme.colors.outline}
              value={description}
              onChangeText={setDescription}
            />

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.submitButton,
                  actionType === 'CREDIT_SALE'
                    ? styles.submitButtonCredit
                    : styles.submitButtonRepay,
                ]}
                onPress={handleSubmitQuickAction}
              >
                <Text style={styles.submitButtonText}>
                  {actionType === 'CREDIT_SALE'
                    ? t('home.saveCreditBtn')
                    : t('home.saveRepayBtn')}
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
    backgroundColor: Theme.colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  contentContainer: {
    paddingBottom: 90,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationAlertDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Theme.colors.moneyRed,
  },

  /* Monolithic Deep Navy Masthead */
  heroPanel: {
    backgroundColor: Theme.colors.primaryContainer,
    margin: Theme.spacing.gutter,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.primaryContainer,
    borderRadius: Theme.radii.none,
  },
  heroSubLabel: {
    ...Theme.typography.bodySm,
    color: Theme.colors.surfaceVariant,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  heroAmount: {
    color: Theme.colors.onPrimary,
    marginTop: 2,
    marginBottom: Theme.spacing.md,
  },
  heroDualRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: Theme.spacing.md,
  },
  heroColLeft: {
    flex: 1,
    paddingRight: Theme.spacing.sm,
  },
  heroColRight: {
    flex: 1,
    paddingLeft: Theme.spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroColLabel: {
    ...Theme.typography.bodySm,
    color: Theme.colors.surfaceVariant,
    fontWeight: '500',
  },
  heroColValue: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.onPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  heroColValueGreen: {
    ...Theme.typography.currencyStat,
    color: Theme.colors.secondaryContainer,
    fontWeight: '700',
    marginTop: 2,
  },

  /* Quick Actions Bar */
  quickActionBar: {
    flexDirection: 'row',
    marginHorizontal: Theme.spacing.gutter,
    marginBottom: Theme.spacing.md,
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    height: Theme.layout.minTouchTarget,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Theme.radii.none,
  },
  quickActionBtnLeft: {},
  quickActionTextRed: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.moneyRed,
    fontWeight: '700',
    fontSize: 15,
  },
  quickActionTextGreen: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.moneyGreen,
    fontWeight: '700',
    fontSize: 15,
  },

  /* Sections & Ruled Ledger Groups */
  sectionContainer: {
    marginTop: Theme.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.gutter,
    marginBottom: 6,
  },
  sectionHeaderLabel: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Theme.spacing.gutter,
    marginBottom: 6,
  },
  viewAllText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.secondary,
    fontWeight: '700',
  },
  ledgerGroup: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surface,
  },
  ledgerRow: {
    minHeight: 56,
    paddingHorizontal: Theme.spacing.gutter,
    paddingVertical: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
  },
  ledgerRowTextCol: {
    flex: 1,
    paddingRight: Theme.spacing.sm,
  },
  ledgerRowTitle: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.onSurface,
    fontWeight: '700',
  },
  ledgerRowSubtitle: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  actionPillBtn: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 6,
  },
  actionPillText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.secondary,
    fontWeight: '700',
  },
  ledgerRowAmountCol: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    ...Theme.typography.currencyStat,
    fontWeight: '700',
  },
  amountRed: {
    color: Theme.colors.moneyRed,
  },
  amountGreen: {
    color: Theme.colors.moneyGreen,
  },
  transactionLabel: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 1,
  },
  emptyRow: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  emptyRowText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurfaceVariant,
  },

  /* Footer Note */
  footerNote: {
    paddingVertical: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.gutter,
    alignItems: 'center',
  },
  footerNoteText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.outline,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  /* Contextual Floating Mic Action Button */
  voiceFab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: Theme.radii.full,
    backgroundColor: Theme.colors.primaryContainer,
    borderWidth: 1,
    borderColor: Theme.colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  voiceFabText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onPrimary,
    fontWeight: '700',
  },

  /* Quick Action Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: Theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.surface,
    borderTopWidth: 1,
    borderColor: Theme.colors.hairline,
    padding: Theme.spacing.gutter,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  modalTitle: {
    ...Theme.typography.titleMd,
    color: Theme.colors.onSurface,
    fontWeight: '700',
  },
  inputLabel: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  customerChipsRow: {
    marginBottom: Theme.spacing.md,
  },
  customerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.radii.none,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surface,
    marginRight: 8,
    alignItems: 'center',
  },
  customerChipSelected: {
    borderColor: Theme.colors.primaryContainer,
    backgroundColor: Theme.colors.primaryContainer,
  },
  customerChipText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurface,
    fontWeight: '600',
  },
  customerChipTextSelected: {
    color: Theme.colors.onPrimary,
  },
  chipDue: {
    ...Theme.typography.labelMd,
    color: Theme.colors.moneyRed,
    marginTop: 2,
  },
  chipDueSelected: {
    color: Theme.colors.onPrimary,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Theme.colors.primaryContainer,
    paddingVertical: 4,
    marginBottom: Theme.spacing.md,
  },
  rupeeSign: {
    fontSize: 24,
    fontWeight: '700',
    color: Theme.colors.primaryContainer,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    paddingVertical: 4,
  },
  descriptionInput: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    paddingVertical: 8,
    fontSize: 14,
    color: Theme.colors.onSurface,
    marginBottom: Theme.spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    height: Theme.layout.minTouchTarget,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    height: Theme.layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonCredit: {
    backgroundColor: Theme.colors.moneyRed,
  },
  submitButtonRepay: {
    backgroundColor: Theme.colors.moneyGreen,
  },
  submitButtonText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onPrimary,
    fontWeight: '700',
  },
});
