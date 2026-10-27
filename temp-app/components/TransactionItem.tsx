import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/Colors';
import { LedgerEntry } from '@/types';
import { formatPaise } from '@/utils/format';

interface TransactionItemProps {
  entry: LedgerEntry;
  onPress?: () => void;
  showCustomerName?: boolean;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  entry,
  onPress,
  showCustomerName = true,
}) => {
  const isCreditSale = entry.type === 'CREDIT_SALE';

  const getSourceIcon = () => {
    switch (entry.source) {
      case 'VOICE':
        return 'mic';
      case 'RECONCILED':
        return 'qr-code';
      default:
        return 'create-outline';
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.leftCol}>
        <View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: isCreditSale
                ? Palette.dangerRedLight
                : Palette.successGreenLight,
            },
          ]}
        >
          <Ionicons
            name={isCreditSale ? 'arrow-up' : 'arrow-down'}
            size={18}
            color={isCreditSale ? Palette.dangerRed : Palette.successGreen}
          />
        </View>

        <View style={styles.detailsCol}>
          {showCustomerName && (
            <Text style={styles.customerName} numberOfLines={1}>
              {entry.customerName}
            </Text>
          )}
          <Text style={styles.description} numberOfLines={1}>
            {entry.description}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.timeText}>{entry.createdAt}</Text>
            <View style={styles.sourceTag}>
              <Ionicons
                name={getSourceIcon()}
                size={11}
                color={Palette.textSecondary}
              />
              <Text style={styles.sourceText}>
                {entry.source === 'VOICE'
                  ? 'Voice'
                  : entry.source === 'RECONCILED'
                  ? 'UPI QR'
                  : 'Manual'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.rightCol}>
        <Text
          style={[
            styles.amount,
            {
              color: isCreditSale ? Palette.dangerRed : Palette.successGreen,
            },
          ]}
        >
          {isCreditSale ? '-' : '+'}
          {formatPaise(entry.amountPaise)}
        </Text>
        <Text
          style={[
            styles.typeLabel,
            {
              color: isCreditSale ? Palette.dangerRed : Palette.successGreen,
            },
          ]}
        >
          {isCreditSale ? 'Udhaar Diya' : 'Paisa Mila'}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  pressed: {
    backgroundColor: '#F8FAFC',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailsCol: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.darkNavy,
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 11,
    color: Palette.textMuted,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Palette.borderLight,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '500',
    color: Palette.textSecondary,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
