import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette } from '@/constants/Colors';
import { useApp } from '@/context/AppContext';
import { rupeesToPaise } from '@/utils/format';

export default function NewCustomerScreen() {
  const router = useRouter();
  const { addCustomer } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Kripya grahak ka naam enter karein.');
      return;
    }

    const openingPaise = openingBalance ? rupeesToPaise(openingBalance) : 0;
    const cleanPhone = phone.trim() ? (phone.startsWith('+91') ? phone : `+91 ${phone.trim()}`) : undefined;

    const newCust = await addCustomer(name, cleanPhone, openingPaise);

    Alert.alert(
      'Grahak Joda Gaya 🎉',
      `${newCust.name} ka khata safalta-purvak ban gaya hai.`,
      [
        {
          text: 'Khata Kholein',
          onPress: () => router.replace(`/customer/${newCust.id}`),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="close" size={24} color={Palette.darkNavy} />
        </Pressable>
        <Text style={styles.headerTitle}>Naya Grahak Jodein</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.formCard}>
          {/* Customer Name */}
          <Text style={styles.label}>
            Grahak Ka Naam <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={Palette.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Mukesh Aggarwal"
              placeholderTextColor={Palette.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          {/* Mobile Number */}
          <Text style={styles.label}>Mobile Number (WhatsApp Reminder ke liye)</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={18} color={Palette.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              placeholderTextColor={Palette.textMuted}
              keyboardType="phone-pad"
              maxLength={13}
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Opening Balance */}
          <Text style={styles.label}>
            Pichhla Purana Udhaar (Opening Balance, optional)
          </Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.rupeePrefix}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="0 (Agar pehle se udhaar baaki ho)"
              placeholderTextColor={Palette.textMuted}
              keyboardType="numeric"
              value={openingBalance}
              onChangeText={setOpeningBalance}
            />
          </View>
        </View>

        {/* Save Button */}
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={20} color={Palette.white} />
          <Text style={styles.saveButtonText}>Grahak Khata Banayein</Text>
        </Pressable>
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
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  contentContainer: {
    padding: 16,
  },
  formCard: {
    backgroundColor: Palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkNavy,
    marginBottom: 6,
    marginTop: 10,
  },
  required: {
    color: Palette.dangerRed,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 6,
  },
  rupeePrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.darkNavy,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: Palette.textPrimary,
  },
  saveButton: {
    backgroundColor: Palette.primaryBlue,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  saveButtonText: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
