import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/Colors';
import { useLanguage } from '@/context/LanguageContext';

interface VoiceFabProps {
  compact?: boolean;
}

export const VoiceFab: React.FC<VoiceFabProps> = ({ compact = false }) => {
  const router = useRouter();
  const { t } = useLanguage();

  if (compact) {
    return (
      <Pressable
        style={styles.compactBtn}
        onPress={() => router.push('/voice')}
        accessibilityLabel={t('voice.tapToSpeak')}
      >
        <Ionicons name="mic" size={24} color={Palette.white} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={styles.bannerContainer}
      onPress={() => router.push('/voice')}
      accessibilityLabel={t('voice.headerTitle')}
    >
      <View style={styles.micCircle}>
        <Ionicons name="mic" size={24} color={Palette.white} />
      </View>

      <View style={styles.textContainer}>
        <View style={styles.headlineRow}>
          <Text style={styles.headline}>{t('home.voiceBannerTitle')}</Text>
          <View style={styles.aiPill}>
            <Text style={styles.aiPillText}>{t('home.voiceAssistantBadge')}</Text>
          </View>
        </View>
        <Text style={styles.exampleText} numberOfLines={1}>
          {t('home.voiceBannerExample')}
        </Text>
      </View>

      <View style={styles.arrowCircle}>
        <Ionicons name="chevron-forward" size={18} color={Palette.primaryBlue} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Palette.primaryBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 10,
  },
  micCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Palette.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headline: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  aiPill: {
    backgroundColor: Palette.primaryBlueLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
    letterSpacing: 0.5,
  },
  exampleText: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.primaryBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  compactBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
});
