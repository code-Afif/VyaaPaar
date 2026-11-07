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
import { Palette } from '@/constants/Colors';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { Header } from '@/components/Header';
import { PaymentEventCard } from '@/components/PaymentEventCard';
import { formatPaise } from '@/utils/format';

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

  const totalCollectedToday = useMemo(() => {
    return paymentEvents.reduce((sum, p) => sum + p.amountPaise, 0);
  }, [paymentEvents]);

  const unmatchedCount = useMemo(() => {
    return paymentEvents.filter((p) => p.status === 'UNMATCHED').length;
  }, [paymentEvents]);

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
    // Generate a simulated payment from Ramesh Kumar (₹500) or Anita Devi (₹320)
    const newPay = simulateIncomingPayment(50000, 'Ramesh Kumar');
    Alert.alert(
      t('payments.simulatedAlertTitle'),
      t('payments.simulatedAlertMsg', {
        utr: newPay.referenceNo,
        name: 'Ramesh Kumar',
      })
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title={t('payments.headerTitle')}
        subtitle={t('payments.headerSubtitle')}
      />

      <View style={styles.container}>
        {/* Banner: Integration Notice */}
        <View style={styles.providerBanner}>
          <Ionicons name="information-circle" size={18} color={Palette.primaryBlueDark} />
          <View style={styles.providerTextCol}>
            <Text style={styles.providerTitle}>
              {t('payments.providerNoticeTitle')}
            </Text>
            <Text style={styles.providerSubtitle}>
              {t('payments.providerNoticeSub')}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('payments.totalQrPayments')}</Text>
            <Text style={styles.statValue}>
              {formatPaise(totalCollectedToday)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('payments.needsReconciliation')}</Text>
            <Text
              style={[
                styles.statValue,
                { color: unmatchedCount > 0 ? Palette.warningAmber : Palette.successGreen },
              ]}
            >
              {t('payments.unmatchedCount', { count: unmatchedCount })}
            </Text>
          </View>
        </View>

        {/* Action Button: Simulate Incoming Payment */}
        <View style={styles.actionRow}>
          <Pressable
            style={styles.simulateBtn}
            onPress={handleSimulatePayment}
            accessibilityLabel={t('payments.simulateBtn')}
          >
            <Ionicons name="flash" size={16} color={Palette.white} />
            <Text style={styles.simulateBtnText}>
              {t('payments.simulateBtn')}
            </Text>
          </Pressable>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterChip,
              activeFilter === 'ALL' && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === 'ALL' && styles.filterTextActive,
              ]}
            >
              {t('payments.tabAll', { count: paymentEvents.length })}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              activeFilter === 'UNMATCHED' && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter('UNMATCHED')}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === 'UNMATCHED' && styles.filterTextActive,
              ]}
            >
              {t('payments.tabUnmatched', { count: unmatchedCount })}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              activeFilter === 'RECONCILED' && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter('RECONCILED')}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === 'RECONCILED' && styles.filterTextActive,
              ]}
            >
              {t('payments.tabReconciled', {
                count: paymentEvents.filter((p) => p.status === 'RECONCILED').length,
              })}
            </Text>
          </Pressable>
        </View>

        {/* Payment Events List */}
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PaymentEventCard
              event={item}
              onConfirmMatch={handleConfirmMatch}
              onViewDetails={(id) => router.push(`/payment/${id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="checkmark-circle-outline"
                size={48}
                color={Palette.successGreen}
              />
              <Text style={styles.emptyTitle}>{t('payments.allSettledTitle')}</Text>
              <Text style={styles.emptySub}>
                {t('payments.allSettledSub')}
              </Text>
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
    backgroundColor: Palette.white,
  },
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  providerBanner: {
    backgroundColor: '#F0F9FF',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerTextCol: {
    flex: 1,
  },
  providerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
  },
  providerSubtitle: {
    fontSize: 10,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 6,
  },
  statBox: {
    flex: 1,
    backgroundColor: Palette.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
  },
  statLabel: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  actionRow: {
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  simulateBtn: {
    backgroundColor: Palette.darkNavy,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  simulateBtnText: {
    color: Palette.white,
    fontSize: 12,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterChipActive: {
    backgroundColor: Palette.primaryBlueLight,
    borderColor: Palette.primaryBlue,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  filterTextActive: {
    color: Palette.primaryBlueDark,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.darkNavy,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
});
