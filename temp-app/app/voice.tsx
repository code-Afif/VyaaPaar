import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { SEED_VOICE_COMMANDS } from '@/data/seedData';
import { formatPaise, rupeesToPaise } from '@/utils/format';
import { generateUUID } from '@/utils/uuid';
import { Customer } from '@/types';

interface ExtractedAction {
  intent: 'CREDIT_SALE' | 'REPAYMENT' | 'SEARCH_BALANCE' | 'DAILY_SUMMARY';
  intentLabel: string;
  customerName?: string;
  customerId?: string;
  amountRupees?: number;
  description?: string;
  isNewCustomer?: boolean;
  disambiguationCandidates?: Customer[];
}

export default function VoiceAssistantScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { customers, recordCreditSale, recordRepayment, addCustomer, briefing } = useApp();

  const [transcript, setTranscript] = useState(
    'Ramesh ko 300 rupaye ka samaan udhaar likh do'
  );
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const voiceIdempotencyKeyRef = useRef(`voice-init-${Date.now()}`);
  const newCustomerUuidRef = useRef<string>(generateUUID());

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

  // Transcript parser matching case-insensitive and trimmed
  const analyzeTranscript = (text: string) => {
    const cleanText = text.trim();
    const lower = cleanText.toLowerCase();

    const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const words = cleanText
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097F\s]/gi, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const transcriptWords = new Set(words);

    // Match customer names: whole-word matches only (split transcript into words)
    const findMatchingCustomers = (): Customer[] => {
      if (!customers || customers.length === 0) return [];
      return customers.filter((c) => {
        const cleanName = c.name.trim().toLowerCase();
        if (!cleanName) return false;
        // 1. Exact full name match as whole phrase bounded by spaces or start/end
        const fullNameRegex = new RegExp(`(^|\\s)${escapeRegex(cleanName)}(\\s|$)`, 'i');
        if (fullNameRegex.test(cleanText)) return true;
        // 2. Whole-word token match from transcript word set (tokens >= 2 chars)
        const nameTokens = cleanName
          .replace(/[^a-z0-9\u0900-\u097F\s]/gi, ' ')
          .split(/\s+/)
          .filter((token) => token.length >= 2);
        return nameTokens.some((token) => transcriptWords.has(token));
      });
    };

    // Extract spoken candidate name if no customer matched
    const extractSpokenName = (): string => {
      const match = cleanText.match(/^([A-Za-z\u0900-\u097F\s]+?)\s+(?:ko|se|ka|ne|ke)\b/i);
      if (match && match[1].trim()) {
        return match[1].trim();
      }
      const firstWord = cleanText.split(/\s+/)[0];
      return firstWord || t('voice.defaultNewCustomerName');
    };

    // 1. Credit Sale
    if (lower.includes('udhaar') || lower.includes('likh')) {
      const matched = findMatchingCustomers();
      const amountMatch = lower.match(/(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[0], 10) : 300;

      let customerId: string | undefined;
      let customerName: string | undefined;
      let isNewCustomer = false;
      let disambiguationCandidates: Customer[] | undefined;

      if (matched.length === 1) {
        customerId = matched[0].id;
        customerName = matched[0].name;
      } else if (matched.length > 1) {
        disambiguationCandidates = matched;
        customerId = undefined;
        customerName = undefined;
      } else {
        isNewCustomer = true;
        customerName = extractSpokenName();
        newCustomerUuidRef.current = generateUUID();
      }

      voiceIdempotencyKeyRef.current = `voice-credit-${Date.now()}`;

      setProposedAction({
        intent: 'CREDIT_SALE',
        intentLabel: t('voice.intentCreditLabel'),
        customerName,
        customerId,
        amountRupees: amount,
        description: 'Kirana samaan / udhaar',
        isNewCustomer,
        disambiguationCandidates,
      });
      return;
    }

    // 2. Repayment
    if (lower.includes('lauta') || lower.includes('mila') || lower.includes('jama')) {
      const matched = findMatchingCustomers();
      const amountMatch = lower.match(/(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[0], 10) : 500;

      let customerId: string | undefined;
      let customerName: string | undefined;
      let isNewCustomer = false;
      let disambiguationCandidates: Customer[] | undefined;

      if (matched.length === 1) {
        customerId = matched[0].id;
        customerName = matched[0].name;
      } else if (matched.length > 1) {
        disambiguationCandidates = matched;
        customerId = undefined;
        customerName = undefined;
      } else {
        isNewCustomer = true;
        customerName = extractSpokenName();
        newCustomerUuidRef.current = generateUUID();
      }

      voiceIdempotencyKeyRef.current = `voice-repay-${Date.now()}`;

      setProposedAction({
        intent: 'REPAYMENT',
        intentLabel: t('voice.intentRepayLabel'),
        customerName,
        customerId,
        amountRupees: amount,
        description: 'Repayment / cash settlement',
        isNewCustomer,
        disambiguationCandidates,
      });
      return;
    }

    // 3. Balance query
    if (lower.includes('baaki') || lower.includes('balance') || lower.includes('kitna')) {
      const matched = findMatchingCustomers();
      if (matched.length === 1) {
        const cust = matched[0];
        setProposedAction({
          intent: 'SEARCH_BALANCE',
          intentLabel: t('voice.intentBalanceLabel'),
          customerName: cust.name,
          customerId: cust.id,
          description: t('voice.balanceDesc', {
            name: cust.name || '',
            amount: formatPaise(cust.currentBalancePaise || 0),
          }),
        });
      } else if (matched.length > 1) {
        setProposedAction({
          intent: 'SEARCH_BALANCE',
          intentLabel: t('voice.intentBalanceLabel'),
          disambiguationCandidates: matched,
          description: 'Multiple matching customers found. Please select below.',
        });
      } else {
        const spoken = extractSpokenName();
        newCustomerUuidRef.current = generateUUID();
        setProposedAction({
          intent: 'SEARCH_BALANCE',
          intentLabel: t('voice.intentBalanceLabel'),
          customerName: spoken,
          isNewCustomer: true,
          description: `"${spoken}" is not found in existing khata.`,
        });
      }
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

  // Human-in-the-loop confirmation handler with synchronous ref guard
  const handleConfirmAction = async () => {
    if (!proposedAction) return;

    // Disambiguation check: if several matched, ask which one before creating or recording
    if (proposedAction.disambiguationCandidates && proposedAction.disambiguationCandidates.length > 1 && !proposedAction.customerId) {
      Alert.alert(t('voice.selectCustomerTitle'), t('voice.selectCustomerMsg'));
      return;
    }

    // Synchronous guard checked BEFORE the first await
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      let targetCustomerId = proposedAction.customerId;
      let targetCustomerName = (proposedAction.customerName && proposedAction.customerName.trim()) || t('voice.defaultNewCustomerName');

      // If new customer notice, create customer first (reuse UUID on retry, skip if already exists)
      if (proposedAction.isNewCustomer && !targetCustomerId) {
        const candidateId = newCustomerUuidRef.current;
        const existing = customers.find((c) => c.id === candidateId);
        if (existing) {
          targetCustomerId = existing.id;
          targetCustomerName = existing.name;
        } else {
          const newCust = await addCustomer(
            targetCustomerName,
            undefined,
            0,
            candidateId
          );
          targetCustomerId = newCust.id;
          targetCustomerName = newCust.name;
        }
      }

      if (proposedAction.intent === 'CREDIT_SALE' && targetCustomerId && proposedAction.amountRupees) {
        const amountPaise = rupeesToPaise(proposedAction.amountRupees);
        await recordCreditSale(
          targetCustomerId,
          amountPaise,
          proposedAction.description || 'Voice command credit sale',
          'VOICE',
          voiceIdempotencyKeyRef.current
        );

        Alert.alert(
          t('voice.alertSuccessTitle'),
          t('voice.alertSuccessMsg', {
            name: targetCustomerName,
            amount: proposedAction.amountRupees,
          }),
          [
            {
              text: t('voice.viewKhataBtn'),
              onPress: () => router.replace(`/customer/${targetCustomerId}`),
            },
          ]
        );
        return;
      }

      if (proposedAction.intent === 'REPAYMENT' && targetCustomerId && proposedAction.amountRupees) {
        const amountPaise = rupeesToPaise(proposedAction.amountRupees);
        await recordRepayment(
          targetCustomerId,
          amountPaise,
          proposedAction.description || 'Voice command repayment',
          'VOICE',
          undefined,
          voiceIdempotencyKeyRef.current
        );

        Alert.alert(
          t('voice.alertRepayTitle'),
          t('voice.alertRepayMsg', {
            name: targetCustomerName,
            amount: proposedAction.amountRupees,
          }),
          [
            {
              text: t('voice.viewKhataBtn'),
              onPress: () => router.replace(`/customer/${targetCustomerId}`),
            },
          ]
        );
        return;
      }

      if (targetCustomerId) {
        router.replace(`/customer/${targetCustomerId}`);
      } else {
        router.back();
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || 'Failed to record voice action');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const isCredit = proposedAction?.intent === 'CREDIT_SALE';
  const isRepayment = proposedAction?.intent === 'REPAYMENT';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 56dp Top Sheet Bar: Title 'Bolo Khata', Subtext, and Dismiss Button */}
      <View style={styles.header}>
        <View style={styles.headerTitleCol}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>{t('voice.sheetTitle')}</Text>
            <View style={styles.demoPill}>
              <Text style={styles.demoPillText}>{t('voice.demoBadge')}</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>{t('voice.sheetSubtitle')}</Text>
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
            {/* Explicit Notice when No Existing Match: New Customer Will Be Created */}
            {proposedAction.isNewCustomer && (
              <View style={styles.newCustomerBanner}>
                <Ionicons name="person-add" size={16} color={Theme.colors.secondary} />
                <Text style={styles.newCustomerBannerText}>
                  {t('voice.newCustomerNoticeTitle', {
                    name: proposedAction.customerName || t('voice.defaultNewCustomerName'),
                  })}
                </Text>
              </View>
            )}

            {/* Multiple matches: Ask which one instead of creating a new one */}
            {proposedAction.disambiguationCandidates && proposedAction.disambiguationCandidates.length > 1 && (
              <View style={styles.disambiguationSection}>
                <Text style={styles.disambiguationHeading}>
                  {t('voice.disambiguationPrompt')}
                </Text>
                <View style={styles.candidatesList}>
                  {proposedAction.disambiguationCandidates.map((c) => {
                    const isSelected = proposedAction.customerId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        style={[
                          styles.candidateCard,
                          isSelected && styles.candidateCardSelected,
                        ]}
                        onPress={() => {
                          setProposedAction((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  customerId: c.id,
                                  customerName: c.name,
                                }
                              : null
                          );
                        }}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'radio-button-off'}
                          size={16}
                          color={isSelected ? Theme.colors.primaryContainer : Theme.colors.outline}
                        />
                        <Text
                          style={[
                            styles.candidateName,
                            isSelected && styles.candidateNameSelected,
                          ]}
                        >
                          {c.name} {c.phone ? `(${c.phone})` : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Field 1: Customer Details */}
            <View style={styles.fieldRow}>
              <View style={styles.fieldLeftCol}>
                <Text style={styles.fieldSubLabel}>{t('voice.customerLabel')}</Text>
                {proposedAction.isNewCustomer ? (
                  <View style={styles.newCustomerInputWrapper}>
                    <Text style={styles.newCustomerInputLabel}>
                      {t('voice.newCustomerNameLabel')}
                    </Text>
                    <TextInput
                      style={styles.newCustomerNameInput}
                      value={proposedAction.customerName || ''}
                      onChangeText={(val) => {
                        setProposedAction((prev) =>
                          prev ? { ...prev, customerName: val } : null
                        );
                      }}
                      placeholder={t('voice.newCustomerNamePlaceholder')}
                      placeholderTextColor={Theme.colors.outline}
                    />
                    <Text style={[styles.fieldPhoneText, { color: Theme.colors.secondary, fontWeight: '600' }]}>
                      {t('voice.newCustomerFieldSub')}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.fieldNameText}>
                      {proposedAction.customerName ||
                        (proposedAction.disambiguationCandidates
                          ? t('voice.selectCustomerPlaceholder')
                          : t('voice.customerNotSelected'))}
                    </Text>
                    {customers.find((c) => c.id === proposedAction.customerId)?.phone ? (
                      <Text style={styles.fieldPhoneText}>
                        {customers.find((c) => c.id === proposedAction.customerId)?.phone}
                      </Text>
                    ) : proposedAction.disambiguationCandidates && !proposedAction.customerId ? (
                      <Text style={styles.fieldPhoneText}>
                        {t('voice.disambiguationPrompt')}
                      </Text>
                    ) : null}
                  </>
                )}
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
            style={[styles.confirmButton, isSubmitting && { opacity: 0.6 }]}
            disabled={isSubmitting}
            onPress={handleConfirmAction}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={Theme.colors.onPrimary} />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Karein</Text>
            )}
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
  headerTitleCol: {
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    ...Theme.typography.titleMd,
    color: Theme.colors.primaryContainer,
    fontWeight: '700',
  },
  demoPill: {
    backgroundColor: Theme.colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.sm,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
  },
  demoPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
    letterSpacing: 0.5,
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
    overflow: 'hidden',
  },
  newCustomerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BAE6FD',
    padding: Theme.spacing.md,
  },
  newCustomerBannerText: {
    ...Theme.typography.bodySm,
    fontWeight: '700',
    color: Theme.colors.secondary,
    flex: 1,
  },
  disambiguationSection: {
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surfaceContainerLow,
    gap: 8,
  },
  disambiguationHeading: {
    ...Theme.typography.labelMd,
    color: Theme.colors.moneyRed,
    fontWeight: '700',
  },
  candidatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Theme.radii.sm,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    backgroundColor: Theme.colors.surfaceCard,
  },
  candidateCardSelected: {
    borderColor: Theme.colors.primaryContainer,
    backgroundColor: '#EBF4FF',
  },
  candidateName: {
    ...Theme.typography.bodySm,
    fontWeight: '600',
    color: Theme.colors.onSurface,
  },
  candidateNameSelected: {
    color: Theme.colors.primaryContainer,
    fontWeight: '700',
  },
  candidatePhone: {
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
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
  newCustomerInputWrapper: {
    gap: 4,
    marginTop: 2,
  },
  newCustomerInputLabel: {
    ...Theme.typography.bodySm,
    color: Theme.colors.onSurfaceVariant,
    marginBottom: 2,
  },
  newCustomerNameInput: {
    ...Theme.typography.bodyLg,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    borderWidth: 1,
    borderColor: Theme.colors.hairline,
    borderRadius: Theme.radii.sm,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: Theme.colors.surfaceContainerLow,
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
