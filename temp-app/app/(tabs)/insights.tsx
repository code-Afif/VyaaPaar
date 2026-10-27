import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette } from '@/constants/Colors';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { formatPaise } from '@/utils/format';

export default function InsightsScreen() {
  const router = useRouter();
  const { briefing, inventory, customers } = useApp();

  const lowStockItems = inventory.filter((i) => i.isLowStock);

  // Calculate collection rate percentage
  const totalDueAndCollected =
    briefing.totalCollectedPaise + briefing.totalOutstandingPaise;
  const collectionRate =
    totalDueAndCollected > 0
      ? Math.round((briefing.totalCollectedPaise / totalDueAndCollected) * 100)
      : 100;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="AI Business Briefing & Insights"
        subtitle="Performance, margins & stock health"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Briefing Summary Header Card */}
        <View style={styles.briefingHeaderCard}>
          <View style={styles.briefingTitleRow}>
            <View style={styles.sparkleCircle}>
              <Ionicons name="sparkles" size={18} color={Palette.white} />
            </View>
            <View>
              <Text style={styles.briefingTitle}>Daily Business Briefing</Text>
              <Text style={styles.briefingSubtitle}>
                AI summary for Rajesh Sharma • Updated today
              </Text>
            </View>
          </View>

          <Text style={styles.briefingNarrative}>
            Aaj aapki dukan par{' '}
            <Text style={styles.boldText}>
              {formatPaise(briefing.totalSalesPaise)}
            </Text>{' '}
            ki bikri hui hai. Cash aur UPI se{' '}
            <Text style={styles.boldText}>
              {formatPaise(briefing.totalCollectedPaise)}
            </Text>{' '}
            jama hue hain. Kul{' '}
            <Text style={styles.boldText}>
              {formatPaise(briefing.totalOutstandingPaise)}
            </Text>{' '}
            udhaar baaki hai.
          </Text>
        </View>

        {/* Financial KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Sales (Bikri)</Text>
            <Text style={styles.kpiValue}>
              {formatPaise(briefing.totalSalesPaise)}
            </Text>
            <Text style={styles.kpiSub}>Estimated gross</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Collected (Aaya Paisa)</Text>
            <Text style={[styles.kpiValue, { color: Palette.successGreen }]}>
              {formatPaise(briefing.totalCollectedPaise)}
            </Text>
            <Text style={styles.kpiSub}>UPI & Cash</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Gross Margin (Munafa)</Text>
            <Text style={[styles.kpiValue, { color: Palette.primaryBlueDark }]}>
              {formatPaise(briefing.estimatedGrossProfitPaise)}
            </Text>
            <Text style={styles.kpiSub}>~19.8% avg margin</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Shop Expenses</Text>
            <Text style={[styles.kpiValue, { color: Palette.dangerRed }]}>
              {formatPaise(briefing.totalExpensesPaise)}
            </Text>
            <Text style={styles.kpiSub}>Electricity & helper</Text>
          </View>
        </View>

        {/* Collection Efficiency Ratio Bar */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Collection Efficiency</Text>
            <Text style={styles.rateBadge}>{collectionRate}% Recovered</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${collectionRate}%` }]}
            />
          </View>
          <View style={styles.progressLegendRow}>
            <Text style={styles.legendText}>
              Collected: {formatPaise(briefing.totalCollectedPaise)}
            </Text>
            <Text style={styles.legendText}>
              Udhaar Pending: {formatPaise(briefing.totalOutstandingPaise)}
            </Text>
          </View>
        </View>

        {/* Profit Leak Detector */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.leakHeaderLeft}>
              <Ionicons name="warning" size={18} color={Palette.warningAmber} />
              <Text style={styles.sectionTitle}>Profit Leak Detector</Text>
            </View>
            <View style={styles.alertPill}>
              <Text style={styles.alertPillText}>2 ALERTS</Text>
            </View>
          </View>

          {briefing.profitLeakAlerts.map((leak) => (
            <View key={leak.id} style={styles.leakItem}>
              <View style={styles.leakItemHeader}>
                <Text style={styles.leakTitle}>{leak.title}</Text>
                {leak.metricImpact && (
                  <Text style={styles.leakImpact}>{leak.metricImpact}</Text>
                )}
              </View>
              <Text style={styles.leakDesc}>{leak.description}</Text>
            </View>
          ))}
        </View>

        {/* Low-Stock Warnings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.leakHeaderLeft}>
              <Ionicons name="cube" size={18} color={Palette.dangerRed} />
              <Text style={styles.sectionTitle}>Low-Stock Warnings</Text>
            </View>
            <Text style={styles.stockCountText}>
              {lowStockItems.length} Products Low
            </Text>
          </View>

          {lowStockItems.map((item) => (
            <View key={item.id} style={styles.stockItem}>
              <View style={styles.stockInfoCol}>
                <Text style={styles.stockName}>{item.name}</Text>
                <Text style={styles.stockSupplier}>
                  {item.hindiName} • Supplier: {item.supplierName}
                </Text>
              </View>

              <View style={styles.stockQtyCol}>
                <View style={styles.stockAlertBadge}>
                  <Text style={styles.stockAlertText}>
                    Only {item.currentStock} {item.unit}
                  </Text>
                </View>
                <Text style={styles.stockMinText}>
                  Min threshold: {item.minStockThreshold}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actionable Follow-up Card */}
        <View style={styles.actionCard}>
          <Text style={styles.actionCardTitle}>Recommended Next Action</Text>
          <Text style={styles.actionCardDesc}>
            Suresh Verma's ₹1,250 udhaar has been pending for 12 days. Tap below to send a polite WhatsApp reminder.
          </Text>
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push('/customer/cust-2')}
          >
            <Ionicons name="logo-whatsapp" size={18} color={Palette.white} />
            <Text style={styles.actionButtonText}>
              Open Suresh Verma Khata & Remind
            </Text>
          </Pressable>
        </View>

        {/* Footer info note */}
        <View style={styles.footerNote}>
          <Ionicons name="sparkles" size={14} color={Palette.textMuted} />
          <Text style={styles.footerNoteText}>
            DukaanSaathi AI Engine • Deterministic Metrics + Gemini Explanation
          </Text>
        </View>
      </ScrollView>
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
  briefingHeaderCard: {
    backgroundColor: Palette.darkNavy,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  briefingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sparkleCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  briefingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.white,
  },
  briefingSubtitle: {
    fontSize: 11,
    color: '#9FB3C8',
    marginTop: 2,
  },
  briefingNarrative: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: Palette.primaryBlue,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: Palette.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
  },
  kpiLabel: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.darkNavy,
    letterSpacing: -0.3,
  },
  kpiSub: {
    fontSize: 10,
    color: Palette.textMuted,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: Palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leakHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  rateBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.successGreen,
    backgroundColor: Palette.successGreenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#FDE8E8',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 10,
    backgroundColor: Palette.successGreen,
    borderRadius: 5,
  },
  progressLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  legendText: {
    fontSize: 11,
    color: Palette.textSecondary,
  },
  alertPill: {
    backgroundColor: Palette.warningAmberLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.warningAmber,
  },
  leakItem: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: Palette.warningAmber,
    marginBottom: 8,
  },
  leakItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  leakTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  leakImpact: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.dangerRed,
    backgroundColor: Palette.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leakDesc: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
  stockCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.dangerRed,
  },
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  stockInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  stockName: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  stockSupplier: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  stockQtyCol: {
    alignItems: 'flex-end',
  },
  stockAlertBadge: {
    backgroundColor: Palette.dangerRedLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockAlertText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.dangerRed,
  },
  stockMinText: {
    fontSize: 10,
    color: Palette.textMuted,
    marginTop: 2,
  },
  actionCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 14,
    marginBottom: 12,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  actionCardDesc: {
    fontSize: 12,
    color: '#15803D',
    lineHeight: 18,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: Palette.successGreen,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: '700',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
  },
  footerNoteText: {
    fontSize: 11,
    color: Palette.textMuted,
  },
});
