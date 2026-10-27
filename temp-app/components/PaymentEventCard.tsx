import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/Colors';
import { PaymentEvent } from '@/types';
import { formatPaise } from '@/utils/format';

interface PaymentEventCardProps {
  event: PaymentEvent;
  onConfirmMatch?: (eventId: string, customerId: string) => void;
  onViewDetails?: (eventId: string) => void;
}

export const PaymentEventCard: React.FC<PaymentEventCardProps> = ({
  event,
  onConfirmMatch,
  onViewDetails,
}) => {
  const isReconciled = event.status === 'RECONCILED';
  const hasSuggestion = Boolean(event.suggestedCustomerId);

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.channelRow}>
          <View style={styles.qrIconBadge}>
            <Ionicons name="qr-code" size={16} color={Palette.primaryBlue} />
          </View>
          <View>
            <Text style={styles.payerName}>
              {event.payerName || 'Unknown Customer'}
            </Text>
            <Text style={styles.refText}>{event.referenceNo}</Text>
          </View>
        </View>

        <View style={styles.amountCol}>
          <Text style={styles.amount}>+{formatPaise(event.amountPaise)}</Text>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isReconciled
                  ? Palette.successGreenLight
                  : Palette.warningAmberLight,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isReconciled
                    ? Palette.successGreen
                    : Palette.warningAmber,
                },
              ]}
            >
              {isReconciled ? 'RECONCILED' : 'UNMATCHED'}
            </Text>
          </View>
        </View>
      </View>

      {/* Meta Row */}
      <View style={styles.metaRow}>
        <Text style={styles.timeText}>{event.timestamp}</Text>
        <View style={styles.mockBadge}>
          <Text style={styles.mockBadgeText}>SIMULATED EVENT</Text>
        </View>
      </View>

      {/* Suggested Match Banner */}
      {hasSuggestion && !isReconciled && (
        <View style={styles.suggestionBox}>
          <View style={styles.suggestionHeader}>
            <Ionicons
              name="sparkles"
              size={14}
              color={Palette.primaryBlueDark}
            />
            <Text style={styles.suggestionTitle}>
              Suggested Match: {event.suggestedCustomerName}
            </Text>
          </View>
          <Text style={styles.suggestionReason}>{event.matchReason}</Text>

          <View style={styles.actionRow}>
            {onConfirmMatch && event.suggestedCustomerId && (
              <Pressable
                style={styles.confirmBtn}
                onPress={() =>
                  onConfirmMatch(event.id, event.suggestedCustomerId!)
                }
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={Palette.white}
                />
                <Text style={styles.confirmBtnText}>Confirm Match & Settle</Text>
              </Pressable>
            )}

            {onViewDetails && (
              <Pressable
                style={styles.detailsBtn}
                onPress={() => onViewDetails(event.id)}
              >
                <Text style={styles.detailsBtnText}>Details</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Already Reconciled Info */}
      {isReconciled && (
        <View style={styles.reconciledBox}>
          <Ionicons
            name="checkmark-done-circle"
            size={16}
            color={Palette.successGreen}
          />
          <Text style={styles.reconciledText}>
            Reconciled to {event.suggestedCustomerName || 'Customer'} Khata
          </Text>
        </View>
      )}

      {/* Unmatched without suggestion */}
      {!hasSuggestion && !isReconciled && (
        <View style={styles.unmatchedBox}>
          <Text style={styles.unmatchedReason}>{event.matchReason}</Text>
          {onViewDetails && (
            <Pressable
              style={styles.manualMatchBtn}
              onPress={() => onViewDetails(event.id)}
            >
              <Text style={styles.manualMatchBtnText}>
                Manually Select Customer Khata
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  qrIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Palette.primaryBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  refText: {
    fontSize: 11,
    color: Palette.textMuted,
    marginTop: 1,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.successGreen,
    letterSpacing: -0.3,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.borderLight,
  },
  timeText: {
    fontSize: 11,
    color: Palette.textSecondary,
  },
  mockBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mockBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  suggestionBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  suggestionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
  },
  suggestionReason: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmBtn: {
    backgroundColor: Palette.primaryBlue,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: Palette.white,
    fontSize: 12,
    fontWeight: '700',
  },
  detailsBtn: {
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.darkNavy,
  },
  reconciledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.successGreenLight,
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  reconciledText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.successGreen,
  },
  unmatchedBox: {
    backgroundColor: '#FAF5FF',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  unmatchedReason: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginBottom: 8,
  },
  manualMatchBtn: {
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  manualMatchBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.darkNavy,
  },
});
