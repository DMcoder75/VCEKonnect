import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getUserSubjectIds } from '@/services/userSubjectsService';
import { colors } from '@/constants/theme';
import { VersionCheckModal } from '@/components/feature/VersionCheckModal';
import { useVersionCheck } from '@/hooks/useVersionCheck';

export default function IndexRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [hasCheckedSubjects, setHasCheckedSubjects] = useState(false);
  const { versionStatus, shouldShowModal, dismissUpdate } = useVersionCheck();

  useEffect(() => {
    async function checkUserSubjects() {
      if (!isLoading && user) {
        // Check vk_user_subjects junction table
        const subjectIds = await getUserSubjectIds(user.id);
        
        if (subjectIds.length === 0) {
          router.replace('/onboarding');
        } else {
          router.replace('/(tabs)');
        }
        setHasCheckedSubjects(true);
      } else if (!isLoading && !user) {
        router.replace('/auth/login');
        setHasCheckedSubjects(true);
      }
    }

    checkUserSubjects();
  }, [user, isLoading]);

  // Show version check modal if needed (blocks navigation if update required)
  if (shouldShowModal) {
    return (
      <VersionCheckModal 
        versionStatus={versionStatus} 
        onDismiss={dismissUpdate}
      />
    );
  }

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
