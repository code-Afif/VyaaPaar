import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { SEED_VOICE_COMMANDS } from '@/data/seedData';
import { formatPaise, rupeesToPaise } from '@/utils/format';

interface ExtractedAction {
  intent: 'CREDIT_SALE' | 'REPAYMENT' | 'SEARCH_BALANCE' | 'DAILY_SUMMARY';
  intentLabel: string;
  customerName?: string;
  customerId?: string;
  amountRupees?: number;
  description?: string;
}

export default function VoiceAssistantScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { customers, recordCreditSale, recordRepayment, briefing } = useApp();

  const [transcript, setTranscript] = useState(
    'Ramesh ko 300 rupaye ka samaan udhaar likh do'
  );
  const [isListening, setIsListening] = useState(false);
  const [proposedAction, setProposedAction] = useState<ExtractedAction | null>({
    intent: 'CREDIT_SALE',
    intentLabel: t('voice.intentCreditLabel'),
    customerName: 'Ramesh Kumar',
    customerId: 'cust-1',
    amountRupees: 300,
    description: 'Groceries / samaan',
  });

  // Simulation & listening handler strictly preserved
  const handleSimulateListening = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      const sample = SEED_VOICE_COMMANDS[0];
      setTranscript(sample.hindiText);
      analyzeTranscript(sample.hindiText);
    }, 1500);
  };

  // Transcript parser strictly preserved
  const analyzeTranscript = (text: string) => {
    const lower = text.toLowerCase();

    // 1. Credit Sale
    if (lower.includes('udhaar') || lower.includes('likh')) {
      const cust = customers.find((c) =>
        lower.includes(c.name.toLowerCase().split(' ')[0])
      ) || customers[0];

      const amountMatch = lower.match(/(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[0], 10) : 300;

      setProposedAction({
        intent: 'CREDIT_SALE',
        intentLabel: t('voice.intentCreditLabel'),
        customerName: cust?.name,
        customerId: cust?.id,
        amountRupees: amount,
        description: 'Kirana samaan / udhaar',
      });
      return;
    }

    // 2. Repayment
    if (lower.includes('lauta') || lower.includes('mila') || lower.includes('jama')) {
      const cust = customers.find((c) =>
        lower.includes(c.name.toLowerCase().split(' ')[0])
      ) || customers[0];

      const amountMatch = lower.match(/(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[0], 10) : 500;

      setProposedAction({
        intent: 'REPAYMENT',
        intentLabel: t('voice.intentRepayLabel'),
        customerName: cust?.name,
        customerId: cust?.id,
        amountRupees: amount,
        description: 'Repayment / cash settlement',
      });
      return;
    }

    // 3. Balance query
    if (lower.includes('baaki') || lower.includes('balance') || lower.includes('kitna')) {
      const cust = customers.find((c) =>
        lower.includes(c.name.toLowerCase().split(' ')[0])
      ) || customers[1];

      setProposedAction({
        intent: 'SEARCH_BALANCE',
        intentLabel: t('voice.intentBalanceLabel'),
        customerName: cust?.name,
        customerId: cust?.id,
        description: t('voice.balanceDesc', {
          name: cust?.name || '',
          amount: formatPaise(cust?.currentBalancePaise || 0),
        }),
      });
      return;
    }

    // Default daily summary
    setProposedAction({
      intent: 'DAILY_SUMMARY',
      intentLabel: t('voice.intentSummaryLabel'),
      description: t('voice.summaryDesc', {
        sales: formatPaise(briefing.totalSalesPaise),
        collected: formatPaise(briefing.totalCollectedPaise),
      }),
    });
  };

  const handleSelectSample = (sampleText: string) => {
    setTranscript(sampleText);
    analyzeTranscript(sampleText);
  };

  // Human-in-the-loop confirmation handler strictly preserved
  // Nothing written to ledger until explicit tap
  const handleConfirmAction = () => {
    if (!proposedAction) return;

    if (proposedAction.intent === 'CREDIT_SALE' && proposedAction.customerId && proposedAction.amountRupees) {
      const amountPaise = rupeesToPaise(proposedAction.amountRupees);
      recordCreditSale(
        proposedAction.customerId,
        amountPaise,
        proposedAction.description || 'Voice command credit sale',
        'VOICE'
      );

      Alert.alert(
        t('voice.alertSuccessTitle'),
        t('voice.alertSuccessMsg', {
          name: proposedAction.customerName || '',
          amount: proposedAction.amountRupees,
        }),
        [
          {
            text: t('voice.viewKhataBtn'),
            onPress: () => router.replace(`/customer/${proposedAction.customerId}`),
          },
        ]
      );
      return;
    }

    if (proposedAction.intent === 'REPAYMENT' && proposedAction.customerId && proposedAction.amountRupees) {
      const amountPaise = rupeesToPaise(proposedAction.amountRupees);
      recordRepayment(
        proposedAction.customerId,
        amountPaise,
        proposedAction.description || 'Voice command repayment',
        'VOICE'
      );

      Alert.alert(
        t('voice.alertRepayTitle'),
        t('voice.alertRepayMsg', {
          name: proposedAction.customerName || '',
          amount: proposedAction.amountRupees,
        }),
        [
          {
            text: t('voice.viewKhataBtn'),
            onPress: () => router.replace(`/customer/${proposedAction.customerId}`),
          },
        ]
      );
      return;
    }

    if (proposedAction.customerId) {
      router.replace(`/customer/${proposedAction.customerId}`);
    } else {
      router.back();
    }
  };

  const isCredit = proposedAction?.intent === 'CREDIT_SALE';
  const isRepayment = proposedAction?.intent === 'REPAYMENT';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 56dp Top Sheet Bar: Title 'Bolo Khata', Subtext, and Dismiss '✕' */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bolo Khata</Text>
          <Text style={styles.headerSubtitle}>Aawaz se khata likhein</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={styles.closeBtn}
          hitSlop={10}
          accessibilityLabel={t('common.close')}
        >
          <Ionicons name="close" size={22} color={Theme.colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* VOICE RECORDING AREA */}
        <View style={styles.micCard}>
          {/* Circular Mic Button with Accent Frame */}
          <View style={styles.micOuterWrapper}>
            <View style={styles.micPulseRing} />
            <Pressable
              style={[
                styles.micButton,
                isListening && styles.micButtonActive,
              ]}
              onPress={handleSimulateListening}
              accessibilityLabel={t('voice.listeningActive')}
            >
              <Ionicons
                name={isListening ? 'radio' : 'mic'}
                size={28}
                color={Theme.colors.onPrimary}
              />
            </Pressable>
          </View>

          {/* Listening Status */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isListening ? Theme.colors.moneyRed : Theme.colors.secondaryContainer },
              ]}
            />
            <Text style={styles.statusText}>
              {isListening
                ? 'Listening • Aawaz Sun Rahe Hain...'
                : 'Tap to Speak • Bolne Ke Liye Dabayein'}
            </Text>
          </View>

          {/* Prompt Instruction */}
          <Text style={styles.promptHelperText}>
            Spasht bolein jaise:{' '}
            <Text style={styles.promptHelperItalic}>
              "Ramesh ke khate mein 200 rupaye udhaar likho"
            </Text>
          </Text>
        </View>

        {/* TRANSCRIPTION CARD: Editable text input with 1px border */}
        <View style={styles.transcriptCard}>
          <Text style={styles.transcriptLabel}>Aapne Kaha:</Text>
          <TextInput
            style={styles.transcriptInput}
            multiline
            value={transcript}
            onChangeText={(txt) => {
              setTranscript(txt);
              analyzeTranscript(txt);
            }}
            placeholder={t('voice.transcriptPlaceholder')}
            placeholderTextColor={Theme.colors.outline}
          />
        </View>

        {/* REVIEW CARD (PARSED EDITABLE FIELDS) */}
        {proposedAction && (
          <View style={styles.reviewCard}>
            {/* Field 1: Customer Details */}
            <View style={styles.fieldRow}>
              <View style={styles.fieldLeftCol}>
                <Text style={styles.fieldSubLabel}>Grahak (Customer)</Text>
                <Text style={styles.fieldNameText}>
                  {proposedAction.customerName || 'Customer Not Selected'}
                </Text>
                <Text style={styles.fieldPhoneText}>
                  {customers.find((c) => c.id === proposedAction.customerId)?.phone || '+91 98765 43210'}
                </Text>
              </View>
            </View>

            {/* Field 2: Amount */}
            {proposedAction.amountRupees !== undefined && (
              <View style={styles.fieldRow}>
                <View style={styles.fieldLeftCol}>
                  <Text style={styles.fieldSubLabel}>Raqam (Amount)</Text>
                  <Text style={styles.fieldAmountText}>
                    ₹{proposedAction.amountRupees}
                  </Text>
                </View>
              </View>
            )}

            {/* Field 3: Type Segmented Toggle */}
            <View style={styles.fieldRowLast}>
              <Text style={styles.fieldSubLabel}>Prakar (Entry Type)</Text>
              <View style={styles.segmentedToggle}>
                {/* Udhaar Segment */}
                <Pressable
                  style={[
                    styles.segmentBtn,
                    isCredit && styles.segmentBtnActiveCredit,
                  ]}
                  onPress={() => {
                    setProposedAction((prev) =>
                      prev
                        ? {
                            ...prev,
                            intent: 'CREDIT_SALE',
                            intentLabel: t('voice.intentCreditLabel'),
                          }
                        : null
                    );
                  }}
                >
                  <Ionicons
                    name="arrow-up"
                    size={14}
                    color={isCredit ? Theme.colors.onPrimary : Theme.colors.moneyRed}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      isCredit && styles.segmentTextActive,
                    ]}
                  >
                    - Udhaar (Owed)
                  </Text>
                </Pressable>

                {/* Jama Segment */}
                <Pressable
                  style={[
                    styles.segmentBtn,
                    isRepayment && styles.segmentBtnActiveJama,
                  ]}
                  onPress={() => {
                    setProposedAction((prev) =>
                      prev
                        ? {
                            ...prev,
                            intent: 'REPAYMENT',
                            intentLabel: t('voice.intentRepayLabel'),
                          }
                        : null
                    );
                  }}
                >
                  <Ionicons
                    name="arrow-down"
                    size={14}
                    color={isRepayment ? Theme.colors.onPrimary : Theme.colors.moneyGreen}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      isRepayment && styles.segmentTextActive,
                    ]}
                  >
                    + Jama (Received)
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* REASSURANCE BANNER (Human-in-the-loop guarantee) */}
        <View style={styles.reassuranceBanner}>
          <Ionicons name="information-circle-outline" size={16} color={Theme.colors.onSurfaceVariant} />
          <Text style={styles.reassuranceText}>
            Jab tak aap confirm nahi karenge, khata me koi badlaav nahi hoga.
          </Text>
        </View>

        {/* ACTION CTA BUTTONS */}
        <View style={styles.actionButtonGroup}>
          <Pressable
            style={styles.confirmButton}
            onPress={handleConfirmAction}
          >
            <Text style={styles.confirmButtonText}>Confirm Karein</Text>
          </Pressable>

          <Pressable
            style={styles.retryButton}
            onPress={handleSimulateListening}
          >
            <Ionicons name="refresh-outline" size={18} color={Theme.colors.primary} />
            <Text style={styles.retryButtonText}>Dobara Bolein</Text>
          </Pressable>
        </View>

        {/* Quick Sample Voice Commands for Testing */}
        <View style={styles.samplesSection}>
          <Text style={styles.samplesHeading}>{t('voice.trySamples')}</Text>
          {SEED_VOICE_COMMANDS.map((sample) => (
            <Pressable
              key={sample.id}
              style={styles.sampleRow}
              onPress={() => handleSelectSample(sample.hindiText)}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color={Theme.colors.primaryContainer}
              />
              <View style={styles.sampleTextCol}>
                <Text style={styles.sampleHindi}>"{sample.hindiText}"</Text>
                <Text style={styles.sampleEng}>{sample.englishMeaning}</Text>
              </View>
            </Pressable>
          ))}
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
  header: {
    height: 56,
    paddingHorizontal: Theme.spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surfaceCard,
  },
  headerTitle: {
    ...Theme.typography.titleMd,
    color: Theme.colors.primaryContainer,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
  },
  closeBtn: {
    padding: 6,
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  contentContainer: {
    padding: Theme.spacing.gutter,
    gap: Theme.spacing.md,
    paddingBottom: 40,
  },

  /* Recording Area */
  micCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.md,
    paddingVertical: 20,
    paddingHorizontal: Theme.spacing.md,
    alignItems: 'center',
  },
  micOuterWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
  },
  micPulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: Theme.colors.secondaryContainer,
    opacity: 0.5,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: Theme.colors.moneyRed,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...Theme.typography.labelMd,
    color: Theme.colors.primaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptHelperText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  promptHelperItalic: {
    color: Theme.colors.onSurface,
    fontWeight: '600',
    fontStyle: 'italic',
  },

  /* Transcribed Card */
  transcriptCard: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    padding: Theme.spacing.md,
    gap: 4,
  },
  transcriptLabel: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptInput: {
    ...Theme.typography.bodyLg,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    paddingVertical: 4,
  },

  /* Review Card */
  reviewCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
  },
  fieldRow: {
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
  },
  fieldRowLast: {
    padding: Theme.spacing.md,
  },
  fieldLeftCol: {
    gap: 2,
  },
  fieldSubLabel: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldNameText: {
    ...Theme.typography.bodyLg,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  fieldPhoneText: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
  },
  fieldAmountText: {
    fontSize: 24,
    fontWeight: '800',
    color: Theme.colors.onSurface,
    letterSpacing: -0.5,
  },

  /* Segmented Toggle */
  segmentedToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    overflow: 'hidden',
    marginTop: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: Theme.colors.surfaceCard,
  },
  segmentBtnActiveCredit: {
    backgroundColor: Theme.colors.moneyRed,
  },
  segmentBtnActiveJama: {
    backgroundColor: Theme.colors.moneyGreen,
  },
  segmentText: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
  },
  segmentTextActive: {
    color: Theme.colors.onPrimary,
  },

  /* Reassurance Banner */
  reassuranceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  reassuranceText: {
    flex: 1,
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    lineHeight: 18,
  },

  /* CTA Buttons */
  actionButtonGroup: {
    gap: 8,
  },
  confirmButton: {
    height: 48,
    backgroundColor: Theme.colors.primaryContainer,
    borderRadius: Theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    ...Theme.typography.bodyLg,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
  },
  retryButton: {
    height: 48,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceCard,
  },
  retryButtonText: {
    ...Theme.typography.bodyLg,
    color: Theme.colors.onSurface,
    fontWeight: '600',
  },

  /* Samples */
  samplesSection: {
    marginTop: 8,
    gap: 8,
  },
  samplesHeading: {
    ...Theme.typography.labelMd,
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
  },
  sampleTextCol: {
    flex: 1,
    gap: 2,
  },
  sampleHindi: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  sampleEng: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
  },
});
