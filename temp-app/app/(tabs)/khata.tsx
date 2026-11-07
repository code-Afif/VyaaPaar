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
import { Palette } from '@/constants/Colors';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { Header } from '@/components/Header';
import { CustomerCard } from '@/components/CustomerCard';
import { formatPaise } from '@/utils/format';

type FilterTab = 'ALL' | 'DUE' | 'SETTLED';

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

  if (__DEV__) {
    console.log(
      `[KhataScreen] Total in context: ${customers.length}, Filtered count: ${filteredCustomers.length}, Unique IDs: ${new Set(customers.map((c) => c.id)).size}`
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title={t('khata.headerTitle')}
        subtitle={t('khata.headerSubtitle')}
      />

      <View style={styles.container}>
        {/* Khata Balance Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{t('khata.totalUdhaar')}</Text>
            <Text style={styles.summaryAmount}>
              {formatPaise(briefing.totalOutstandingPaise)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryColRight}>
            <Text style={styles.summaryLabel}>{t('khata.totalCustomers')}</Text>
            <Text style={styles.customerCountText}>
              {t('khata.customerCount', { count: customers.length })}
            </Text>
          </View>
        </View>

        {/* Search Bar & Add Customer Button */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color={Palette.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('khata.searchPlaceholder')}
              placeholderTextColor={Palette.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={Palette.textMuted} />
              </Pressable>
            )}
          </View>

          <Pressable
            style={styles.addCustomerBtn}
            onPress={() => router.push('/customer/new')}
            accessibilityLabel={t('khata.addCustomerBtn')}
          >
            <Ionicons name="person-add" size={18} color={Palette.white} />
            <Text style={styles.addCustomerBtnText}>{t('khata.addCustomerBtn')}</Text>
          </Pressable>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabsRow}>
          <Pressable
            style={[styles.tabChip, filterTab === 'ALL' && styles.tabChipActive]}
            onPress={() => setFilterTab('ALL')}
          >
            <Text
              style={[
                styles.tabText,
                filterTab === 'ALL' && styles.tabTextActive,
              ]}
            >
              {t('khata.tabAll', { count: customers.length })}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabChip, filterTab === 'DUE' && styles.tabChipActive]}
            onPress={() => setFilterTab('DUE')}
          >
            <Text
              style={[
                styles.tabText,
                filterTab === 'DUE' && styles.tabTextActive,
              ]}
            >
              {t('khata.tabDue', {
                count: customers.filter((c) => c.currentBalancePaise > 0).length,
              })}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabChip, filterTab === 'SETTLED' && styles.tabChipActive]}
            onPress={() => setFilterTab('SETTLED')}
          >
            <Text
              style={[
                styles.tabText,
                filterTab === 'SETTLED' && styles.tabTextActive,
              ]}
            >
              {t('khata.tabSettled', {
                count: customers.filter((c) => c.currentBalancePaise === 0).length,
              })}
            </Text>
          </Pressable>
        </View>

        {/* Customers List */}
        <FlatList
          style={styles.list}
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => (
            <CustomerCard
              customer={item}
              onPress={() => router.push(`/customer/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={Palette.primaryBlue} />
                <Text style={[styles.emptySub, { marginTop: 12 }]}>
                  {t('khata.loadingCustomers')}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="people-outline"
                  size={48}
                  color={Palette.textMuted}
                />
                <Text style={styles.emptyTitle}>{t('khata.emptyTitle')}</Text>
                <Text style={styles.emptySub}>
                  {t('khata.emptySub')}
                </Text>
                <Pressable
                  style={styles.emptyButton}
                  onPress={() => router.push('/customer/new')}
                >
                  <Text style={styles.emptyButtonText}>{t('khata.emptyBtn')}</Text>
                </Pressable>
              </View>
            )
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
  summaryCard: {
    backgroundColor: Palette.darkNavy,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.dangerRed,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#334E68',
    marginHorizontal: 16,
  },
  summaryColRight: {
    alignItems: 'flex-end',
  },
  customerCountText: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.white,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Palette.textPrimary,
  },
  addCustomerBtn: {
    backgroundColor: Palette.primaryBlue,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addCustomerBtnText: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  tabChipActive: {
    backgroundColor: Palette.primaryBlue,
    borderColor: Palette.primaryBlue,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  tabTextActive: {
    color: Palette.white,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
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
    lineHeight: 18,
  },
  emptyButton: {
    marginTop: 18,
    backgroundColor: Palette.primaryBlue,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
