import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { ScreenHeader } from '@/components/ui';
import { formatPaise } from '@/utils/format';
import { PaymentEvent } from '@/types';

type PaymentFilter = 'ALL' | 'UNMATCHED' | 'RECONCILED';

export default function PaymentsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { paymentEvents, reconcilePayment, simulateIncomingPayment, customers } = useApp();

  const [activeFilter, setActiveFilter] = useState<PaymentFilter>('ALL');

  const filteredEvents = useMemo(() => {
    return paymentEvents.filter((p) => {
      if (activeFilter === 'UNMATCHED') return p.status === 'UNMATCHED';
      if (activeFilter === 'RECONCILED') return p.status === 'RECONCILED';
      return true;
    });
  }, [paymentEvents, activeFilter]);

  // Total QR payments strictly computed from paymentEvents
  const totalCollectedQrPaise = useMemo(() => {
    return paymentEvents.reduce((sum, p) => sum + p.amountPaise, 0);
  }, [paymentEvents]);

  const unmatchedCount = useMemo(() => {
    return paymentEvents.filter((p) => p.status === 'UNMATCHED').length;
  }, [paymentEvents]);

  const reconciledCount = useMemo(() => {
    return paymentEvents.filter((p) => p.status === 'RECONCILED').length;
  }, [paymentEvents]);

  // Exact confirmation wiring preserved from existing implementation
  const handleConfirmMatch = (paymentId: string, customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    const payment = paymentEvents.find((p) => p.id === paymentId);

    if (!payment || !customer) return;

    Alert.alert(
      t('payments.confirmMatchTitle'),
      t('payments.confirmMatchMsg', {
        amount: formatPaise(payment.amountPaise),
        name: customer.name,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('payments.confirmMatchBtn'),
          style: 'default',
          onPress: () => {
            reconcilePayment(paymentId, customerId);
            Alert.alert(
              t('payments.reconciledSuccessTitle'),
              t('payments.reconciledSuccessMsg', {
                amount: formatPaise(payment.amountPaise),
                name: customer.name,
              })
            );
          },
        },
      ]
    );
  };

  const handleSimulatePayment = () => {
    const newPay = simulateIncomingPayment(50000, 'Ramesh Kumar');
    Alert.alert(
      t('payments.simulatedAlertTitle'),
      t('payments.simulatedAlertMsg', {
        utr: newPay.referenceNo,
        name: 'Ramesh Kumar',
      })
    );
  };

  const renderPaymentRow = ({ item }: { item: PaymentEvent }) => {
    const isReconciled = item.status === 'RECONCILED';
    const hasSuggestion = Boolean(item.suggestedCustomerId);
    const isDemo = Boolean(item.isSimulated);

    return (
      <View style={styles.card}>
        {/* Top Row: Channel, Payer & Amount */}
        <View style={styles.cardTopRow}>
          <View style={styles.payerLeftCol}>
            <View style={styles.qrIconBadge}>
              <Ionicons name="qr-code" size={16} color={Theme.colors.secondary} />
            </View>
            <View style={styles.payerInfo}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.payerName} numberOfLines={1}>
                  {item.payerName || 'Unknown Customer'}
                </Text>
                {isDemo && (
                  <View style={styles.demoBadge}>
                    <Text style={styles.demoBadgeText}>DEMO</Text>
                  </View>
                )}
              </View>
              <Text style={styles.refText}>{item.referenceNo}</Text>
            </View>
          </View>

          <View style={styles.amountCol}>
            <Text style={styles.amountText}>+{formatPaise(item.amountPaise)}</Text>
            <View
              style={[
                styles.statusPill,
                isReconciled ? styles.statusPillReconciled : styles.statusPillUnmatched,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isReconciled ? styles.statusTextReconciled : styles.statusTextUnmatched,
                ]}
              >
                {isReconciled ? t('card.reconciled') : t('card.unmatched')}
              </Text>
            </View>
          </View>
        </View>

        {/* Time Stamp Row */}
        <View style={styles.metaRow}>
          <Text style={styles.timeText}>{item.timestamp}</Text>
          <Text style={styles.channelText}>Paytm Soundbox QR</Text>
        </View>

        {/* AI Suggested Match Box */}
        {hasSuggestion && !isReconciled && (
          <View style={styles.suggestionBox}>
            <View style={styles.suggestionHeader}>
              <Ionicons name="sparkles" size={14} color={Theme.colors.primary} />
              <Text style={styles.suggestionTitle}>
                {t('card.suggestedMatch', { name: item.suggestedCustomerName || '' })}
              </Text>
            </View>
            <Text style={styles.suggestionReason}>{item.matchReason}</Text>

            <View style={styles.actionRow}>
              <Pressable
                style={styles.confirmBtn}
                onPress={() => handleConfirmMatch(item.id, item.suggestedCustomerId!)}
                accessibilityLabel={t('card.confirmMatchAndSettle')}
              >
                <Ionicons name="checkmark-circle" size={15} color={Theme.colors.white} />
                <Text style={styles.confirmBtnText}>
                  {t('card.confirmMatchAndSettle')}
                </Text>
              </Pressable>

              <Pressable
                style={styles.detailsBtn}
                onPress={() => router.push(`/payment/${item.id}`)}
                accessibilityLabel={t('common.details')}
              >
                <Text style={styles.detailsBtnText}>{t('common.details')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Already Reconciled Box */}
        {isReconciled && (
          <View style={styles.reconciledBox}>
            <Ionicons name="checkmark-done-circle" size={16} color={Theme.colors.moneyGreen} />
            <Text style={styles.reconciledText}>
              {t('card.reconciledToKhata', { name: item.suggestedCustomerName || 'Customer' })}
            </Text>
          </View>
        )}

        {/* Unmatched without suggestion */}
        {!hasSuggestion && !isReconciled && (
          <View style={styles.unmatchedBox}>
            <Text style={styles.unmatchedReason}>
              {item.matchReason || 'QR payment received. Link to a customer khata to settle udhaar.'}
            </Text>
            <Pressable
              style={styles.manualMatchBtn}
              onPress={() => router.push(`/payment/${item.id}`)}
              accessibilityLabel={t('card.manualMatch')}
            >
              <Ionicons name="person-add-outline" size={14} color={Theme.colors.primary} />
              <Text style={styles.manualMatchBtnText}>{t('card.manualMatch')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 56dp TopAppBar matching Stitch */}
      <ScreenHeader
        title={t('payments.headerTitle')}
        subtitle={t('payments.headerSubtitle')}
        rightAction={
          <Pressable
            style={styles.simulateBtnSmall}
            onPress={handleSimulatePayment}
            hitSlop={8}
            accessibilityLabel={t('payments.simulateBtn')}
          >
            <Ionicons name="flash" size={14} color={Theme.colors.primary} />
            <Text style={styles.simulateBtnSmallText}>Demo Test</Text>
          </Pressable>
        }
      />

      <View style={styles.container}>
        {/* Monolithic QR Aggregates Masthead */}
        <View style={styles.masthead}>
          <Text style={styles.mastheadLabel}>{t('payments.totalQrPayments')}</Text>
          <Text style={styles.mastheadAmount}>
            +{formatPaise(totalCollectedQrPaise)}
          </Text>

          {/* Aggregates Summary Row */}
          <View style={styles.mastheadStatsRow}>
            <View style={styles.mastheadStatItem}>
              <Text style={styles.mastheadStatLabel}>
                {t('payments.needsReconciliation')}
              </Text>
              <View
                style={[
                  styles.mastheadBadge,
                  unmatchedCount > 0 ? styles.badgeAmber : styles.badgeGreen,
                ]}
              >
                <Text
                  style={[
                    styles.mastheadBadgeText,
                    unmatchedCount > 0 ? styles.badgeTextAmber : styles.badgeTextGreen,
                  ]}
                >
                  {unmatchedCount} {t('card.unmatched')}
                </Text>
              </View>
            </View>

            <View style={styles.mastheadDivider} />

            <View style={styles.mastheadStatItem}>
              <Text style={styles.mastheadStatLabel}>
                {t('card.reconciled')}
              </Text>
              <View style={[styles.mastheadBadge, styles.badgeGreen]}>
                <Text style={[styles.mastheadBadgeText, styles.badgeTextGreen]}>
                  {reconciledCount} {t('card.reconciled')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Plain Text Ruled Filter Tabs matching Stitch */}
        <View style={styles.filterTabsRow}>
          <Pressable
            style={[styles.filterTab, activeFilter === 'ALL' && styles.filterTabActive]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text
              style={[styles.filterTabText, activeFilter === 'ALL' && styles.filterTabTextActive]}
            >
              {t('payments.tabAll', { count: '' }).trim()}
            </Text>
            <Text style={styles.filterTabCount}>({paymentEvents.length})</Text>
          </Pressable>

          <Pressable
            style={[styles.filterTab, activeFilter === 'UNMATCHED' && styles.filterTabActive]}
            onPress={() => setActiveFilter('UNMATCHED')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'UNMATCHED' && styles.filterTabTextActive,
              ]}
            >
              {t('payments.tabUnmatched', { count: '' }).trim()}
            </Text>
            <Text
              style={[
                styles.filterTabCount,
                unmatchedCount > 0 && styles.filterTabCountAmber,
              ]}
            >
              ({unmatchedCount})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterTab, activeFilter === 'RECONCILED' && styles.filterTabActive]}
            onPress={() => setActiveFilter('RECONCILED')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'RECONCILED' && styles.filterTabTextActive,
              ]}
            >
              {t('payments.tabReconciled', { count: '' }).trim()}
            </Text>
            <Text style={styles.filterTabCount}>({reconciledCount})</Text>
          </Pressable>
        </View>

        {/* Payment Events List */}
        <FlatList
          style={styles.list}
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderPaymentRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="checkmark-circle-outline"
                size={44}
                color={Theme.colors.moneyGreen}
              />
              <Text style={styles.emptyTitle}>{t('payments.allSettledTitle')}</Text>
              <Text style={styles.emptySub}>{t('payments.allSettledSub')}</Text>
            </View>
          }
        />
      </View>
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

  /* Top Right Action Button */
  simulateBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Theme.radii.sm,
  },
  simulateBtnSmallText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.primary,
  },

  /* Masthead */
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
    color: Theme.colors.moneyGreenBorder,
    marginTop: 4,
  },
  mastheadStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.md,
    gap: 16,
  },
  mastheadStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  mastheadStatLabel: {
    ...Theme.typography.labelMd,
    color: Theme.colors.surfaceContainerHigh,
    fontSize: 10,
  },
  mastheadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.radii.full,
  },
  badgeAmber: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
  },
  badgeGreen: {
    backgroundColor: 'rgba(30, 142, 62, 0.25)',
  },
  mastheadBadgeText: {
    ...Theme.typography.labelMd,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextAmber: {
    color: '#FFD54F',
  },
  badgeTextGreen: {
    color: Theme.colors.moneyGreenBorder,
  },
  mastheadDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  /* Plain Text Ruled Filter Tabs */
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.gutter,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surface,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 4,
  },
  filterTabActive: {
    borderBottomColor: Theme.colors.primaryContainer,
  },
  filterTabText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: Theme.colors.primaryContainer,
    fontWeight: '700',
  },
  filterTabCount: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
  },
  filterTabCountAmber: {
    color: '#B78103',
    fontWeight: '700',
  },

  /* List */
  list: {
    flex: 1,
  },
  listContent: {
    padding: Theme.spacing.gutter,
    gap: Theme.spacing.md,
  },

  /* Payment Card */
  card: {
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    padding: Theme.spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  payerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  qrIconBadge: {
    width: 36,
    height: 36,
    borderRadius: Theme.radii.sm,
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payerInfo: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payerName: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  demoBadge: {
    backgroundColor: Theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  demoBadgeText: {
    ...Theme.typography.labelMd,
    fontSize: 9,
    color: Theme.colors.outline,
    fontWeight: '700',
  },
  refText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.outline,
    marginTop: 1,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    ...Theme.typography.bodyLg,
    fontWeight: '700',
    color: Theme.colors.moneyGreen,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.sm,
    marginTop: 4,
    borderWidth: 1,
  },
  statusPillReconciled: {
    backgroundColor: Theme.colors.moneyGreenBg,
    borderColor: Theme.colors.moneyGreenBorder,
  },
  statusPillUnmatched: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFE082',
  },
  statusText: {
    ...Theme.typography.labelMd,
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextReconciled: {
    color: Theme.colors.moneyGreen,
  },
  statusTextUnmatched: {
    color: '#8D6E00',
  },

  /* Meta Row */
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.hairline,
  },
  timeText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.outline,
  },
  channelText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    fontSize: 10,
  },

  /* Suggestion Box */
  suggestionBox: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    padding: 10,
    marginTop: 10,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  suggestionTitle: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  suggestionReason: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: Theme.colors.primaryContainer,
    borderRadius: Theme.radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    gap: 6,
  },
  confirmBtnText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.white,
    fontWeight: '700',
  },
  detailsBtn: {
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surfaceCard,
  },
  detailsBtnText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurface,
  },

  /* Reconciled Info Box */
  reconciledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.moneyGreenBg,
    borderWidth: 1,
    borderColor: Theme.colors.moneyGreenBorder,
    borderRadius: Theme.radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  reconciledText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.moneyGreen,
    fontWeight: '600',
  },

  /* Unmatched Box */
  unmatchedBox: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: Theme.radii.sm,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    padding: 10,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  unmatchedReason: {
    flex: 1,
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
  },
  manualMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    backgroundColor: Theme.colors.surfaceCard,
  },
  manualMatchBtnText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.primary,
    fontWeight: '700',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.onSurface,
    fontWeight: '700',
  },
  emptySub: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurfaceVariant,
  },
});
