import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { Input, Button } from '@/components';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }
    
    setIsLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (error: any) {
      console.error('Login error:', error);
      alert(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ImageBackground
        source={require('@/assets/login-background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
        imageStyle={styles.backgroundImageStyle}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Spacer to position content below the logo circle */}
        <View style={styles.brandingSpace} />

        {/* FairPrep Heading */}
        <Text style={styles.appName}>FairPrep</Text>

        {/* Mock Notice */}
        <View style={styles.mockNotice}>
          <MaterialIcons name="info-outline" size={20} color={colors.warning} />
          <Text style={styles.mockText}>DEMO MODE - Enter any credentials</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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

          {/* Legal Links */}
          <View style={styles.legalLinks}>
            <Pressable onPress={() => router.push('/privacy')}>
              <Text style={styles.legalText}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.legalSeparator}>•</Text>
            <Pressable onPress={() => router.push('/terms')}>
              <Text style={styles.legalText}>Terms & Conditions</Text>
            </Pressable>
          </View>
          
          <Button
            title={isLoading ? 'Logging in...' : 'Log In'}
            onPress={handleLogin}
            disabled={!email || !password || isLoading}
            fullWidth
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable onPress={() => router.push('/auth/signup')}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text style={styles.footerLink}>Sign Up</Text>
            </Text>
          </Pressable>
        </View>

        {/* Demo Credentials */}
        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Demo Credentials</Text>
          <Text style={styles.demoText}>Email: test@example.com</Text>
          <Text style={styles.demoText}>Password: 123456</Text>
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
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  backgroundImageStyle: {
    opacity: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  brandingSpace: {
    height: 280,
  },
  appName: {
    fontSize: 36,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  mockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  mockText: {
    fontSize: typography.bodySmall,
    color: colors.warning,
    fontWeight: typography.semibold,
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
  demoBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  demoText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  legalText: {
    fontSize: typography.caption,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
});
