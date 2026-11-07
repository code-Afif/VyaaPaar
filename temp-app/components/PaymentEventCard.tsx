import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/Colors';
import { PaymentEvent } from '@/types';
import { formatPaise } from '@/utils/format';
import { useLanguage } from '@/context/LanguageContext';

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
  const { t } = useLanguage();
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
              {isReconciled ? t('card.reconciled') : t('card.unmatched')}
            </Text>
          </View>
        </View>
      </View>

      {/* Meta Row */}
      <View style={styles.metaRow}>
        <Text style={styles.timeText}>{event.timestamp}</Text>
        <View style={styles.mockBadge}>
          <Text style={styles.mockBadgeText}>{t('card.simulatedEvent')}</Text>
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
              {t('card.suggestedMatch', { name: event.suggestedCustomerName || '' })}
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
                <Text style={styles.confirmBtnText}>{t('card.confirmMatchAndSettle')}</Text>
              </Pressable>
            )}

            {onViewDetails && (
              <Pressable
                style={styles.detailsBtn}
                onPress={() => onViewDetails(event.id)}
              >
                <Text style={styles.detailsBtnText}>{t('common.details')}</Text>
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
            {t('card.reconciledToKhata', { name: event.suggestedCustomerName || 'Customer' })}
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
                {t('card.manualMatch')}
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.primaryBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  refText: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.successGreen,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.borderLight,
  },
  timeText: {
    fontSize: 12,
    color: Palette.textMuted,
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
    color: Palette.textMuted,
    letterSpacing: 0.5,
  },
  suggestionBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 10,
    marginTop: 10,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
  },
  suggestionReason: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primaryBlue,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    gap: 6,
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
  },
  detailsBtnText: {
    color: Palette.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  reconciledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.successGreenLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    gap: 6,
    marginTop: 10,
  },
  reconciledText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.successGreen,
  },
  unmatchedBox: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  unmatchedReason: {
    fontSize: 12,
    color: Palette.warningAmber,
  },
  manualMatchBtn: {
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.warningAmber,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  manualMatchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.warningAmber,
  },
});
