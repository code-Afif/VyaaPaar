import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/Colors';
import { formatPaise } from '@/utils/format';

interface MetricCardProps {
  title: string;
  subtitle?: string;
  amountPaise: number;
  iconName: keyof typeof Ionicons.glyphMap;
  variant: 'primary' | 'success' | 'danger' | 'navy';
  onPress?: () => void;
  flex?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  subtitle,
  amountPaise,
  iconName,
  variant,
  onPress,
  flex = 1,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: Palette.white,
          border: Palette.border,
          iconBg: Palette.successGreenLight,
          iconColor: Palette.successGreen,
          amountColor: Palette.successGreen,
          tagBg: Palette.successGreenLight,
        };
      case 'danger':
        return {
          bg: Palette.white,
          border: Palette.border,
          iconBg: Palette.dangerRedLight,
          iconColor: Palette.dangerRed,
          amountColor: Palette.dangerRed,
          tagBg: Palette.dangerRedLight,
        };
      case 'navy':
        return {
          bg: Palette.darkNavy,
          border: Palette.darkNavy,
          iconBg: 'rgba(255, 255, 255, 0.15)',
          iconColor: Palette.white,
          amountColor: Palette.white,
          tagBg: 'rgba(255, 255, 255, 0.15)',
        };
      case 'primary':
      default:
        return {
          bg: Palette.white,
          border: Palette.border,
          iconBg: Palette.primaryBlueLight,
          iconColor: Palette.primaryBlue,
          amountColor: Palette.darkNavy,
          tagBg: Palette.primaryBlueLight,
        };
    }
  };

  const colors = getColors();

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          flex,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.iconBg }]}>
          <Ionicons name={iconName} size={18} color={colors.iconColor} />
        </View>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              { color: variant === 'navy' ? '#9FB3C8' : Palette.textSecondary },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <Text
        style={[
          styles.title,
          { color: variant === 'navy' ? '#E2E8F0' : Palette.textSecondary },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[styles.amount, { color: colors.amountColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatPaise(amountPaise)}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    minHeight: 104,
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
