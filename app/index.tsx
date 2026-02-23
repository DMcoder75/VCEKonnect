import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getUserSubjectIds } from '@/services/userSubjectsService';
import { colors, typography } from '@/constants/theme';

export default function IndexRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [hasCheckedSubjects, setHasCheckedSubjects] = useState(false);
  const [debugMessage, setDebugMessage] = useState('Initializing...');

  useEffect(() => {
    async function checkUserSubjects() {
      if (!isLoading && user) {
        setDebugMessage('Checking subjects...');
        // Check vk_user_subjects junction table
        const subjectIds = await getUserSubjectIds(user.id);
        
        if (subjectIds.length === 0) {
          setDebugMessage('Redirecting to onboarding...');
          router.replace('/onboarding');
        } else {
          setDebugMessage('Redirecting to dashboard...');
          router.replace('/(tabs)');
        }
        setHasCheckedSubjects(true);
      } else if (!isLoading && !user) {
        setDebugMessage('Redirecting to login...');
        router.replace('/auth/login');
        setHasCheckedSubjects(true);
      } else {
        setDebugMessage(`Loading... (isLoading: ${isLoading}, user: ${user ? 'yes' : 'no'})`);
      }
    }

    checkUserSubjects();
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.debugText}>{debugMessage}</Text>
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
  debugText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
