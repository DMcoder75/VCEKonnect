import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { AuthProvider } from '@/contexts/AuthContext';
import { StudyTimerProvider } from '@/contexts/StudyTimerContext';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/useAuth';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait for navigation to be ready and auth to load
    if (!navigationState?.key || isLoading) return;

    const currentRoute = segments.join('/');
    
    // Define public routes (accessible without authentication)
    const publicRoutes = ['auth/login', 'auth/signup', 'verify-email', 'privacy', 'terms', 'faq'];
    const isPublicRoute = publicRoutes.includes(currentRoute) || segments[0] === 'auth';
    
    // Define protected routes that require authentication
    const protectedRoutes = ['onboarding', 'settings', 'subjects', 'analytics', 'export-data', 
                            'ai-study-plan', 'ai-recommendations', 'ai-questions', 'premium',
                            'add-event', 'edit-event', 'goals', 'goals-progress', 'achievements',
                            '(tabs)'];
    const isProtectedRoute = protectedRoutes.some(route => currentRoute.includes(route)) || 
                            segments[0] === '(tabs)' || 
                            currentRoute === ''; // index is protected

    // CRITICAL: Enforce authentication for protected routes
    if (!user && !isPublicRoute) {
      console.log('🚨 NAVIGATION GUARD: Blocking unauthorized access');
      console.log('   Route attempted:', currentRoute);
      console.log('   User status:', user ? 'Authenticated' : 'Not authenticated');
      console.log('   Redirecting to: /auth/login');
      
      // Prevent navigation to protected route
      router.replace('/auth/login');
    }
  }, [user, isLoading, segments, navigationState?.key, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationGuard>
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
              </Stack>
            </StudyTimerProvider>
          </NavigationGuard>
        </AuthProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
