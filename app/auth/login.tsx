import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ImageBackground, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { Input, Button } from '@/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const params = useLocalSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  // Show success message if user just verified their email
  useEffect(() => {
    if (params.verified === 'true') {
      Alert.alert(
        'Verified Successfully! ✅',
        'Your email has been verified. Login to start using FairPrep!',
        [{ text: 'OK' }]
      );
    }
  }, [params.verified]);

  function addDebugLog(message: string) {
    setDebugLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }

  async function handleLogin() {
    setDebugLog([]); // Clear previous logs
    addDebugLog('🔵 Login attempt started');
    addDebugLog(`📧 Email: ${email}`);
    addDebugLog(`🔒 Password length: ${password.length} chars`);
    addDebugLog(`🔒 Password: ${password.substring(0, 3)}***`);
    
    if (!email || !password) {
      addDebugLog('❌ Validation failed: Missing email or password');
      alert('Please enter email and password');
      return;
    }
    
    setIsLoading(true);
    addDebugLog('⏳ Calling login function...');
    
    try {
      await login(email, password);
      addDebugLog('✅ Login successful!');
      router.replace('/');
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Login failed';
      
      addDebugLog(`❌ Login failed: ${errorMessage}`);
      addDebugLog(`🔍 Error type: ${error.constructor.name}`);
      addDebugLog(`🔍 Error stack: ${error.stack?.substring(0, 200)}`);
      
      // Check if error is due to unverified email
      if (errorMessage.includes('verify your email')) {
        alert(errorMessage + '\n\nClick OK to go to the verification page.');
        router.push('/verify-email');
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsLoading(false);
      addDebugLog('⏹️ Login attempt completed');
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

          {/* Verify Email Link */}
          <Pressable 
            style={styles.verifyEmailLink} 
            onPress={() => router.push('/verify-email')}
          >
            <MaterialIcons name="verified-user" size={16} color={colors.info} />
            <Text style={styles.verifyEmailText}>Verify Your Email</Text>
          </Pressable>

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

        {/* TEMPORARY DEBUG AREA */}
        {debugLog.length > 0 && (
          <View style={styles.debugArea}>
            <Text style={styles.debugTitle}>🐛 DEBUG LOG (TEMPORARY)</Text>
            <ScrollView style={styles.debugScroll} nestedScrollEnabled>
              {debugLog.map((log, index) => (
                <Text key={index} style={styles.debugText}>
                  {log}
                </Text>
              ))}
            </ScrollView>
            <Pressable 
              style={styles.debugClearButton}
              onPress={() => setDebugLog([])}
            >
              <Text style={styles.debugClearText}>Clear Logs</Text>
            </Pressable>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable onPress={() => router.push('/auth/signup')}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text style={styles.footerLink}>Sign Up</Text>
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

  verifyEmailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.info,
  },
  verifyEmailText: {
    fontSize: typography.bodySmall,
    color: colors.info,
    fontWeight: typography.semibold,
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
  
  // TEMPORARY DEBUG STYLES
  debugArea: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.error,
    maxHeight: 300,
  },
  debugTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  debugScroll: {
    maxHeight: 200,
  },
  debugText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 16,
  },
  debugClearButton: {
    marginTop: spacing.sm,
    padding: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  debugClearText: {
    fontSize: typography.caption,
    color: colors.textPrimary,
    fontWeight: typography.semibold,
  },
});
