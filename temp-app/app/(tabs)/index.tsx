import React, { useState } from 'react';
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
import { Palette } from '@/constants/Colors';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { VoiceFab } from '@/components/VoiceFab';
import { TransactionItem } from '@/components/TransactionItem';
import { formatPaise, rupeesToPaise } from '@/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const {
    briefing,
    ledgerEntries,
    customers,
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

  const recentTransactions = ledgerEntries.slice(0, 5);

  const handleOpenQuickAction = (type: 'CREDIT_SALE' | 'REPAYMENT') => {
    setActionType(type);
    setSelectedCustomerId(customers[0]?.id || '');
    setAmountRupees('');
    setDescription(type === 'CREDIT_SALE' ? t('home.descriptionCreditPlaceholder') : t('home.descriptionRepayPlaceholder'));
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Metric Cards Row */}
        <View style={styles.metricsRow}>
          <MetricCard
            title={t('home.todaySales')}
            subtitle={t('home.todaySalesSub')}
            amountPaise={briefing.totalSalesPaise}
            iconName="cart"
            variant="navy"
          />
        </View>

        <View style={styles.metricsTwoCol}>
          <MetricCard
            title={t('home.collected')}
            subtitle={t('home.collectedSub')}
            amountPaise={briefing.totalCollectedPaise}
            iconName="arrow-down-circle"
            variant="success"
            onPress={() => router.push('/(tabs)/payments')}
          />
          <MetricCard
            title={t('home.outstandingDue')}
            subtitle={t('home.outstandingDueSub')}
            amountPaise={briefing.totalOutstandingPaise}
            iconName="book"
            variant="danger"
            onPress={() => router.push('/(tabs)/khata')}
          />
        </View>

        {/* Voice Assistant Entry Banner */}
        <VoiceFab />

        {/* Quick Actions (Naya Udhaar / Paisa Mila) */}
        <View style={styles.quickActionsContainer}>
          <Pressable
            style={[styles.quickActionButton, styles.creditSaleButton]}
            onPress={() => handleOpenQuickAction('CREDIT_SALE')}
            accessibilityLabel={t('home.quickCreditTitle')}
          >
            <View style={styles.quickActionIconRed}>
              <Ionicons name="arrow-up" size={18} color={Palette.dangerRed} />
            </View>
            <View style={styles.quickActionTextCol}>
              <Text style={styles.quickActionTitleRed}>{t('home.quickCreditTitle')}</Text>
              <Text style={styles.quickActionSub}>{t('home.quickCreditSub')}</Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.quickActionButton, styles.repaymentButton]}
            onPress={() => handleOpenQuickAction('REPAYMENT')}
            accessibilityLabel={t('home.quickRepayTitle')}
          >
            <View style={styles.quickActionIconGreen}>
              <Ionicons name="arrow-down" size={18} color={Palette.successGreen} />
            </View>
            <View style={styles.quickActionTextCol}>
              <Text style={styles.quickActionTitleGreen}>{t('home.quickRepayTitle')}</Text>
              <Text style={styles.quickActionSub}>{t('home.quickRepaySub')}</Text>
            </View>
          </Pressable>
        </View>

        {/* AI Business Recommendation Card */}
        <View style={styles.recommendationCard}>
          <View style={styles.recHeaderRow}>
            <View style={styles.recBadge}>
              <Ionicons name="sparkles" size={14} color={Palette.primaryBlueDark} />
              <Text style={styles.recBadgeText}>{t('home.aiBriefingBadge')}</Text>
            </View>
            <Text style={styles.recDate}>Grounding: Verified</Text>
          </View>

          <Text style={styles.recTitle}>{t('home.aiRecTitle')}</Text>
          <Text style={styles.recDescription}>
            {t('home.aiRecBody')}
          </Text>

          <Pressable
            style={styles.recActionButton}
            onPress={() => router.push('/(tabs)/insights')}
          >
            <Text style={styles.recActionText}>
              {t('home.aiRecAction')} →
            </Text>
          </Pressable>
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('home.recentTxTitle')}</Text>
          <Pressable onPress={() => router.push('/(tabs)/khata')}>
            <Text style={styles.viewAllText}>{t('home.viewAll')} →</Text>
          </Pressable>
        </View>

        <View style={styles.transactionsCard}>
          {recentTransactions.map((item) => (
            <TransactionItem
              key={item.id}
              entry={item}
              onPress={() => router.push(`/customer/${item.customerId}`)}
            />
          ))}
        </View>

        {/* Footer info note */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark" size={14} color={Palette.textMuted} />
          <Text style={styles.footerNoteText}>
            DukaanSaathi • Exact Paise Ledger
          </Text>
        </View>
      </ScrollView>

      {/* Quick Action Modal */}
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
                <Ionicons name="close-circle" size={24} color={Palette.textSecondary} />
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
                        ({t('card.due')}: {formatPaise(c.currentBalancePaise)})
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Amount input */}
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

            {/* Description input */}
            <Text style={styles.inputLabel}>{t('home.description')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={
                actionType === 'CREDIT_SALE'
                  ? t('home.descriptionCreditPlaceholder')
                  : t('home.descriptionRepayPlaceholder')
              }
              placeholderTextColor={Palette.textMuted}
              value={description}
              onChangeText={setDescription}
            />

            {/* Submit button */}
            <Pressable
              style={[
                styles.modalSubmitButton,
                {
                  backgroundColor:
                    actionType === 'CREDIT_SALE'
                      ? Palette.dangerRed
                      : Palette.successGreen,
                },
              ]}
              onPress={handleSubmitQuickAction}
            >
              <Text style={styles.modalSubmitText}>
                {t('home.saveTransaction')}
              </Text>
            </Pressable>
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
    paddingBottom: 32,
  },
  metricsRow: {
    marginBottom: 10,
  },
  metricsTwoCol: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 6,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: Palette.white,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  creditSaleButton: {
    borderColor: '#FECACA',
  },
  repaymentButton: {
    borderColor: '#A7F3D0',
  },
  quickActionIconRed: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.dangerRedLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconGreen: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.successGreenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTextCol: {
    flex: 1,
  },
  quickActionTitleRed: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.dangerRed,
  },
  quickActionTitleGreen: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.successGreen,
  },
  quickActionSub: {
    fontSize: 10,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  recommendationCard: {
    backgroundColor: Palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: Palette.primaryBlue,
  },
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
    letterSpacing: 0.5,
  },
  recDate: {
    fontSize: 10,
    color: Palette.textMuted,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.darkNavy,
    marginBottom: 4,
  },
  recDescription: {
    fontSize: 12,
    color: Palette.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  recActionButton: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.primaryBlueLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  recActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primaryBlueDark,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.primaryBlue,
  },
  transactionsCard: {
    backgroundColor: Palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
  },
  footerNoteText: {
    fontSize: 11,
    color: Palette.textMuted,
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
    fontSize: 18,
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
  customerChipsRow: {
    marginBottom: 12,
  },
  customerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    marginRight: 8,
    alignItems: 'center',
  },
  customerChipSelected: {
    backgroundColor: Palette.primaryBlueLight,
    borderColor: Palette.primaryBlue,
  },
  customerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  customerChipTextSelected: {
    color: Palette.primaryBlueDark,
  },
  chipDue: {
    fontSize: 10,
    color: Palette.dangerRed,
    marginTop: 2,
  },
  chipDueSelected: {
    color: Palette.dangerRed,
    fontWeight: '700',
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
});
