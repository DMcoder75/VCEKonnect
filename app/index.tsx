import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getUserSubjectIds } from '@/services/userSubjectsService';
import { colors } from '@/constants/theme';

export default function IndexRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [hasRouted, setHasRouted] = useState(false);

  useEffect(() => {
    async function checkAuthAndRoute() {
      // Wait for initial auth check to complete
      if (isLoading || hasRouted) return;

      console.log('🔀 IndexRedirect: Checking auth state...');
      console.log('🔀 IndexRedirect: User:', user ? `ID: ${user.id}` : 'None');
      
      if (!user) {
        console.log('🔀 IndexRedirect: No user -> Login');
        router.replace('/auth/login');
        setHasRouted(true);
        return;
      }

      // Check if user has completed onboarding (has selected subjects)
      try {
        const subjectIds = await getUserSubjectIds(user.id);
        console.log('🔀 IndexRedirect: User has', subjectIds.length, 'subjects');
        
        if (subjectIds.length === 0) {
          console.log('🔀 IndexRedirect: No subjects -> Onboarding');
          router.replace('/onboarding');
        } else {
          console.log('🔀 IndexRedirect: Has subjects -> Dashboard');
          router.replace('/(tabs)');
        }
        setHasRouted(true);
      } catch (error) {
        console.error('❌ IndexRedirect: Error checking subjects:', error);
        // On error, assume onboarding needed
        router.replace('/onboarding');
        setHasRouted(true);
      }
    }

    checkAuthAndRoute();
  }, [user, isLoading, hasRouted]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
