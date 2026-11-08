import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { ScreenHeader } from '@/components/ui';

export default function AccountScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { merchant, userEmail, signOut } = useApp();

  const [paymentAlertsEnabled, setPaymentAlertsEnabled] = useState(true);
  const [briefingAlertsEnabled, setBriefingAlertsEnabled] = useState(true);

  // Logout calls real signOut from AppContext
  const handleLogout = () => {
    Alert.alert(
      t('account.logout'),
      'Kya aap sach me logout karna chahte hain?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('account.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/auth');
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.message || 'Logout failed');
            }
          },
        },
      ]
    );
  };

  const initialLetter = (merchant.storeName || merchant.merchantName || 'S')
    .charAt(0)
    .toUpperCase();

  const getLanguageName = () => {
    switch (language) {
      case 'hi':
        return 'हिन्दी (Hindi)';
      case 'hinglish':
        return 'Hinglish (Hindi / English)';
      default:
        return 'English';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 56dp TopAppBar matching Stitch TopAppBar */}
      <ScreenHeader
        title={t('account.title')}
        subtitle="DukaanSaathi • Vyapari Account"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE HEADER CARD (Monolithic ledger masthead) */}
        <View style={styles.profileMasthead}>
          <View style={styles.profileAvatarBox}>
            <Text style={styles.profileAvatarLetter}>{initialLetter}</Text>
          </View>
          <View style={styles.profileInfoCol}>
            <Text style={styles.profileStoreName}>
              {merchant.storeName || 'Sharma General Store'}
            </Text>
            <Text style={styles.profileOwnerName}>
              {merchant.merchantName || 'Ramesh Sharma'}
            </Text>
            <Text style={styles.profileEmail}>
              {userEmail || 'vyapari@dukaansaathi.in'}
            </Text>
          </View>
        </View>

        {/* SECTION 1: Dukaan ki Jaankari */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderTitle}>{t('account.shopInfo')}</Text>
          </View>

          {/* Row: Shop Name */}
          <View style={styles.rowItem}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>{t('account.shopName')}</Text>
              <Text style={styles.rowValue}>
                {merchant.storeName || 'Sharma General Store'}
              </Text>
            </View>
          </View>

          {/* Row: Owner Name */}
          <View style={styles.rowItem}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>{t('account.ownerName')}</Text>
              <Text style={styles.rowValue}>
                {merchant.merchantName || 'Ramesh Sharma'}
              </Text>
            </View>
          </View>

          {/* Row: Phone */}
          <View style={styles.rowItem}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>{t('account.phone')}</Text>
              <Text style={styles.rowValue}>
                {merchant.phone || '+91 98765 43210'}
              </Text>
            </View>
          </View>

          {/* Row: City / Address */}
          <View style={styles.rowItem}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>{t('account.address')}</Text>
              <Text style={styles.rowValue}>
                {merchant.city ? `Dukaan, ${merchant.city}` : 'Main Bazaar, India'}
              </Text>
            </View>
          </View>

          {/* Row: GSTIN (Disabled / Jaldi aa raha hai) */}
          <View style={styles.rowItemLast}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>{t('account.gstin')}</Text>
              <Text style={[styles.rowValue, styles.disabledText]}>
                {t('account.comingSoon')}
              </Text>
            </View>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonBadgeText}>{t('stitch.comingSoonNotice')}</Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: Account Suraksha */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderTitle}>{t('account.accountSecurity')}</Text>
          </View>

          {/* Row: Email (Read-only) */}
          <View style={styles.rowItem}>
            <View style={styles.rowTextCol}>
              <View style={styles.labelWithPillRow}>
                <Text style={styles.rowLabel}>{t('account.email')}</Text>
                <View style={styles.readOnlyPill}>
                  <Text style={styles.readOnlyPillText}>{t('account.readOnly')}</Text>
                </View>
              </View>
              <Text style={styles.rowValue}>{userEmail || 'vyapari@dukaansaathi.in'}</Text>
            </View>
            <Ionicons name="lock-closed" size={16} color={Theme.colors.outline} />
          </View>

          {/* Row: Password */}
          <Pressable
            style={styles.rowItemClickable}
            onPress={() => router.push('/auth')}
          >
            <View style={styles.rowTextCol}>
              <Text style={styles.rowValueBold}>{t('account.changePassword')}</Text>
              <Text style={styles.rowSubtitle}>{t('account.changePasswordSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Theme.colors.outline} />
          </Pressable>

          {/* Row: Logout */}
          <Pressable
            style={[styles.rowItemClickable, styles.rowItemLast]}
            onPress={handleLogout}
          >
            <View style={styles.logoutRowContent}>
              <Ionicons name="log-out-outline" size={20} color={Theme.colors.primaryContainer} />
              <Text style={styles.logoutText}>{t('account.logout')}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={Theme.colors.primaryContainer} />
          </Pressable>
        </View>

        {/* SECTION 3: App Settings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderTitle}>{t('account.appSettings')}</Text>
          </View>

          {/* Row: Language */}
          <Pressable
            style={styles.rowItemClickable}
            onPress={() => router.push('/language?from=settings')}
          >
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>{t('account.language')}</Text>
              <Text style={styles.rowValue}>{getLanguageName()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Theme.colors.outline} />
          </Pressable>

          {/* Row: Payment Alerts Switch */}
          <View style={styles.rowItem}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowValueBold}>{t('account.paymentAlerts')}</Text>
              <Text style={styles.rowSubtitle}>{t('account.paymentAlertsSub')}</Text>
            </View>
            <Switch
              value={paymentAlertsEnabled}
              onValueChange={setPaymentAlertsEnabled}
              trackColor={{ false: Theme.colors.surfaceContainer, true: Theme.colors.primaryContainer }}
              thumbColor={Theme.colors.onPrimary}
            />
          </View>

          {/* Row: Daily Briefing Notification Switch */}
          <View style={styles.rowItemLast}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowValueBold}>{t('account.dailyBriefing')}</Text>
              <Text style={styles.rowSubtitle}>{t('account.dailyBriefingSub')}</Text>
            </View>
            <Switch
              value={briefingAlertsEnabled}
              onValueChange={setBriefingAlertsEnabled}
              trackColor={{ false: Theme.colors.surfaceContainer, true: Theme.colors.primaryContainer }}
              thumbColor={Theme.colors.onPrimary}
            />
          </View>
        </View>

        {/* SECTION 4: Data aur Madad */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderTitle}>{t('account.dataAndHelp')}</Text>
          </View>

          {/* Row: Khata Export (Disabled with Jaldi aa raha hai) */}
          <View style={styles.rowItem}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowValueBold}>{t('account.exportKhata')}</Text>
              <Text style={styles.rowSubtitle}>{t('account.exportKhataSub')}</Text>
            </View>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonBadgeText}>{t('stitch.comingSoonNotice')}</Text>
            </View>
          </View>

          {/* Row: Help and Support */}
          <View style={styles.rowItem}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowValueBold}>{t('account.helpAndSupport')}</Text>
              <Text style={styles.rowSubtitle}>{t('account.helpAndSupportSub')}</Text>
            </View>
            <Ionicons name="help-buoy-outline" size={18} color={Theme.colors.outline} />
          </View>

          {/* Row: Privacy Policy */}
          <View style={styles.rowItem}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowValueBold}>{t('account.privacyPolicy')}</Text>
            </View>
            <Ionicons name="shield-outline" size={18} color={Theme.colors.outline} />
          </View>

          {/* Row: App Version */}
          <View style={styles.rowItemLast}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>{t('account.appVersion')}</Text>
              <Text style={styles.rowValue}>v2.4.1 (Bahi-Khata Edition)</Text>
            </View>
            <View style={styles.upToDateBadge}>
              <Text style={styles.upToDateBadgeText}>Up to date</Text>
            </View>
          </View>
        </View>

        {/* Security Encryption Seal */}
        <View style={styles.securitySealSection}>
          <View style={styles.sealBadgeRow}>
            <Ionicons name="shield-checkmark" size={16} color={Theme.colors.primaryContainer} />
            <Text style={styles.sealText}>{t('account.secureSeal')}</Text>
          </View>
          <Text style={styles.sealSubText}>{t('account.madeInIndia')}</Text>
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
    padding: Theme.spacing.gutter,
    gap: Theme.spacing.lg,
    paddingBottom: 40,
  },

  /* Masthead */
  profileMasthead: {
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.md,
    padding: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarLetter: {
    fontSize: 24,
    fontWeight: '800',
    color: Theme.colors.primaryContainer,
  },
  profileInfoCol: {
    flex: 1,
    gap: 2,
  },
  profileStoreName: {
    ...Theme.typography.titleMd,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  profileOwnerName: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.onSurfaceVariant,
  },
  profileEmail: {
    ...Theme.typography.bodySm,
    color: Theme.colors.outline,
  },

  /* Sections */
  sectionCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.md,
    overflow: 'hidden',
  },
  sectionHeaderBar: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
  },
  sectionHeaderTitle: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Rows */
  rowItem: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowItemLast: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowItemClickable: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTextCol: {
    flex: 1,
    paddingRight: 8,
    gap: 2,
  },
  rowLabel: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
  },
  rowValue: {
    ...Theme.typography.bodyMd,
    fontWeight: '600',
    color: Theme.colors.onSurface,
  },
  rowValueBold: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  rowSubtitle: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
  },
  disabledText: {
    color: Theme.colors.outline,
    fontStyle: 'italic',
  },
  labelWithPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readOnlyPill: {
    backgroundColor: Theme.colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Theme.radii.sm,
  },
  readOnlyPillText: {
    fontSize: 9,
    fontWeight: '600',
    color: Theme.colors.outline,
    textTransform: 'uppercase',
  },
  logoutRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.primaryContainer,
  },
  comingSoonBadge: {
    backgroundColor: Theme.colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radii.sm,
  },
  comingSoonBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.outline,
  },
  upToDateBadge: {
    backgroundColor: Theme.colors.moneyGreenBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radii.sm,
    borderWidth: 1,
    borderColor: Theme.colors.moneyGreenBorder,
  },
  upToDateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.moneyGreen,
  },

  /* Security Seal */
  securitySealSection: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
  },
  sealBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sealText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.primaryContainer,
    letterSpacing: 0.5,
  },
  sealSubText: {
    fontSize: 11,
    color: Theme.colors.outline,
  },
});
