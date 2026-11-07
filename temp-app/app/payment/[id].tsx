import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette } from '@/constants/Colors';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatPaise } from '@/utils/format';

export default function PaymentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const { paymentEvents, customers, reconcilePayment } = useApp();

  const payment = paymentEvents.find((p) => p.id === id);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    payment?.suggestedCustomerId || customers[0]?.id || ''
  );

  if (!payment) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>{t('paymentDetail.notFound')}</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t('paymentDetail.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isReconciled = payment.status === 'RECONCILED';

  const handleReconcile = () => {
    if (!selectedCustomerId) {
      Alert.alert(t('paymentDetail.customerRequiredTitle'), t('paymentDetail.customerRequiredMsg'));
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) return;

    reconcilePayment(payment.id, selectedCustomerId);

    Alert.alert(
      t('paymentDetail.reconcileSuccessTitle'),
      t('paymentDetail.reconcileSuccessMsg', { amount: formatPaise(payment.amountPaise), name: customer.name }),
      [
        {
          text: t('paymentDetail.viewKhataBtn'),
          onPress: () => router.replace(`/customer/${customer.id}`),
        },
        {
          text: t('paymentDetail.doneBtn'),
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="close" size={24} color={Palette.darkNavy} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('paymentDetail.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Payment Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.badgeRow}>
            <View style={styles.channelBadge}>
              <Ionicons name="qr-code" size={14} color={Palette.primaryBlueDark} />
              <Text style={styles.channelBadgeText}>{t('paymentDetail.channelSoundbox')}</Text>
            </View>
            <View style={styles.simulatedBadge}>
              <Text style={styles.simulatedBadgeText}>{t('paymentDetail.simulatedBadge')}</Text>
            </View>
          </View>

          <Text style={styles.amountText}>
            +{formatPaise(payment.amountPaise)}
          </Text>
          <Text style={styles.statusLabel}>
            {isReconciled ? t('paymentDetail.statusReconciled') : t('paymentDetail.statusUnmatched')}
          </Text>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('paymentDetail.utrLabel')}</Text>
            <Text style={styles.metaValue}>{payment.referenceNo}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('paymentDetail.payerNameLabel')}</Text>
            <Text style={styles.metaValue}>{payment.payerName || 'N/A'}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('paymentDetail.upiLabel')}</Text>
            <Text style={styles.metaValue}>{payment.upiId || 'N/A'}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('paymentDetail.timeLabel')}</Text>
            <Text style={styles.metaValue}>{payment.timestamp}</Text>
          </View>
        </View>

        {/* AI Suggested Match Explanation */}
        {payment.matchReason && (
          <View style={styles.reasonCard}>
            <View style={styles.reasonHeader}>
              <Ionicons name="sparkles" size={16} color={Palette.primaryBlueDark} />
              <Text style={styles.reasonTitle}>{t('paymentDetail.aiReasoningTitle')}</Text>
            </View>
            <Text style={styles.reasonText}>{payment.matchReason}</Text>
          </View>
        )}

        {/* Select Customer to Reconcile */}
        {!isReconciled ? (
          <View style={styles.selectionCard}>
            <Text style={styles.sectionTitle}>
              {t('paymentDetail.selectKhataHeading')}
            </Text>

            {customers.map((c) => {
              const isSelected = c.id === selectedCustomerId;
              const isSuggested = c.id === payment.suggestedCustomerId;

              return (
                <Pressable
                  key={c.id}
                  style={[
                    styles.customerOption,
                    isSelected && styles.customerOptionSelected,
                  ]}
                  onPress={() => setSelectedCustomerId(c.id)}
                >
                  <View style={styles.radioCircle}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>

                  <View style={styles.custInfoCol}>
                    <View style={styles.custNameRow}>
                      <Text style={styles.custName}>{c.name}</Text>
                      {isSuggested && (
                        <View style={styles.suggestedPill}>
                          <Text style={styles.suggestedPillText}>
                            {t('paymentDetail.bestMatch')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.custDue}>
                      {t('paymentDetail.dueLabel', { amount: formatPaise(c.currentBalancePaise) })}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            <Pressable style={styles.confirmButton} onPress={handleReconcile}>
              <Ionicons name="checkmark-done" size={20} color={Palette.white} />
              <Text style={styles.confirmButtonText}>
                {t('paymentDetail.confirmSettleBtn')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.alreadySettledCard}>
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={Palette.successGreen}
            />
            <Text style={styles.alreadySettledText}>
              {t('paymentDetail.alreadySettledText')}
            </Text>
          </View>
        )}
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
    paddingBottom: 40,
  },
  amountCard: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primaryBlueLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  channelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
  },
  simulatedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  simulatedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  amountText: {
    fontSize: 32,
    fontWeight: '800',
    color: Palette.successGreen,
    letterSpacing: -0.5,
  },
  statusLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Palette.borderLight,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.darkNavy,
  },
  reasonCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 14,
    marginBottom: 14,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  reasonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
  },
  reasonText: {
    fontSize: 12,
    color: Palette.darkNavy,
    lineHeight: 18,
  },
  selectionCard: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.darkNavy,
    marginBottom: 12,
  },
  customerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 8,
    backgroundColor: Palette.white,
  },
  customerOptionSelected: {
    borderColor: Palette.primaryBlue,
    backgroundColor: Palette.primaryBlueLight,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Palette.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.primaryBlue,
  },
  custInfoCol: {
    flex: 1,
  },
  custNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  custName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  suggestedPill: {
    backgroundColor: Palette.primaryBlue,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  suggestedPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: Palette.white,
  },
  custDue: {
    fontSize: 12,
    color: Palette.dangerRed,
    marginTop: 2,
  },
  confirmButton: {
    backgroundColor: Palette.successGreen,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    elevation: 2,
  },
  confirmButtonText: {
    color: Palette.white,
    fontSize: 14,
    fontWeight: '700',
  },
  alreadySettledCard: {
    backgroundColor: Palette.successGreenLight,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alreadySettledText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.successGreen,
    flex: 1,
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
});
