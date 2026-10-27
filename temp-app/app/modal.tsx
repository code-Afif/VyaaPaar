import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette } from '@/constants/Colors';
import { useApp } from '@/context/AppContext';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function ModalScreen() {
  const router = useRouter();
  const {
    merchant,
    resetToDemoSeed,
    isAuthenticated,
    userEmail,
    signOut,
    seedCurrentSupabaseAccount,
  } = useApp();

  const handleResetData = () => {
    Alert.alert(
      'Reset Demo Data?',
      'Kya aap sabhi sample customer transactions aur payments ko reset karna chahte hain?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Karein',
          style: 'destructive',
          onPress: () => {
            resetToDemoSeed();
            Alert.alert('Reset Complete', 'Demo data initial state par reset ho gaya hai.');
            router.back();
          },
        },
      ]
    );
  };

  const handleSeedSupabase = async () => {
    Alert.alert(
      'Seed Demo Data to Supabase?',
      'Kya aap apne authenticated Supabase account mein 5 sample customers aur transactions load karna chahte hain?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Seed Karein',
          onPress: async () => {
            const success = await seedCurrentSupabaseAccount();
            if (success) {
              Alert.alert('Success 🎉', 'Demo data aapke Supabase account mein load ho gaya.');
              router.back();
            } else {
              Alert.alert('Error', 'Seed procedure execute nahi ho payi. Database schema check karein.');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Kya aap DukaanSaathi se sign out karna chahte hain?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Store Info & Settings</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={24} color={Palette.darkNavy} />
        </Pressable>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Merchant Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="storefront" size={28} color={Palette.primaryBlueDark} />
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.storeNameRow}>
              <Text style={styles.storeName}>{merchant.storeName}</Text>
              <View
                style={[
                  styles.modeBadge,
                  {
                    backgroundColor: isAuthenticated
                      ? Palette.successGreenLight
                      : Palette.primaryBlueLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modeBadgeText,
                    {
                      color: isAuthenticated
                        ? Palette.successGreen
                        : Palette.primaryBlueDark,
                    },
                  ]}
                >
                  {isAuthenticated ? 'SUPABASE CLOUD' : 'DEMO MODE'}
                </Text>
              </View>
            </View>
            <Text style={styles.merchantName}>Proprietor: {merchant.merchantName}</Text>
            {userEmail && <Text style={styles.emailText}>Account: {userEmail}</Text>}
            <Text style={styles.city}>{merchant.city} • {merchant.phone}</Text>
            <Text style={styles.upiId}>Paytm UPI: {merchant.upiId}</Text>
          </View>
        </View>

        {/* Auth / Account Management Section */}
        <View style={styles.authSection}>
          <Text style={styles.sectionHeading}>Account & Backend State</Text>

          {isAuthenticated ? (
            <View style={styles.authActionsCol}>
              <Pressable style={styles.seedBtn} onPress={handleSeedSupabase}>
                <Ionicons name="cloud-upload" size={18} color={Palette.primaryBlueDark} />
                <Text style={styles.seedBtnText}>Seed Sample Data to Supabase</Text>
              </Pressable>

              <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                <Ionicons name="log-out" size={18} color={Palette.dangerRed} />
                <Text style={styles.signOutBtnText}>Sign Out of Store Account</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.authActionsCol}>
              <Pressable
                style={styles.signInBtn}
                onPress={() => {
                  router.push('/auth');
                }}
              >
                <Ionicons name="person-circle" size={20} color={Palette.white} />
                <Text style={styles.signInBtnText}>
                  Sign In or Register with Supabase
                </Text>
              </Pressable>
              <Text style={styles.authHint}>
                {isSupabaseConfigured()
                  ? 'Supabase backend is configured and ready.'
                  : 'Supabase credentials absent: running smoothly in offline Demo Mode.'}
              </Text>
            </View>
          )}
        </View>

        {/* Integration Status Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>DukaanSaathi Build Status</Text>

          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={16} color={Palette.successGreen} />
            <Text style={styles.statusText}>Phase 1: React Native Mobile UI & 4-Tab Navigation</Text>
          </View>

          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={16} color={Palette.successGreen} />
            <Text style={styles.statusText}>Phase 2: Supabase Migrations, Schema & RLS</Text>
          </View>

          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={16} color={Palette.successGreen} />
            <Text style={styles.statusText}>Append-Only Ledger with Idempotency Key</Text>
          </View>

          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={16} color={Palette.successGreen} />
            <Text style={styles.statusText}>Multi-Tenant Customer & Transaction Isolation</Text>
          </View>

          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={16} color={Palette.successGreen} />
            <Text style={styles.statusText}>Paytm Soundbox QR Simulator & Reconciler</Text>
          </View>
        </View>

        {/* Reset Demo Data Button */}
        <Pressable style={styles.resetButton} onPress={handleResetData}>
          <Ionicons name="refresh" size={18} color={Palette.dangerRed} />
          <Text style={styles.resetButtonText}>Reset Demo Transactions</Text>
        </Pressable>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  closeBtn: {
    padding: 4,
  },
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.primaryBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  modeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  merchantName: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  emailText: {
    fontSize: 11,
    color: Palette.primaryBlueDark,
    marginTop: 1,
  },
  city: {
    fontSize: 11,
    color: Palette.textMuted,
    marginTop: 2,
  },
  upiId: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.darkNavy,
    marginTop: 3,
  },
  authSection: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.darkNavy,
    marginBottom: 12,
  },
  authActionsCol: {
    gap: 10,
  },
  signInBtn: {
    backgroundColor: Palette.primaryBlue,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signInBtnText: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: '700',
  },
  seedBtn: {
    backgroundColor: Palette.primaryBlueLight,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  seedBtnText: {
    color: Palette.primaryBlueDark,
    fontSize: 13,
    fontWeight: '700',
  },
  signOutBtn: {
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutBtnText: {
    color: Palette.dangerRed,
    fontSize: 13,
    fontWeight: '700',
  },
  authHint: {
    fontSize: 11,
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.darkNavy,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 12,
    color: Palette.textSecondary,
    flex: 1,
  },
  resetButton: {
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetButtonText: {
    color: Palette.dangerRed,
    fontSize: 14,
    fontWeight: '700',
  },
});
