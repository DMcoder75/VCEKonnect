import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { AuthProvider } from '@/contexts/AuthContext';
import { StudyTimerProvider } from '@/contexts/StudyTimerContext';
import { CustomAlertProvider } from '@/contexts/CustomAlertContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AlertProvider>
      <CustomAlertProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <StudyTimerProvider>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#0a0a0a' },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="auth/login" />
                <Stack.Screen name="verify-email" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="subjects" />
                <Stack.Screen name="faq" />
                <Stack.Screen name="add-event" />
                <Stack.Screen name="edit-event" />
                <Stack.Screen name="analytics" />
                <Stack.Screen name="export-data" />
                <Stack.Screen name="ai-study-plan" />
                <Stack.Screen name="ai-recommendations" />
                <Stack.Screen name="ai-questions" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="premium"
                  options={{
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen
                  name="stripe-checkout-modal"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                  }}
                />
              </Stack>
            </StudyTimerProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </CustomAlertProvider>
    </AlertProvider>
  );
}
