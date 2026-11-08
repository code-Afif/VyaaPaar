import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Theme } from '@/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const getBackgroundColor = () => {
    if (disabled && !loading) return Theme.colors.surfaceContainer;
    switch (variant) {
      case 'primary':
        return Theme.colors.primaryContainer;
      case 'secondary':
        return Theme.colors.secondary;
      case 'danger':
        return Theme.colors.moneyRed;
      case 'success':
        return Theme.colors.moneyGreen;
      case 'outline':
        return Theme.colors.transparent;
      default:
        return Theme.colors.primaryContainer;
    }
  };

  const getTextColor = () => {
    if (disabled && !loading) return Theme.colors.outline;
    if (variant === 'outline') return Theme.colors.primaryContainer;
    return Theme.colors.onPrimary;
  };

  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: variant === 'outline' ? Theme.colors.primaryContainer : 'transparent',
          opacity: disabled && !loading ? 0.6 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: Theme.layout.minTouchTarget,
    paddingHorizontal: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Theme.radii.none,
  },
  text: {
    ...Theme.typography.bodyLg,
    fontWeight: '700',
  },
});

