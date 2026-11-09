import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { ScreenHeader, AmountText } from '@/components/ui';
import { formatDisplayPhone } from '@/utils/format';
import { Customer } from '@/types';

type FilterTab = 'ALL' | 'DUE' | 'SETTLED';

function getInitials(name?: string) {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function KhataScreen() {
  const router = useRouter();
  const { customers, briefing, refreshFromSupabase, isLoading } = useApp();
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshFromSupabase();
    } finally {
      setIsRefreshing(false);
    }
  };

  const dueCount = useMemo(
    () => customers.filter((c) => (c.currentBalancePaise || 0) > 0).length,
    [customers]
  );
  const settledCount = useMemo(
    () => customers.filter((c) => (c.currentBalancePaise || 0) === 0).length,
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    const safeQuery = searchQuery.trim().toLowerCase();

    return customers.filter((c) => {
      // Safe Search filter
      const safeName = (c.name || '').toLowerCase();
      const matchesSearch =
        safeName.includes(safeQuery) ||
        (c.phone ? c.phone.includes(safeQuery) : false);

      if (!matchesSearch) return false;

      // Status filter
      if (filterTab === 'DUE') {
        return (c.currentBalancePaise || 0) > 0;
      }
      if (filterTab === 'SETTLED') {
        return (c.currentBalancePaise || 0) === 0;
      }
      return true;
    });
  }, [customers, searchQuery, filterTab]);

  const renderCustomerRow = ({ item }: { item: Customer }) => {
    const balance = item.currentBalancePaise || 0;
    const isDue = balance > 0;
    const isSettled = balance === 0;
    const initials = getInitials(item.name);
    const maskedPhone = formatDisplayPhone(item.phone);

    return (
      <Pressable
        style={styles.customerRow}
        onPress={() => router.push(`/customer/${item.id}`)}
      >
        <View style={styles.customerLeftCol}>
          {/* Square initials avatar matching Stitch */}
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.customerDetailsCol}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.name}
            </Text>
            {maskedPhone ? (
              <Text style={styles.customerPhone}>{maskedPhone}</Text>
            ) : null}
            <Text style={styles.customerEntryHint}>
              {t('stitch.lastEntryPrefix', { time: 'Khaata sakriya' })}
            </Text>
          </View>
        </View>

        <View style={styles.customerRightCol}>
          <AmountText
            amountPaise={balance}
            variant={isDue ? 'red' : isSettled ? 'primary' : 'green'}
            size="stat"
            prefix={balance > 0 ? '' : balance < 0 ? '+ ' : ''}
          />
          <Text style={styles.balanceStatusSub}>
            {isDue
              ? t('stitch.owedSubtitle')
              : isSettled
              ? t('stitch.hisaabBarabar')
              : t('stitch.advanceJama')}
          </Text>
          <Text
            style={[
              styles.actionLinkText,
              isDue ? styles.actionLinkDue : styles.actionLinkSettled,
            ]}
          >
            {isDue ? t('stitch.takaadaKarein') : t('stitch.hisaabBarabar')}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* TopAppBar with visibly disabled Report badge */}
      <ScreenHeader
        title={t('tabs.khata')}
        rightAction={
          <View
            style={styles.headerReportDisabledBadge}
            accessibilityLabel={`${t('stitch.reportBtn')} - ${t('stitch.comingSoonNotice')}`}
          >
            <Ionicons name="document-text-outline" size={13} color={Theme.colors.outline} />
            <Text style={styles.headerReportDisabledText}>
              {t('stitch.reportBtn')} · {t('stitch.comingSoonNotice')}
            </Text>
          </View>
        }
      />

      <View style={styles.container}>
        {/* Ledger Aggregate Summary (Single Ledger Anchor) */}
        <View style={styles.aggregateSummary}>
          <View style={styles.aggregateLeftCol}>
            <Text style={styles.aggregateLabel}>{t('stitch.totalUdhaarOwed')}</Text>
            <AmountText
              amountPaise={briefing.totalOutstandingPaise || 0}
              variant="red"
              size="hero"
              style={styles.aggregateAmount}
            />
          </View>
          <View style={styles.aggregateRightCol}>
            <Text style={styles.aggregateLabel}>{t('stitch.totalGrahak')}</Text>
            <Text style={styles.aggregateCustomerCount}>
              {customers.length} {t('stitch.grahakCountUnit', { count: '' }).trim()}
            </Text>
          </View>
        </View>

        {/* Search & Ruled Input */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color={Theme.colors.onSurfaceVariant} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('stitch.searchKhataPlaceholder')}
              placeholderTextColor={Theme.colors.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={Theme.colors.outline} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Plain Text Ruled Filter Tabs */}
        <View style={styles.filterTabsRow}>
          <Pressable
            style={[styles.filterTab, filterTab === 'ALL' && styles.filterTabActive]}
            onPress={() => setFilterTab('ALL')}
          >
            <Text style={[styles.filterTabText, filterTab === 'ALL' && styles.filterTabTextActive]}>
              {t('stitch.filterAll')}
            </Text>
            <Text style={styles.filterTabCount}>({customers.length})</Text>
          </Pressable>

          <Pressable
            style={[styles.filterTab, filterTab === 'DUE' && styles.filterTabActive]}
            onPress={() => setFilterTab('DUE')}
          >
            <Text style={[styles.filterTabText, filterTab === 'DUE' && styles.filterTabTextActive]}>
              {t('stitch.filterDue')}
            </Text>
            <Text style={[styles.filterTabCount, styles.filterTabCountDue]}>({dueCount})</Text>
          </Pressable>

          <Pressable
            style={[styles.filterTab, filterTab === 'SETTLED' && styles.filterTabActive]}
            onPress={() => setFilterTab('SETTLED')}
          >
            <Text style={[styles.filterTabText, filterTab === 'SETTLED' && styles.filterTabTextActive]}>
              {t('stitch.filterSettled')}
            </Text>
            <Text style={styles.filterTabCount}>({settledCount})</Text>
          </Pressable>
        </View>

        {/* Customer Count Strip */}
        <View style={styles.sortStrip}>
          <Text style={styles.sortStripLabel}>
            {t('stitch.grahakSoochiHeader', { count: filteredCustomers.length })}
          </Text>
        </View>

        {/* Customers Ledger FlatList */}
        <FlatList
          style={styles.list}
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          renderItem={renderCustomerRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            filteredCustomers.length > 0 ? (
              <View style={styles.listFooter}>
                <Text style={styles.listFooterText}>{t('stitch.pannaPurna')}</Text>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={Theme.colors.primaryContainer} />
                <Text style={[styles.emptySub, { marginTop: 12 }]}>
                  {t('khata.loadingCustomers')}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="people-outline"
                  size={48}
                  color={Theme.colors.outline}
                />
                <Text style={styles.emptyTitle}>{t('khata.emptyTitle')}</Text>
                <Text style={styles.emptySub}>{t('khata.emptySub')}</Text>
                <Pressable
                  style={styles.emptyButton}
                  onPress={() => router.push('/customer/new')}
                >
                  <Text style={styles.emptyButtonText}>{t('stitch.nayaGrahakBtn')}</Text>
                </Pressable>
              </View>
            )
          }
        />

        {/* Pinned Primary Action Bar above bottom navigation */}
        <View style={styles.dockedActionBar}>
          <Pressable
            style={styles.primaryAddBtn}
            onPress={() => router.push('/customer/new')}
            accessibilityLabel={t('stitch.nayaGrahakBtn')}
          >
            <Ionicons name="person-add" size={18} color={Theme.colors.onPrimary} />
            <Text style={styles.primaryAddBtnText}>{t('stitch.nayaGrahakBtn')}</Text>
          </Pressable>

          <View
            style={[styles.reportIconBtn, { opacity: 0.4 }]}
            accessibilityLabel={`${t('stitch.reportBtn')} - ${t('stitch.comingSoonNotice')}`}
          >
            <Ionicons name="document-text-outline" size={22} color={Theme.colors.outline} />
          </View>
        </View>

        {/* Floating Voice Mic Button with text badge */}
        <View style={styles.voiceFabContainer}>
          <Pressable
            style={styles.voiceFab}
            onPress={() => router.push('/voice')}
            accessibilityLabel={t('stitch.bolKarLikhein')}
          >
            <Ionicons name="mic" size={24} color={Theme.colors.onPrimary} />
          </Pressable>
          <Text style={styles.voiceFabBadge}>{t('stitch.bolKarLikhein')}</Text>
        </View>
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerReportDisabledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.radii.sm,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
  },
  headerReportDisabledText: {
    ...Theme.typography.labelMd,
    fontSize: 11,
    color: Theme.colors.outline,
    fontWeight: '500',
  },

  /* Aggregate Summary Anchor */
  aggregateSummary: {
    paddingHorizontal: Theme.spacing.gutter,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  aggregateLeftCol: {
    flex: 1,
  },
  aggregateRightCol: {
    alignItems: 'flex-end',
  },
  aggregateLabel: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aggregateAmount: {
    color: Theme.colors.moneyRed,
    marginTop: 2,
  },
  aggregateCustomerCount: {
    ...Theme.typography.titleMd,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    marginTop: 4,
  },

  /* Search Section */
  searchSection: {
    paddingHorizontal: Theme.spacing.gutter,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surface,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: 10,
    height: 42,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Theme.colors.onSurface,
    paddingVertical: 0,
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
  filterTabCountDue: {
    color: Theme.colors.moneyRed,
    fontWeight: '700',
  },

  /* Sort & View Hint Strip */
  sortStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.gutter,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surfaceContainerLow,
  },
  sortStripLabel: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  /* List & Rows */
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 140,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.gutter,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surface,
  },
  customerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: Theme.radii.none,
    backgroundColor: Theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.primaryContainer,
    fontWeight: '700',
  },
  customerDetailsCol: {
    flex: 1,
  },
  customerName: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.onSurface,
    fontWeight: '700',
  },
  customerPhone: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 1,
  },
  customerEntryHint: {
    ...Theme.typography.labelMd,
    color: Theme.colors.outline,
    marginTop: 2,
  },
  customerRightCol: {
    alignItems: 'flex-end',
  },
  balanceStatusSub: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 1,
  },
  actionLinkText: {
    ...Theme.typography.labelMd,
    marginTop: 2,
    fontWeight: '600',
  },
  actionLinkDue: {
    color: Theme.colors.secondary,
  },
  actionLinkSettled: {
    color: Theme.colors.outline,
  },

  /* List Footer */
  listFooter: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  listFooterText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.outline,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    ...Theme.typography.titleMd,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    marginTop: 12,
  },
  emptySub: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: Theme.colors.primaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onPrimary,
    fontWeight: '700',
  },

  /* Pinned Docked Action Bar */
  dockedActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.gutter,
    gap: 12,
  },
  primaryAddBtn: {
    flex: 1,
    height: 48,
    backgroundColor: Theme.colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Theme.radii.none,
  },
  primaryAddBtnText: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.onPrimary,
    fontWeight: '700',
  },
  reportIconBtn: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radii.none,
  },

  /* Floating Mic Action Button */
  voiceFabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 76,
    alignItems: 'center',
  },
  voiceFab: {
    width: 52,
    height: 52,
    borderRadius: Theme.radii.full,
    backgroundColor: Theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.primaryContainer,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  voiceFabBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: Theme.colors.primaryContainer,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 3,
    textTransform: 'uppercase',
  },
});
