import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/constants/theme';
import { Input, Button } from '@/components/ui';
import { sendVerificationCode, verifyCodeAndActivateUser } from '@/services/emailVerificationService';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  async function handleSendCode() {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }
    
    setIsSendingCode(true);
    const result = await sendVerificationCode(email, 'signup');
    setIsSendingCode(false);
    
    if (result.error) {
      alert(result.error);
      return;
    }
    
    setCodeSent(true);
    alert('Verification code sent to your email!');
  }

  async function handleVerify() {
    if (!email || !verificationCode) {
      alert('Please enter both email and verification code');
      return;
    }

    if (verificationCode.length !== 7) {
      alert('Verification code must be 7 digits');
      return;
    }
    
    setIsLoading(true);
    const result = await verifyCodeAndActivateUser(email, verificationCode);
    setIsLoading(false);
    
    if (result.error) {
      alert(result.error);
      return;
    }
    
    alert('Email verified successfully! You can now log in.');
    router.replace('/auth/login');
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

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email Address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setCodeSent(false);
            }}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {!codeSent ? (
            <Button
              title={isSendingCode ? 'Sending Code...' : 'Send Verification Code'}
              onPress={handleSendCode}
              disabled={!email || isSendingCode}
              fullWidth
            />
          ) : (
            <>
              <Input
                label="Verification Code"
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="1234567"
                keyboardType="number-pad"
                maxLength={7}
                autoCapitalize="none"
              />

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code?</Text>
                <Pressable onPress={handleSendCode} disabled={isSendingCode}>
                  <Text style={[styles.resendLink, isSendingCode && styles.resendLinkDisabled]}>
                    {isSendingCode ? 'Sending...' : 'Resend Code'}
                  </Text>
                </Pressable>
              </View>

              <Button
                title={isLoading ? 'Verifying...' : 'Verify Email'}
                onPress={handleVerify}
                disabled={verificationCode.length !== 7 || isLoading}
                fullWidth
              />
            </>
          )}
        </View>

        {/* Info Box */}
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
  form: {
    marginBottom: spacing.lg,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginVertical: spacing.sm,
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
    marginBottom: spacing.lg,
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
