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
import { Theme } from '@/theme';
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
      {/* 56dp TopAppBar matching Stitch */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
          accessibilityLabel={t('common.close')}
        >
          <Ionicons name="arrow-back" size={22} color={Theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('paymentDetail.title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Payment Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.badgeRow}>
            <View style={styles.channelBadge}>
              <Ionicons name="qr-code" size={14} color={Theme.colors.primaryContainer} />
              <Text style={styles.channelBadgeText}>{t('paymentDetail.channelSoundbox')}</Text>
            </View>
            {payment.isSimulated && (
              <View style={styles.simulatedBadge}>
                <Text style={styles.simulatedBadgeText}>{t('paymentDetail.simulatedBadge')}</Text>
              </View>
            )}
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
              <Ionicons name="sparkles" size={16} color={Theme.colors.primaryContainer} />
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
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
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
              <Ionicons name="checkmark-done" size={20} color={Theme.colors.onPrimary} />
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
              color={Theme.colors.moneyGreen}
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
    backgroundColor: Theme.colors.surfaceCard,
  },
  header: {
    backgroundColor: Theme.colors.surfaceCard,
    paddingHorizontal: Theme.spacing.gutter,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    ...Theme.typography.titleMd,
    color: Theme.colors.onSurface,
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  contentContainer: {
    padding: Theme.spacing.gutter,
    paddingBottom: 40,
    gap: Theme.spacing.md,
  },
  amountCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    padding: Theme.spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radii.sm,
  },
  channelBadgeText: {
    ...Theme.typography.bodySm,
    fontWeight: '700',
    color: Theme.colors.primaryContainer,
  },
  simulatedBadge: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radii.sm,
  },
  simulatedBadgeText: {
    ...Theme.typography.bodySm,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
  },
  amountText: {
    fontSize: 32,
    fontWeight: '800',
    color: Theme.colors.moneyGreen,
    letterSpacing: -0.5,
  },
  statusLabel: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 2,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.hairline,
    marginVertical: Theme.spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLabel: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
  },
  metaValue: {
    ...Theme.typography.bodySm,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  reasonCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    padding: Theme.spacing.md,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  reasonTitle: {
    ...Theme.typography.labelMd,
    color: Theme.colors.primaryContainer,
  },
  reasonText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurface,
    lineHeight: 18,
  },
  selectionCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    padding: Theme.spacing.lg,
  },
  sectionTitle: {
    ...Theme.typography.titleMd,
    color: Theme.colors.onSurface,
    marginBottom: Theme.spacing.md,
  },
  customerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Theme.radii.sm,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    marginBottom: 8,
    backgroundColor: Theme.colors.surfaceCard,
  },
  customerOptionSelected: {
    borderColor: Theme.colors.primaryContainer,
    backgroundColor: Theme.colors.surfaceContainerLow,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Theme.colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: Theme.colors.primaryContainer,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.primaryContainer,
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
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  suggestedPill: {
    backgroundColor: Theme.colors.primaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Theme.radii.sm,
  },
  suggestedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
  },
  custDue: {
    ...Theme.typography.bodySm,
    color: Theme.colors.moneyRed,
    marginTop: 2,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: Theme.colors.moneyGreen,
    borderRadius: Theme.radii.md,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  confirmButtonText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onPrimary,
    fontWeight: '700',
  },
  alreadySettledCard: {
    backgroundColor: Theme.colors.moneyGreenBg,
    borderWidth: 1,
    borderColor: Theme.colors.moneyGreenBorder,
    borderRadius: Theme.radii.md,
    padding: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alreadySettledText: {
    ...Theme.typography.bodySm,
    fontWeight: '600',
    color: Theme.colors.moneyGreen,
    flex: 1,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  notFoundText: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.onSurfaceVariant,
  },
  backBtn: {
    backgroundColor: Theme.colors.primaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Theme.radii.sm,
  },
  backBtnText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onPrimary,
    fontWeight: '700',
  },
});
