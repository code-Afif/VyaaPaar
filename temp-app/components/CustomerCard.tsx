import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/Colors';
import { Customer } from '@/types';
import { formatPaise } from '@/utils/format';
import { useLanguage } from '@/context/LanguageContext';

interface CustomerCardProps {
  customer: Customer;
  onPress: () => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onPress }) => {
  const { t } = useLanguage();
  const hasDue = customer.currentBalancePaise > 0;

  // Extract initials
  const initials = customer.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityLabel={`View ${customer.name}'s Khata`}
    >
      <View style={styles.leftCol}>
        <View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: hasDue
                ? Palette.primaryBlueLight
                : Palette.successGreenLight,
            },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              {
                color: hasDue ? Palette.primaryBlueDark : Palette.successGreen,
              },
            ]}
          >
            {initials || 'C'}
          </Text>
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.name} numberOfLines={1}>
            {customer.name}
          </Text>
          {customer.phone && (
            <Text style={styles.phone} numberOfLines={1}>
              {customer.phone}
            </Text>
          )}
          <Text style={styles.lastActivity} numberOfLines={1}>
            {t('card.lastActivity', { date: customer.lastActivityDate })}
          </Text>
        </View>
      </View>

      <View style={styles.rightCol}>
        <Text
          style={[
            styles.balanceAmount,
            { color: hasDue ? Palette.dangerRed : Palette.successGreen },
          ]}
        >
          {formatPaise(customer.currentBalancePaise)}
        </Text>
        <Text
          style={[
            styles.balanceLabel,
            { color: hasDue ? Palette.dangerRed : Palette.successGreen },
          ]}
        >
          {hasDue ? t('card.due') : t('card.settled')}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={Palette.textMuted}
          style={styles.chevron}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.white,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  cardPressed: {
    backgroundColor: '#F8FAFC',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoCol: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  phone: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  lastActivity: {
    fontSize: 11,
    color: Palette.textMuted,
    marginTop: 3,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  chevron: {
    marginTop: 2,
  },
});
