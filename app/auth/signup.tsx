import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { Input, Button } from '@/components';
import { sendVerificationCode, verifyCode } from '@/services/emailVerificationService';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Verification state
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [verificationCode, setVerificationCode] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  async function handleSendCode() {
    if (!name || !email || !password || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    // Validate email format
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
    
    // Store demo code (remove in production)
    setDemoCode(result.demoCode || null);
    setStep('verify');
  }

  async function handleVerifyAndSignup() {
    if (verificationCode.length !== 7) {
      alert('Please enter the 7-digit verification code');
      return;
    }
    
    setIsLoading(true);
    
    // Verify the code first
    const verifyResult = await verifyCode(email, verificationCode, 'signup');
    
    if (verifyResult.error) {
      setIsLoading(false);
      alert(verifyResult.error);
      return;
    }
    
    // Code verified successfully, now create the account
    await register(email, password, name);
    setIsLoading(false);
    router.replace('/onboarding');
  }

  function handleBackToDetails() {
    setStep('details');
    setVerificationCode('');
    setDemoCode(null);
  }

  async function handleResendCode() {
    setIsSendingCode(true);
    const result = await sendVerificationCode(email, 'signup');
    setIsSendingCode(false);
    
    if (result.error) {
      alert(result.error);
    } else {
      setDemoCode(result.demoCode || null);
      alert('Verification code sent!');
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="school" size={48} color={colors.primary} />
          </View>
          <Text style={styles.appName}>FairPrep</Text>
          <Text style={styles.byline}>Dalsi Academy</Text>
          <Text style={styles.tagline}>Create Your Account</Text>
        </View>

        {/* Form - Step 1: Enter Details */}
        {step === 'details' && (
          <View style={styles.form}>
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="John Smith"
            />
            
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              showPasswordToggle
            />
            
            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              secureTextEntry
              showPasswordToggle
            />
            
            <Button
              title={isSendingCode ? 'Sending Code...' : 'Continue'}
              onPress={handleSendCode}
              disabled={!name || !email || !password || !confirmPassword || isSendingCode}
              fullWidth
            />
          </View>
        )}

        {/* Form - Step 2: Verify Email */}
        {step === 'verify' && (
          <View style={styles.form}>
            <View style={styles.verifyHeader}>
              <MaterialIcons name="mark-email-read" size={48} color={colors.success} />
              <Text style={styles.verifyTitle}>Check Your Email</Text>
              <Text style={styles.verifyDesc}>
                We've sent a 7-digit verification code to{' \n'}
                <Text style={styles.verifyEmail}>{email}</Text>
              </Text>
            </View>

            {/* Demo Mode Notice - Always shows code locally */}
            <View style={styles.demoNotice}>
              <MaterialIcons name="info-outline" size={20} color={colors.success} />
              <View style={styles.demoNoticeContent}>
                <Text style={styles.demoNoticeTitle}>LOCAL EMAIL VERIFICATION</Text>
                <Text style={styles.demoNoticeText}>
                  Your verification code: <Text style={styles.demoCode}>{demoCode}</Text>
                </Text>
                <Text style={styles.demoNoticeSubtext}>
                  Copy this code and enter it below to verify your email
                </Text>
              </View>
            </View>
            
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
              <Pressable onPress={handleResendCode} disabled={isSendingCode}>
                <Text style={[styles.resendLink, isSendingCode && styles.resendLinkDisabled]}>
                  {isSendingCode ? 'Sending...' : 'Resend Code'}
                </Text>
              </Pressable>
            </View>
            
            <Button
              title={isLoading ? 'Verifying...' : 'Verify & Create Account'}
              onPress={handleVerifyAndSignup}
              disabled={verificationCode.length !== 7 || isLoading}
              fullWidth
            />

            <Pressable style={styles.backButton} onPress={handleBackToDetails}>
              <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
              <Text style={styles.backButtonText}>Back to Details</Text>
            </Pressable>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
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
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  byline: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  tagline: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: {
    marginBottom: spacing.lg,
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
  verifyHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  verifyTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  verifyDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  verifyEmail: {
    color: colors.primary,
    fontWeight: typography.semibold,
  },
  demoNotice: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.success,
    gap: spacing.sm,
  },
  demoNoticeContent: {
    flex: 1,
  },
  demoNoticeTitle: {
    fontSize: typography.caption,
    fontWeight: typography.bold,
    color: colors.success,
    marginBottom: 4,
  },
  demoNoticeText: {
    fontSize: typography.bodySmall,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  demoCode: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.success,
    fontFamily: 'monospace',
  },
  demoNoticeSubtext: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    fontStyle: 'italic',
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    fontSize: typography.bodySmall,
    color: colors.primary,
    fontWeight: typography.semibold,
  },
});
