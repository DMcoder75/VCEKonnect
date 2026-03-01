import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getUserSubjectIds } from '@/services/userSubjectsService';
import { colors } from '@/constants/theme';

export default function IndexRedirect() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading } = useAuth();
  const [hasCheckedSubjects, setHasCheckedSubjects] = useState(false);

  useEffect(() => {
    async function checkUserSubjects() {
      if (isLoading) return; // Wait for auth to finish loading

      if (!user) {
        // Not authenticated - redirect to login
        router.replace('/auth/login');
        setHasCheckedSubjects(true);
        return;
      }

      // User is authenticated - check if they need onboarding
      const subjectIds = await getUserSubjectIds(user.id);
      
      if (subjectIds.length === 0) {
        // No subjects selected - send to onboarding
        router.replace('/onboarding');
      } else {
        // Has subjects - send to main app
        router.replace('/(tabs)');
      }
      setHasCheckedSubjects(true);
    }

    checkUserSubjects();
  }, [user, isLoading]);

  // Block rendering until auth check completes
  if (isLoading || !hasCheckedSubjects) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
