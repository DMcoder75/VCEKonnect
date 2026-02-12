import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components';
import { getAllVCESubjects, VCESubject } from '@/services/vceSubjectsService';

export default function SubjectsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  
  const [allSubjects, setAllSubjects] = useState<VCESubject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(user?.selectedSubjects || []);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (user) {
      setSelectedSubjects(user.selectedSubjects || []);
    }
  }, [user]);

  async function loadSubjects() {
    setIsLoading(true);
    const subjects = await getAllVCESubjects();
    setAllSubjects(subjects);
    setIsLoading(false);
  }

  function toggleSubject(subjectId: string) {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
    setHasChanges(true);
  }

  async function handleSave() {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await updateProfile({ selectedSubjects });
      setHasChanges(false);
      router.back();
    } catch (error) {
      console.error('Failed to save subjects:', error);
      alert('Failed to save subjects. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // Filter and group subjects
  const filteredSubjects = allSubjects.filter(subject => {
    const matchesSearch = searchQuery === '' || 
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || subject.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...new Set(allSubjects.map(s => s.category))].sort();

  const subjectsByCategory = filteredSubjects.reduce((acc, subject) => {
    if (!acc[subject.category]) acc[subject.category] = [];
    acc[subject.category].push(subject);
    return acc;
  }, {} as Record<string, VCESubject[]>);

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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading subjects...</Text>
        </View>
      ) : (
        <>
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

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color={colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search subjects..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="close" size={20} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>

            {/* Category Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {categories.map(category => (
                <Pressable
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category && styles.categoryChipSelected,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === category && styles.categoryChipTextSelected,
                  ]}>
                    {category}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

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
                      {subject.scaledMean && (
                        <Text style={styles.subjectStats}>
                          Mean: {subject.scaledMean.toFixed(1)}
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}

            {filteredSubjects.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="search-off" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyStateText}>No subjects found</Text>
              </View>
            )}

            <View style={{ height: spacing.xxl }} />
          </ScrollView>

          {/* Fixed Bottom Button */}
          {hasChanges && (
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
              <Button
                title={isSaving ? 'Saving...' : `Save ${selectedSubjects.length} Subject${selectedSubjects.length !== 1 ? 's' : ''}`}
                onPress={handleSave}
                fullWidth
                disabled={isSaving}
              />
            </View>
          )}
        </>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
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
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  selectedCountText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  categoryScroll: {
    marginBottom: spacing.md,
  },
  categoryScrollContent: {
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  categoryChipTextSelected: {
    color: colors.textPrimary,
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
    paddingRight: spacing.lg,
  },
  subjectNameSelected: {
    color: colors.textPrimary,
  },
  subjectCode: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xxs,
  },
  subjectStats: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyStateText: {
    fontSize: typography.body,
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
