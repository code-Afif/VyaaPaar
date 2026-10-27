import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette } from '@/constants/Colors';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { CustomerCard } from '@/components/CustomerCard';
import { formatPaise } from '@/utils/format';

type FilterTab = 'ALL' | 'DUE' | 'SETTLED';

export default function KhataScreen() {
  const router = useRouter();
  const { customers, briefing } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Search filter
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery));

      if (!matchesSearch) return false;

      // Status filter
      if (filterTab === 'DUE') {
        return c.currentBalancePaise > 0;
      }
      if (filterTab === 'SETTLED') {
        return c.currentBalancePaise === 0;
      }
      return true;
    });
  }, [customers, searchQuery, filterTab]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Grahak Khata (Customer Ledger)"
        subtitle="Manage customer credit & repayments"
      />

      <View style={styles.container}>
        {/* Khata Balance Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Udhaar (Lene Hain)</Text>
            <Text style={styles.summaryAmount}>
              {formatPaise(briefing.totalOutstandingPaise)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryColRight}>
            <Text style={styles.summaryLabel}>Total Grahak</Text>
            <Text style={styles.customerCountText}>
              {customers.length} Grahak
            </Text>
          </View>
        </View>

        {/* Search Bar & Add Customer Button */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color={Palette.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or mobile number..."
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
            accessibilityLabel="Add new customer"
          >
            <Ionicons name="person-add" size={18} color={Palette.white} />
            <Text style={styles.addCustomerBtnText}>+ Naya</Text>
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
              Sabhi ({customers.length})
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
              Lene Hain ({customers.filter((c) => c.currentBalancePaise > 0).length})
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabChip,
              filterTab === 'SETTLED' && styles.tabChipActive,
            ]}
            onPress={() => setFilterTab('SETTLED')}
          >
            <Text
              style={[
                styles.tabText,
                filterTab === 'SETTLED' && styles.tabTextActive,
              ]}
            >
              Chukta ({customers.filter((c) => c.currentBalancePaise === 0).length})
            </Text>
          </Pressable>
        </View>

        {/* Customers List */}
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CustomerCard
              customer={item}
              onPress={() => router.push(`/customer/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="people-outline"
                size={48}
                color={Palette.textMuted}
              />
              <Text style={styles.emptyTitle}>Koi Grahak Nahi Mila</Text>
              <Text style={styles.emptySub}>
                Naya grahak jodne ke liye upar '+ Naya' button dabayein.
              </Text>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push('/customer/new')}
              >
                <Text style={styles.emptyButtonText}>+ Add New Customer</Text>
              </Pressable>
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
  summaryCard: {
    backgroundColor: Palette.darkNavy,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
  },
  summaryColRight: {
    alignItems: 'flex-end',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#9FB3C8',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.white,
    letterSpacing: -0.5,
  },
  customerCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: Palette.textPrimary,
  },
  addCustomerBtn: {
    backgroundColor: Palette.primaryBlue,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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
    backgroundColor: Palette.primaryBlueLight,
    borderColor: Palette.primaryBlue,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  tabTextActive: {
    color: Palette.primaryBlueDark,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
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
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: Palette.primaryBlue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
