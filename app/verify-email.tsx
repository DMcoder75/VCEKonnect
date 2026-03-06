import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/constants/theme';
import { Input, Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { sendVerificationCode } from '@/services/emailVerificationService';

type VerificationMode = 'have-code' | 'need-code';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [mode, setMode] = useState<VerificationMode>('need-code');
  const [email, setEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const { verify } = useAuth();
  
  // Refs for code input boxes
  const codeInputRefs = useRef<(TextInput | null)[]>([]);

  function handleCodeChange(index: number, value: string) {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');
    
    if (digit.length > 1) {
      // Handle paste of multiple digits
      const digits = digit.slice(0, 7).split('');
      const newCodeDigits = [...codeDigits];
      digits.forEach((d, i) => {
        if (index + i < 7) {
          newCodeDigits[index + i] = d;
        }
      });
      setCodeDigits(newCodeDigits);
      
      // Focus on the last filled box or next empty box
      const nextIndex = Math.min(index + digits.length, 6);
      codeInputRefs.current[nextIndex]?.focus();
    } else {
      const newCodeDigits = [...codeDigits];
      newCodeDigits[index] = digit;
      setCodeDigits(newCodeDigits);
      
      // Auto-focus next input
      if (digit && index < 6) {
        codeInputRefs.current[index + 1]?.focus();
      }
    }
  }

  function handleCodeKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !codeDigits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      codeInputRefs.current[index - 1]?.focus();
    }
  }

  async function handleSendCode() {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    setIsSendingCode(true);
    
    try {
      const { success, error } = await sendVerificationCode(email, 'signup');
      
      if (error) {
        Alert.alert('Failed to Send Code', error);
      } else {
        Alert.alert(
          'Code Sent!',
          'A new 7-digit verification code has been sent to your email. Please check your inbox (and spam folder).'
        );
        // Switch to "I have code" mode automatically
        setMode('have-code');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleVerifyCode() {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const code = codeDigits.join('');
    if (code.length !== 7) {
      Alert.alert('Error', 'Please enter all 7 digits of the verification code');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('📧 [VERIFY] Starting email verification...');
      console.log('📧 [VERIFY] Email:', email);
      console.log('📧 [VERIFY] Code:', code);
      
      await verify(email, code);
      
      console.log('✅ [VERIFY] Email verified successfully!');
      Alert.alert(
        'Success!',
        'Email verified successfully! You can now log in.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/auth/login'),
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ [VERIFY] Verification failed:', error);
      Alert.alert('Verification Failed', error.message || 'Please check your code and try again');
      // Clear code on error
      setCodeDigits(['', '', '', '']);
      codeInputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Verify Email</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="mark-email-read" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.description}>
            Enter your email address and the 7-digit verification code sent to your inbox
          </Text>
        </View>

        {/* Radio Buttons */}
        <View style={styles.radioContainer}>
          <Pressable
            style={styles.radioButton}
            onPress={() => setMode('need-code')}
          >
            <View style={styles.radioOuter}>
              {mode === 'need-code' && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.radioLabel}>I need code</Text>
          </Pressable>

          <Pressable
            style={styles.radioButton}
            onPress={() => setMode('have-code')}
          >
            <View style={styles.radioOuter}>
              {mode === 'have-code' && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.radioLabel}>I have code</Text>
          </Pressable>
        </View>

        {/* Email Input (always visible) */}
        <View style={styles.form}>
          <Input
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {mode === 'need-code' ? (
            /* "I need code" mode - Show send button */
            <>
              <Button
                title={isSendingCode ? 'Sending Code...' : 'Send Verification Code'}
                onPress={handleSendCode}
                disabled={!email || isSendingCode}
                fullWidth
              />

              <View style={styles.infoBox}>
                <MaterialIcons name="info-outline" size={20} color={colors.info} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoText}>
                    Check your email inbox (and spam folder) for the verification code from FairPrep
                  </Text>
                  <Text style={[styles.infoText, { marginTop: spacing.xs }]}>
                    The code expires in 10 minutes
                  </Text>
                </View>
              </View>
            </>
          ) : (
            /* "I have code" mode - Show 7-digit input boxes */
            <>
              <Text style={styles.codeLabel}>Enter 7-Digit Verification Code</Text>
              <View style={styles.codeInputContainer}>
                {codeDigits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (codeInputRefs.current[index] = ref)}
                    style={[
                      styles.codeInput,
                      digit && styles.codeInputFilled,
                    ]}
                    value={digit}
                    onChangeText={(value) => handleCodeChange(index, value)}
                    onKeyPress={({ nativeEvent: { key } }) => handleCodeKeyPress(index, key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <Button
                title={isLoading ? 'Verifying...' : 'Verify'}
                onPress={handleVerifyCode}
                disabled={codeDigits.join('').length !== 7 || isLoading}
                fullWidth
                style={{ marginTop: spacing.lg }}
              />

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code?</Text>
                <Pressable onPress={handleSendCode} disabled={isSendingCode}>
                  <Text style={[styles.resendLink, isSendingCode && styles.resendLinkDisabled]}>
                    {isSendingCode ? 'Sending...' : 'Resend Code'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable onPress={() => router.replace('/auth/login')}>
            <Text style={styles.footerText}>
              Already verified?{' '}
              <Text style={styles.footerLink}>Log In</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: typography.body,
    color: colors.textPrimary,
    fontWeight: typography.medium,
  },
  form: {
    marginBottom: spacing.lg,
  },
  codeLabel: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  codeInput: {
    width: 44,
    height: 56,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 24,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  resendText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
  resendLink: {
    fontSize: typography.bodySmall,
    color: colors.primary,
    fontWeight: typography.semibold,
    textDecorationLine: 'underline',
  },
  resendLinkDisabled: {
    color: colors.textTertiary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
    marginTop: spacing.lg,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  infoText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: typography.semibold,
  },
});
