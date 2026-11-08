import React from 'react';
import { Text, TextStyle } from 'react-native';
import { Theme } from '@/theme';
import { formatPaise } from '@/utils/format';

interface AmountTextProps {
  amountPaise: number;
  variant?: 'red' | 'green' | 'primary' | 'muted' | 'white';
  size?: 'hero' | 'stat' | 'md' | 'sm';
  prefix?: string;
  style?: TextStyle;
}

export const AmountText: React.FC<AmountTextProps> = ({
  amountPaise,
  variant = 'primary',
  size = 'stat',
  prefix,
  style,
}) => {
  const getColor = () => {
    switch (variant) {
      case 'red':
        return Theme.colors.moneyRed;
      case 'green':
        return Theme.colors.moneyGreen;
      case 'muted':
        return Theme.colors.onSurfaceVariant;
      case 'white':
        return Theme.colors.onPrimary;
      case 'primary':
      default:
        return Theme.colors.onSurface;
    }
  };

  const getTypography = () => {
    switch (size) {
      case 'hero':
        return Theme.typography.headlineHero;
      case 'stat':
        return Theme.typography.currencyStat;
      case 'sm':
        return Theme.typography.bodySm;
      case 'md':
      default:
        return Theme.typography.bodyLg;
    }
  };

  const formatted = formatPaise(Math.abs(amountPaise));
  const displayText = prefix ? `${prefix}${formatted}` : formatted;

  return (
    <Text
      style={[
        getTypography(),
        {
          color: getColor(),
          fontVariant: ['tabular-nums'],
        },
        style,
      ]}
    >
      {displayText}
    </Text>
  );
};
