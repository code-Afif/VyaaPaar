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
import { Palette } from '@/constants/Colors';
import { useApp } from '@/context/AppContext';
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
  const { customers, recordCreditSale, recordRepayment, briefing } = useApp();

  const [transcript, setTranscript] = useState(
    'Ramesh ko 300 rupaye ka samaan udhaar likh do'
  );
  const [isListening, setIsListening] = useState(false);
  const [proposedAction, setProposedAction] = useState<ExtractedAction | null>({
    intent: 'CREDIT_SALE',
    intentLabel: 'Naya Udhaar Likhein (Record Credit Sale)',
    customerName: 'Ramesh Kumar',
    customerId: 'cust-1',
    amountRupees: 300,
    description: 'Groceries / samaan',
  });

  const handleSimulateListening = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      // Randomly pick another sample command or toggle
      const sample = SEED_VOICE_COMMANDS[0];
      setTranscript(sample.hindiText);
      analyzeTranscript(sample.hindiText);
    }, 1500);
  };

  const analyzeTranscript = (text: string) => {
    const lower = text.toLowerCase();

    // 1. Credit Sale
    if (lower.includes('udhaar') || lower.includes('likh')) {
      // Find matching customer
      const cust = customers.find((c) =>
        lower.includes(c.name.toLowerCase().split(' ')[0])
      ) || customers[0];

      // Extract amount
      const amountMatch = lower.match(/(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[0], 10) : 300;

      setProposedAction({
        intent: 'CREDIT_SALE',
        intentLabel: 'Naya Udhaar Likhein (Credit Sale)',
        customerName: cust.name,
        customerId: cust.id,
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
        intentLabel: 'Paisa Mila (Repayment Entry)',
        customerName: cust.name,
        customerId: cust.id,
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
        intentLabel: 'Grahak Udhaar Jaankari (Balance Check)',
        customerName: cust.name,
        customerId: cust.id,
        description: `${cust.name} ka kul udhaar ${formatPaise(cust.currentBalancePaise)} baaki hai.`,
      });
      return;
    }

    // Default daily summary
    setProposedAction({
      intent: 'DAILY_SUMMARY',
      intentLabel: 'Aaj Ki Bikri Jaankari (Daily Summary)',
      description: `Aaj ki total sale ${formatPaise(briefing.totalSalesPaise)} hai aur collected payments ${formatPaise(briefing.totalCollectedPaise)} hain.`,
    });
  };

  const handleSelectSample = (sampleText: string) => {
    setTranscript(sampleText);
    analyzeTranscript(sampleText);
  };

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
        'Transaction Recorded! ✅',
        `${proposedAction.customerName} ke Khata mein ₹${proposedAction.amountRupees} ka udhaar safalta-purvak jud gaya hai.`,
        [
          {
            text: 'Khata Dekhein',
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
        'Repayment Recorded! ✅',
        `${proposedAction.customerName} se prapt ₹${proposedAction.amountRupees} khata mein jama ho gaye hain.`,
        [
          {
            text: 'Khata Dekhein',
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="close" size={24} color={Palette.darkNavy} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Voice Assistant</Text>
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>VOICE-TO-KHATA</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Visual Waveform / Mic Listening Container */}
        <View style={styles.micCard}>
          <Pressable
            style={[
              styles.micBigCircle,
              isListening && styles.micBigCircleActive,
            ]}
            onPress={handleSimulateListening}
          >
            <Ionicons
              name={isListening ? 'radio' : 'mic'}
              size={40}
              color={Palette.white}
            />
          </Pressable>

          <Text style={styles.micStatusText}>
            {isListening
              ? 'Sun rahe hain... (Listening)'
              : 'Dabayein aur bolein ya niche sample chunein'}
          </Text>

          <Text style={styles.languageText}>
            Supported: Hindi / Hinglish / English
          </Text>
        </View>

        {/* Editable Transcript Input */}
        <View style={styles.transcriptCard}>
          <View style={styles.transcriptHeaderRow}>
            <Text style={styles.transcriptLabel}>
              Recognized Speech (Aapka Sandesh):
            </Text>
            <Text style={styles.editableHint}>Editable text</Text>
          </View>

          <TextInput
            style={styles.transcriptInput}
            multiline
            value={transcript}
            onChangeText={(txt) => {
              setTranscript(txt);
              analyzeTranscript(txt);
            }}
            placeholder="Kuchh bolein ya yahan type karein..."
            placeholderTextColor={Palette.textMuted}
          />
        </View>

        {/* AI Action Proposal Card (Human-in-the-Loop Confirmation) */}
        {proposedAction && (
          <View style={styles.proposalCard}>
            <View style={styles.proposalHeader}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={14} color={Palette.white} />
                <Text style={styles.aiBadgeText}>AI ACTION PROPOSAL</Text>
              </View>
              <Text style={styles.requiresConfirm}>Needs Confirmation</Text>
            </View>

            <View style={styles.intentRow}>
              <Text style={styles.intentTitle}>{proposedAction.intentLabel}</Text>
            </View>

            {proposedAction.customerName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Grahak (Customer):</Text>
                <Text style={styles.detailValue}>
                  {proposedAction.customerName}
                </Text>
              </View>
            )}

            {proposedAction.amountRupees !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Raqam (Amount):</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color:
                        proposedAction.intent === 'CREDIT_SALE'
                          ? Palette.dangerRed
                          : Palette.successGreen,
                      fontSize: 18,
                      fontWeight: '800',
                    },
                  ]}
                >
                  ₹{proposedAction.amountRupees}
                </Text>
              </View>
            )}

            {proposedAction.description && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vivaran (Note):</Text>
                <Text style={styles.detailValue}>
                  {proposedAction.description}
                </Text>
              </View>
            )}

            <View style={styles.confirmButtonsRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setProposedAction(null)}
              >
                <Text style={styles.cancelBtnText}>Radd Karein</Text>
              </Pressable>

              <Pressable
                style={styles.confirmBtn}
                onPress={handleConfirmAction}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={Palette.white}
                />
                <Text style={styles.confirmBtnText}>Haan, Khata Mein Likho</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Quick Sample Voice Commands */}
        <Text style={styles.samplesTitle}>
          Try Common Kirana Voice Commands (Click to Test):
        </Text>

        <View style={styles.samplesList}>
          {SEED_VOICE_COMMANDS.map((sample) => (
            <Pressable
              key={sample.id}
              style={styles.sampleItem}
              onPress={() => handleSelectSample(sample.hindiText)}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={Palette.primaryBlue}
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
    backgroundColor: Palette.white,
  },
  header: {
    backgroundColor: Palette.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  demoBadge: {
    backgroundColor: Palette.primaryBlueLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.primaryBlueDark,
  },
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  micCard: {
    backgroundColor: Palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  micBigCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Palette.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: Palette.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 12,
  },
  micBigCircleActive: {
    backgroundColor: Palette.dangerRed,
    transform: [{ scale: 1.08 }],
  },
  micStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkNavy,
    textAlign: 'center',
  },
  languageText: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 4,
  },
  transcriptCard: {
    backgroundColor: Palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginBottom: 14,
  },
  transcriptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  editableHint: {
    fontSize: 11,
    color: Palette.primaryBlue,
    fontWeight: '500',
  },
  transcriptInput: {
    fontSize: 15,
    color: Palette.darkNavy,
    fontWeight: '600',
    lineHeight: 22,
    minHeight: 48,
  },
  proposalCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Palette.primaryBlue,
    padding: 16,
    marginBottom: 18,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiBadge: {
    backgroundColor: Palette.primaryBlue,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.white,
  },
  requiresConfirm: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.warningAmber,
  },
  intentRow: {
    marginBottom: 10,
  },
  intentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  detailLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkNavy,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: Palette.primaryBlue,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmBtnText: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: '700',
  },
  samplesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.darkNavy,
    marginBottom: 8,
  },
  samplesList: {
    gap: 8,
  },
  sampleItem: {
    backgroundColor: Palette.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sampleTextCol: {
    flex: 1,
  },
  sampleHindi: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  sampleEng: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
});
