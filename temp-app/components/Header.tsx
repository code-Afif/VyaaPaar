import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/Colors';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  rightAction,
}) => {
  const router = useRouter();
  const { merchant } = useApp();
  const { language, t } = useLanguage();

  const getLangCodeDisplay = () => {
    switch (language) {
      case 'hi':
        return 'हि';
      case 'hinglish':
        return 'Hin';
      default:
        return 'EN';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          {showBack && (
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={24} color={Palette.darkNavy} />
            </Pressable>
          )}

          <View style={styles.titleContainer}>
            <Text style={styles.storeTitle} numberOfLines={1}>
              {title || merchant.storeName}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle || t('header.defaultSubtitle', { name: merchant.merchantName })}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          {/* Language Switch Pill */}
          <Pressable
            style={styles.langBadge}
            onPress={() => router.push('/language?from=settings')}
            accessibilityLabel={t('common.changeLanguage')}
          >
            <Ionicons name="globe-outline" size={13} color={Palette.darkNavy} />
            <Text style={styles.langBadgeText}>{getLangCodeDisplay()}</Text>
          </Pressable>

          {/* Cloud / Demo Status Pill */}
          <Pressable
            style={[
              styles.demoBadge,
              merchant.id && !merchant.isDemoMode
                ? { backgroundColor: Palette.successGreenLight, borderColor: '#A7F3D0' }
                : null,
            ]}
            onPress={() => router.push('/modal')}
            accessibilityLabel="View store info and mode"
          >
            <View
              style={[
                styles.demoDot,
                merchant.id && !merchant.isDemoMode
                  ? { backgroundColor: Palette.successGreen }
                  : null,
              ]}
            />
            <Text
              style={[
                styles.demoText,
                merchant.id && !merchant.isDemoMode
                  ? { color: Palette.successGreen }
                  : null,
              ]}
            >
              {merchant.id && !merchant.isDemoMode ? t('header.cloud') : t('header.demo')}
            </Text>
          </Pressable>

          {rightAction ? (
            rightAction
          ) : (
            <Pressable
              style={styles.voiceIconBtn}
              onPress={() => router.push('/voice')}
              accessibilityLabel="Open AI Voice Assistant"
            >
              <Ionicons name="mic" size={20} color={Palette.primaryBlue} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
  },
  titleContainer: {
    flex: 1,
  },
  storeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.darkNavy,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.background,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 4,
  },
  langBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primaryBlueLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  demoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.primaryBlue,
    marginRight: 5,
  },
  demoText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
    letterSpacing: 0.5,
  },
  voiceIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.primaryBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
