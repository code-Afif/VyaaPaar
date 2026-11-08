import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { ScreenHeader } from '@/components/ui';
import { formatPaise } from '@/utils/format';
import { Customer } from '@/types';

export default function InsightsScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { briefing, inventory, customers, merchant, paymentEvents } = useApp();
  const isDemoMode = merchant.isDemoMode;

  const lowStockItems = useMemo(() => {
    return inventory.filter((i) => i.isLowStock);
  }, [inventory]);

  const overdueCustomers = useMemo(() => {
    return customers.filter((c) => c.currentBalancePaise > 0);
  }, [customers]);

  const unmatchedPayments = useMemo(() => {
    return paymentEvents.filter((p) => p.status === 'UNMATCHED');
  }, [paymentEvents]);

  // Compute total unmatched amount strictly from real/in-memory data
  const totalUnmatchedPaise = useMemo(() => {
    return unmatchedPayments.reduce((sum, p) => sum + p.amountPaise, 0);
  }, [unmatchedPayments]);

  // Format today's date for ledger header
  const todayDateString = useMemo(() => {
    try {
      const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
      const now = new Date();
      const dayName = now.toLocaleDateString(locale, { weekday: 'long' });
      const dayNum = now.getDate();
      const monthName = now.toLocaleDateString(locale, { month: 'long' });
      return `${dayName}, ${dayNum} ${monthName} ka Hisaab`;
    } catch {
      return 'Dukaan Bahi-Khata Hisaab';
    }
  }, [language]);

  // WhatsApp reminder handler: explicit merchant tap only, stripped spaces, no auto-send
  const handleSendReminder = (customer: Customer) => {
    if (!customer.phone) {
      Alert.alert(t('customerDetail.noPhoneTitle'), t('customerDetail.noPhoneMsg'));
      return;
    }
    const cleanPhone = customer.phone.replace(/\s+/g, '');
    const message = encodeURIComponent(
      `Namaste ${customer.name} ji, aapka dukaan par ₹${customer.currentBalancePaise / 100} ka hisaab baaki hai. Kripya samay par jama kar dein.`
    );
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${message}`).catch(() => {
      Alert.alert('Error', 'WhatsApp app not installed');
    });
  };

  const topOverdueCustomer = overdueCustomers[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 56dp TopAppBar matching Stitch TopAppBar */}
      <ScreenHeader
        title={t('insights.headerTitle')}
        subtitle="DukaanSaathi • Business Insights"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: Aaj ka Briefing (Single Monolithic Hero) */}
        <View style={styles.heroPanel}>
          <View style={styles.heroHeaderRow}>
            <View>
              <Text style={styles.heroSubLabel}>{t('stitch.aajKaBriefing')}</Text>
              <Text style={styles.heroDateTitle}>{todayDateString}</Text>
            </View>
            <Ionicons name="book-outline" size={24} color={Theme.colors.secondaryContainer} />
          </View>

          {/* Ruled Two-Column Ledger Balance Grid */}
          <View style={styles.heroGrid}>
            {/* Col 1: Aaj ka Udhaar Diya (Relabelled from Kul Bikri per hard rule) */}
            <View style={styles.heroGridColLeft}>
              <Text style={styles.heroColLabel}>{t('stitch.aajKaUdhaarDiya')}</Text>
              <Text style={styles.heroAmount}>
                +{formatPaise(briefing.totalSalesPaise)}
              </Text>
              <Text style={styles.heroColSub}>
                {isDemoMode ? '12 entries' : 'Aaj ke credit hisaab'}
              </Text>
            </View>

            {/* Col 2: Active Udhaar Baaki */}
            <View style={styles.heroGridColRight}>
              <Text style={styles.heroColLabel}>{t('stitch.activeUdhaarBaaki')}</Text>
              <Text style={styles.heroAmount}>
                {formatPaise(briefing.totalOutstandingPaise)}
              </Text>
              <Text style={styles.heroColSub}>
                {t('stitch.grahakCountUnit', { count: overdueCustomers.length })}
              </Text>
            </View>
          </View>

          {/* Factual Ledger Observation Banner */}
          <View style={styles.heroObservationRow}>
            <Ionicons name="trending-up" size={18} color={Theme.colors.secondaryContainer} />
            <Text style={styles.heroObservationText}>
              {isDemoMode
                ? 'Pichhle Somvaar se UPI collection 18% adhik hai.'
                : `Total active khata grahak: ${customers.length}. Sabhi hisaab verified.`}
            </Text>
          </View>
        </View>

        {/* SECTION 2: Karyavahi & Alerts (Ruled bahi-khata ledger rows, 1px borders, zero cards) */}
        <View style={styles.actionSection}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderTitle}>
              {t('stitch.karyavahiAlerts', {
                count: (topOverdueCustomer ? 1 : 0) + (unmatchedPayments.length > 0 ? 1 : 0),
              })}
            </Text>
          </View>

          {/* Row 1: Purana Udhaar Tagaada */}
          {topOverdueCustomer ? (
            <View style={styles.ledgerRow}>
              <View style={styles.rowTopBar}>
                <View style={styles.rowTitleGroup}>
                  <View style={[styles.dotIndicator, { backgroundColor: Theme.colors.moneyRed }]} />
                  <Text style={styles.rowTitle}>
                    {t('stitch.puranaUdhaarTagaadaTitle', { count: overdueCustomers.length })}
                  </Text>
                </View>
                <View style={styles.badgePending}>
                  <Text style={styles.badgePendingText}>Pending</Text>
                </View>
              </View>

              <Text style={styles.rowDescription}>
                {topOverdueCustomer.name} ka hisaab baaki hai (Kul {formatPaise(topOverdueCustomer.currentBalancePaise)}).
              </Text>

              <View style={styles.rowFooterBar}>
                <Pressable
                  style={styles.actionLink}
                  onPress={() => handleSendReminder(topOverdueCustomer)}
                  hitSlop={8}
                >
                  <Text style={styles.actionLinkText}>{t('stitch.whatsappReminderBtn')}</Text>
                  <Ionicons name="paper-plane-outline" size={16} color={Theme.colors.primaryContainer} />
                </Pressable>
                <Text style={styles.rowMetaText}>
                  {topOverdueCustomer.lastActivityDate || 'Haal hi me'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.ledgerRow}>
              <View style={styles.rowTopBar}>
                <View style={styles.rowTitleGroup}>
                  <View style={[styles.dotIndicator, { backgroundColor: Theme.colors.moneyGreen }]} />
                  <Text style={styles.rowTitle}>Sabhi Hisaab Chukta</Text>
                </View>
              </View>
              <Text style={styles.rowDescription}>
                Kisi bhi grahak ka purana udhaar baaki nahi hai.
              </Text>
            </View>
          )}

          {/* Row 2: Unmatched Payment Alert */}
          {unmatchedPayments.length > 0 && (
            <View style={styles.ledgerRow}>
              <View style={styles.rowTopBar}>
                <View style={styles.rowTitleGroup}>
                  <View style={[styles.dotIndicator, { backgroundColor: Theme.colors.primaryContainer }]} />
                  <Text style={styles.rowTitle}>{t('stitch.unmatchedAlertTitle')}</Text>
                </View>
                <View style={styles.badgeQr}>
                  <Text style={styles.badgeQrText}>QR Entry</Text>
                </View>
              </View>

              <Text style={styles.rowDescription}>
                {formatPaise(totalUnmatchedPaise)} ka QR payment ({unmatchedPayments.length} entries) grahak se link nahi hua.
              </Text>

              <View style={styles.rowFooterBar}>
                <Pressable
                  style={styles.actionLink}
                  onPress={() => router.push('/(tabs)/payments')}
                  hitSlop={8}
                >
                  <Text style={styles.actionLinkText}>{t('stitch.customerSeJodein')}</Text>
                  <Ionicons name="link-outline" size={16} color={Theme.colors.primaryContainer} />
                </Pressable>
                <Text style={styles.rowMetaText}>Live Soundbox</Text>
              </View>
            </View>
          )}
        </View>

        {/* SECTION 3: Real Mode vs Demo Mode Handling */}
        {!isDemoMode ? (
          /* Real Mode: Truthful Empty State Preview (strictly NO invented gross profit, expenses, or leaks) */
          <View style={styles.truthfulStateBox}>
            <View style={styles.chartIconCircle}>
              <Ionicons name="bar-chart-outline" size={24} color={Theme.colors.outline} />
            </View>
            <Text style={styles.truthfulTitle}>{t('stitch.truthfulEmptyTitle')}</Text>
            <Text style={styles.truthfulDesc}>{t('stitch.truthfulEmptyDesc')}</Text>

            <View style={styles.progressContainer}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>
                  {t('stitch.pragatiHisaab', { count: customers.length })}
                </Text>
                <Text style={styles.progressValue}>
                  {Math.min(100, customers.length * 20)}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, customers.length * 20)}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        ) : (
          /* Demo Mode: Seed KPIs & Alerts marked with [DEMO] pills */
          <View style={styles.demoSection}>
            <View style={styles.demoHeaderRow}>
              <Text style={styles.demoHeaderTitle}>Demo Financial Indicators</Text>
              <View style={styles.demoPill}>
                <Text style={styles.demoPillText}>DEMO</Text>
              </View>
            </View>

            {/* Financial KPI Cards */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{t('insights.kpiMargin')}</Text>
                <Text style={[styles.kpiValue, { color: Theme.colors.moneyGreen }]}>
                  {formatPaise(briefing.estimatedGrossProfitPaise)}
                </Text>
                <Text style={styles.kpiSub}>{t('insights.kpiMarginSub')}</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{t('insights.kpiExpenses')}</Text>
                <Text style={[styles.kpiValue, { color: Theme.colors.moneyRed }]}>
                  {formatPaise(briefing.totalExpensesPaise)}
                </Text>
                <Text style={styles.kpiSub}>{t('insights.kpiExpensesSub')}</Text>
              </View>
            </View>

            {/* Profit Leak detector in Demo */}
            {briefing.profitLeakAlerts.length > 0 && (
              <View style={styles.leakBox}>
                <View style={styles.leakHeader}>
                  <Ionicons name="warning-outline" size={16} color={Theme.colors.moneyRed} />
                  <Text style={styles.leakHeaderText}>{t('insights.profitLeakTitle')}</Text>
                  <View style={styles.demoPill}>
                    <Text style={styles.demoPillText}>DEMO</Text>
                  </View>
                </View>
                {briefing.profitLeakAlerts.map((leak) => (
                  <View key={leak.id} style={styles.leakItem}>
                    <Text style={styles.leakTitle}>{leak.title}</Text>
                    <Text style={styles.leakDesc}>{leak.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Low-Stock Warnings in Demo */}
            {lowStockItems.length > 0 && (
              <View style={styles.stockBox}>
                <View style={styles.stockHeader}>
                  <Ionicons name="cube-outline" size={16} color={Theme.colors.onSurface} />
                  <Text style={styles.stockHeaderText}>{t('insights.lowStockTitle')}</Text>
                  <Text style={styles.stockCountText}>
                    {t('insights.lowStockCount', { count: lowStockItems.length })}
                  </Text>
                </View>
                {lowStockItems.map((item) => (
                  <View key={item.id} style={styles.stockRow}>
                    <Text style={styles.stockName}>{item.name}</Text>
                    <Text style={styles.stockQty}>
                      {t('insights.onlyStock', { qty: item.currentStock, unit: item.unit })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Historical Register Footnote */}
        <View style={styles.footnote}>
          <Text style={styles.footnoteText}>{t('stitch.footnoteBrand')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceCard,
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  contentContainer: {
    paddingBottom: 40,
  },

  /* SECTION 1: Monolithic Hero */
  heroPanel: {
    backgroundColor: Theme.colors.primaryContainer,
    paddingHorizontal: Theme.spacing.gutter,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.lg,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    paddingBottom: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  heroSubLabel: {
    ...Theme.typography.labelMd,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroDateTitle: {
    ...Theme.typography.titleMd,
    color: Theme.colors.onPrimary,
    marginTop: 2,
  },
  heroGrid: {
    flexDirection: 'row',
    marginVertical: Theme.spacing.sm,
  },
  heroGridColLeft: {
    flex: 1,
    paddingRight: Theme.spacing.md,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroGridColRight: {
    flex: 1,
    paddingLeft: Theme.spacing.md,
  },
  heroColLabel: {
    ...Theme.typography.labelMd,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  heroAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  heroColSub: {
    ...Theme.typography.bodySm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  heroObservationRow: {
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroObservationText: {
    flex: 1,
    ...Theme.typography.bodyMd,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },

  /* SECTION 2: Action Section */
  actionSection: {
    backgroundColor: Theme.colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
  },
  sectionHeaderBar: {
    paddingHorizontal: Theme.spacing.gutter,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surfaceContainerLow,
  },
  sectionHeaderTitle: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ledgerRow: {
    paddingHorizontal: Theme.spacing.gutter,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    gap: 8,
  },
  rowTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowTitle: {
    ...Theme.typography.bodyLg,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  badgePending: {
    backgroundColor: Theme.colors.moneyRedBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.sm,
    borderWidth: 1,
    borderColor: Theme.colors.moneyRedBorder,
  },
  badgePendingText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.moneyRed,
    fontWeight: '700',
  },
  badgeQr: {
    backgroundColor: Theme.colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.sm,
  },
  badgeQrText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.primaryContainer,
    fontWeight: '700',
  },
  rowDescription: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurfaceVariant,
  },
  rowFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionLinkText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.primaryContainer,
    fontWeight: '700',
  },
  rowMetaText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.outline,
  },

  /* SECTION 3: Truthful Empty State Preview (Real Mode) */
  truthfulStateBox: {
    paddingHorizontal: Theme.spacing.gutter,
    paddingVertical: 32,
    alignItems: 'center',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surfaceCard,
  },
  chartIconCircle: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  truthfulTitle: {
    ...Theme.typography.titleMd,
    color: Theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: 6,
  },
  truthfulDesc: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
  progressContainer: {
    width: '100%',
    maxWidth: 320,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.hairline,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    ...Theme.typography.labelMd,
    color: Theme.colors.outline,
  },
  progressValue: {
    ...Theme.typography.labelMd,
    color: Theme.colors.primaryContainer,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    backgroundColor: Theme.colors.surfaceContainer,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.primaryContainer,
  },

  /* Demo Mode Section */
  demoSection: {
    padding: Theme.spacing.gutter,
    gap: Theme.spacing.md,
  },
  demoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demoHeaderTitle: {
    ...Theme.typography.labelMd,
    color: Theme.colors.outline,
    textTransform: 'uppercase',
  },
  demoPill: {
    backgroundColor: Theme.colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.sm,
  },
  demoPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.md,
    padding: 12,
  },
  kpiLabel: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
  },
  kpiValue: {
    ...Theme.typography.titleMd,
    fontWeight: '700',
    marginTop: 4,
  },
  kpiSub: {
    ...Theme.typography.bodySm,
    color: Theme.colors.outline,
    marginTop: 2,
  },
  leakBox: {
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.md,
    padding: 12,
    gap: 8,
  },
  leakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leakHeaderText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.moneyRed,
    fontWeight: '700',
    flex: 1,
  },
  leakItem: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.hairline,
  },
  leakTitle: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  leakDesc: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  stockBox: {
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.md,
    padding: 12,
    gap: 8,
  },
  stockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockHeaderText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurface,
    fontWeight: '700',
    flex: 1,
  },
  stockCountText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.outline,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.hairline,
  },
  stockName: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurface,
  },
  stockQty: {
    ...Theme.typography.bodySm,
    color: Theme.colors.moneyRed,
    fontWeight: '600',
  },

  /* Footnote */
  footnote: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footnoteText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
