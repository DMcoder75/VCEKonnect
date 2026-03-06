import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { Input, Button } from '@/components/ui';


export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  
  // DEBUG LOG STATE (TEMPORARY)
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev, logMessage]);
    console.log(logMessage); // Also log to console
  };

  async function handleSignup() {
    // Clear previous logs
    setDebugLogs([]);
    addDebugLog('🚀 SIGNUP STARTED');
    
    if (!name || !email || !password || !confirmPassword) {
      addDebugLog('❌ VALIDATION FAILED: Missing fields');
      alert('Please fill in all fields');
      return;
    }
    addDebugLog('✅ All fields provided');
    
    if (password !== confirmPassword) {
      addDebugLog('❌ VALIDATION FAILED: Passwords do not match');
      alert('Passwords do not match');
      return;
    }
    addDebugLog('✅ Passwords match');

    if (password.length < 6) {
      addDebugLog('❌ VALIDATION FAILED: Password too short');
      alert('Password must be at least 6 characters');
      return;
    }
    addDebugLog(`✅ Password length valid (${password.length} chars)`);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      addDebugLog('❌ VALIDATION FAILED: Invalid email format');
      alert('Please enter a valid email address');
      return;
    }
    addDebugLog('✅ Email format valid');
    
    setIsLoading(true);
    addDebugLog(`📧 Email: ${email}`);
    addDebugLog(`👤 Name: ${name}`);
    addDebugLog(`🔑 Password length: ${password.length}`);
    
    try {
      addDebugLog('🔄 Calling register() function...');
      addDebugLog('🔄 This will call auth-signup Edge Function');
      addDebugLog('🔄 Edge Function should: 1) Create auth.users, 2) Create vk_users, 3) Send email');
      
      // Create user account and send verification email
      // Pass addDebugLog as callback to capture service logs
      await register(email, password, name, addDebugLog);
      
      addDebugLog('✅ Register() completed successfully!');
      addDebugLog('✅ This means: auth.users created + vk_users created + email sent');
      addDebugLog('📨 Check your email for verification code');
      
      alert('Account created! Please check your email for the 7-digit verification code.');
      router.push('/verify-email');
    } catch (error: any) {
      addDebugLog(`❌ REGISTRATION FAILED!`);
      addDebugLog(`❌ ERROR MESSAGE: ${error.message || 'Unknown error'}`);
      
      // Try to parse error details from backend
      if (error.message && error.message.includes('Edge Function failed:')) {
        addDebugLog(`❌ This is an Edge Function error`);
        addDebugLog(`❌ Raw message: ${error.message}`);
      }
      
      // Show detailed error if available
      let alertMessage = error.message || 'Signup failed';
      if (error.details) {
        addDebugLog(`❌ ERROR DETAILS: ${error.details}`);
        alertMessage += `\n\nDetails: ${error.details}`;
      }
      if (error.step) {
        addDebugLog(`❌ FAILED AT STEP: ${error.step}`);
        alertMessage += `\n\nFailed at: ${error.step}`;
      }
      
      alert(alertMessage);
    } finally {
      setIsLoading(false);
      addDebugLog('🏁 Signup process finished');
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

        {/* Form */}
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
            title={isLoading ? 'Creating Account...' : 'Create Account'}
            onPress={handleSignup}
            disabled={!name || !email || !password || !confirmPassword || isLoading}
            fullWidth
          />
        </View>

        {/* DEBUG LOG AREA (TEMPORARY) */}
        {debugLogs.length > 0 && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>🔍 DEBUG LOGS (TEMP)</Text>
            <ScrollView style={styles.debugScroll} nestedScrollEnabled>
              {debugLogs.map((log, index) => (
                <Text key={index} style={styles.debugLog}>
                  {log}
                </Text>
              ))}
            </ScrollView>
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
  // DEBUG STYLES (TEMPORARY)
  debugContainer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#1a1a1a',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 300,
  },
  debugTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: '#00ff00',
    marginBottom: spacing.sm,
  },
  debugScroll: {
    maxHeight: 250,
  },
  debugLog: {
    fontSize: 11,
    color: '#ccc',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
});
