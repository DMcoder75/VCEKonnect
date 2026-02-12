import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { VCE_SUBJECTS } from '@/constants/vceData';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components';

export default function SubjectsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(user?.selectedSubjects || []);
  const [hasChanges, setHasChanges] = useState(false);

  function toggleSubject(subjectId: string) {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
    setHasChanges(true);
  }

  async function handleSave() {
    await updateProfile({
      selectedSubjects,
    });
    setHasChanges(false);
    router.back();
  }

  const subjectsByCategory = VCE_SUBJECTS.reduce((acc, subject) => {
    if (!acc[subject.category]) acc[subject.category] = [];
    acc[subject.category].push(subject);
    return acc;
  }, {} as Record<string, typeof VCE_SUBJECTS>);

  if (!user) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>My VCE Subjects</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Select Your Subjects</Text>
            <Text style={styles.infoDesc}>
              Choose all VCE subjects you're currently studying. This helps us track your ATAR prediction and study progress.
            </Text>
          </View>
        </View>

        <View style={styles.selectedCount}>
          <Text style={styles.selectedCountText}>
            {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
          </Text>
        </View>

        {/* Subjects by Category */}
        {Object.entries(subjectsByCategory).map(([category, subjects]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={styles.subjectGrid}>
              {subjects.map(subject => (
                <Pressable
                  key={subject.id}
                  style={[
                    styles.subjectCard,
                    selectedSubjects.includes(subject.id) && styles.subjectCardSelected,
                  ]}
                  onPress={() => toggleSubject(subject.id)}
                >
                  {selectedSubjects.includes(subject.id) && (
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={colors.success}
                      style={styles.checkIcon}
                    />
                  )}
                  <Text style={[
                    styles.subjectName,
                    selectedSubjects.includes(subject.id) && styles.subjectNameSelected,
                  ]} numberOfLines={2}>
                    {subject.name}
                  </Text>
                  <Text style={styles.subjectCode}>{subject.code}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      {hasChanges && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            title={`Save ${selectedSubjects.length} Subject${selectedSubjects.length !== 1 ? 's' : ''}`}
            onPress={handleSave}
            fullWidth
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  infoTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  selectedCount: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  selectedCountText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  subjectCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minWidth: '30%',
    maxWidth: '31%',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  subjectCardSelected: {
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  checkIcon: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  subjectName: {
    fontSize: typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: typography.medium,
    marginBottom: spacing.xs,
  },
  subjectNameSelected: {
    color: colors.textPrimary,
  },
  subjectCode: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    paddingTop: spacing.md,
  },
});
