import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { CAREER_PATHS } from '@/constants/vceData';
import { VCESubject, AustralianState } from '@/services/vceSubjectsService';
import { getUserSubjectIds, updateUserSubjects } from '@/services/userSubjectsService';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { usePremium } from '@/hooks/usePremium';
import { Button } from '@/components';
import { useAlert } from '@/template';
import { checkConnection } from '@/services/networkService';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile, logout } = useAuth();
  const { permissionGranted, requestPermissions, scheduledCount, scheduleDailyReminder } = useNotifications();
  const { tier, isPremium } = usePremium();
  const { showAlert } = useAlert();
  
  const { userSubjects, allStateSubjects, allStates, refreshSubjects } = useAuth();
  
  // Use cached subjects DIRECTLY - no local state needed!
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [targetCareer, setTargetCareer] = useState<string>(user?.targetCareer || '');
  const [yearLevel, setYearLevel] = useState<11 | 12>(user?.yearLevel || 12);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Initialize selected subjects from cached data
  // Sync whenever userSubjects array reference changes
  useEffect(() => {
    const userSubjectIds = userSubjects.map(s => s.id);
    console.log('🔄 Settings: Syncing selectedSubjects from userSubjects:', userSubjectIds);
    setSelectedSubjects(userSubjectIds);
  }, [userSubjects]);

  // Get current state from cached states - should always exist after onboarding
  const userStateId = user?.state_id || 'vic'; // Fallback only for users created before state field was added
  const userState = allStates.find(s => s.id === userStateId) || null;

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
    
    // Check network connection before saving
    const hasConnection = await checkConnection();
    if (!hasConnection) {
      showAlert('No Internet Connection', 'No Internet connection! Please try after sometime!');
      return;
    }
    
    // Update user subjects in database (soft delete implemented in service)
    await updateUserSubjects(user.id, selectedSubjects);
    
    // Update user profile
    await updateProfile({
      targetCareer,
      yearLevel,
    });
    
    // Refresh cached subjects in AuthContext
    await refreshSubjects();
    
    setHasChanges(false);
    router.back();
  }

  async function handleLogout() {
    await logout();
    router.replace('/auth/login');
  }

  // Filter subjects - uses cached data directly, no delay!
  const filteredSubjects = allStateSubjects.filter(subject => {
    const matchesSearch = searchQuery === '' || 
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || subject.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...new Set(allStateSubjects.map(s => s.category))].sort();

  const subjectsByCategory = filteredSubjects.reduce((acc, subject) => {
    if (!acc[subject.category]) acc[subject.category] = [];
    acc[subject.category].push(subject);
    return acc;
  }, {} as Record<string, VCESubject[]>);

  // Get selected subject details - instant from cache
  const selectedSubjectDetails = allStateSubjects.filter(s => selectedSubjects.includes(s.id));
  
  console.log('📊 Settings Debug:');
  console.log('- User state_id:', userStateId);
  console.log('- Total state subjects available:', allStateSubjects.length);
  console.log('- Selected subject IDs:', selectedSubjects);
  console.log('- Selected subject details found:', selectedSubjectDetails.length);
  console.log('- Sample state subjects:', allStateSubjects.slice(0, 3).map(s => ({ id: s.id, name: s.name, state: s.stateId })));

  if (!user) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subscription Status - Highlighted */}
        <View style={[
          styles.subscriptionCard,
          tier === 'pro' && styles.subscriptionCardPro,
          tier === 'basic' && styles.subscriptionCardBasic,
        ]}>
          <View style={styles.subscriptionLeft}>
            <MaterialIcons 
              name={tier === 'free' ? 'info-outline' : 'workspace-premium'} 
              size={32} 
              color={tier === 'free' ? colors.textSecondary : tier === 'basic' ? colors.primary : colors.premium} 
            />
            <View style={{ flex: 1 }}>
              <Text style={[
                styles.subscriptionTitle,
                tier !== 'free' && styles.subscriptionTitleActive,
              ]}>
                {tier === 'pro' ? 'Pro Plan Active' : tier === 'basic' ? 'Basic Plan Active' : 'Free Plan'}
              </Text>
              <Text style={styles.subscriptionDesc}>
                {tier === 'pro' ? 'Unlimited AI features, advanced analytics' : tier === 'basic' ? 'Premium features, limited AI usage' : 'Limited features, upgrade to unlock more'}
              </Text>
            </View>
          </View>
          {tier === 'free' && (
            <Pressable
              style={styles.upgradeButton}
              onPress={() => router.push('/premium')}
            >
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </Pressable>
          )}
        </View>

        {/* State Section - Read Only Display */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My State</Text>
          {userState && (
            <View style={styles.currentStateCard}>
              <View style={styles.stateDisplayContent}>
                <Text style={styles.stateDisplayAbbr}>{userState.abbreviation}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stateDisplayName}>{userState.name}</Text>
                  <Text style={styles.stateDisplaySystem}>{userState.educationSystem}</Text>
                </View>
              </View>
              <MaterialIcons name="location-on" size={24} color={colors.primary} />
            </View>
          )}
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Name</Text>
              <Text style={styles.profileValue}>{user.name}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Email</Text>
              <Text style={styles.profileValue}>{user.email}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Year Level</Text>
              <View style={styles.yearSelector}>
                <Pressable
                  style={[styles.yearButton, yearLevel === 11 && styles.yearButtonSelected]}
                  onPress={() => { setYearLevel(11); setHasChanges(true); }}
                >
                  <Text style={[styles.yearButtonText, yearLevel === 11 && styles.yearButtonTextSelected]}>
                    11
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.yearButton, yearLevel === 12 && styles.yearButtonSelected]}
                  onPress={() => { setYearLevel(12); setHasChanges(true); }}
                >
                  <Text style={[styles.yearButtonText, yearLevel === 12 && styles.yearButtonTextSelected]}>
                    12
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Subjects Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Subjects</Text>
          <Text style={styles.sectionDesc}>
            {userState ? `Manage your ${userState.educationSystem} subjects` : 'Loading subjects...'}
          </Text>

          {/* Selected Subjects Display */}
          {selectedSubjects.length > 0 && (
            <View style={styles.selectedSection}>
              <Text style={styles.selectedSectionTitle}>
                Selected Subjects ({selectedSubjects.length})
              </Text>
              <View style={styles.selectedCardsContainer}>
                {selectedSubjectDetails.map(subject => (
                  <View key={subject.id} style={styles.selectedCard}>
                    <Pressable
                      style={styles.removeButton}
                      onPress={() => toggleSubject(subject.id)}
                    >
                      <MaterialIcons name="close" size={14} color={colors.error} />
                    </Pressable>
                    <Text style={styles.selectedCardCode}>{subject.code}</Text>
                    <Text style={styles.selectedCardName} numberOfLines={2}>
                      {subject.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

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
          
          {/* Subject Grid */}
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
        </View>

        {/* Career Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target Career</Text>
          <Text style={styles.sectionDesc}>Your dream career path</Text>
          
          {CAREER_PATHS.map(career => (
            <Pressable
              key={career.id}
              style={[
                styles.careerCard,
                targetCareer === career.id && styles.careerCardSelected,
              ]}
              onPress={() => { setTargetCareer(career.id); setHasChanges(true); }}
            >
              <View style={styles.careerHeader}>
                <View style={styles.careerTitleContainer}>
                  <Text style={[
                    styles.careerName,
                    targetCareer === career.id && styles.careerNameSelected,
                  ]}>
                    {career.name}
                  </Text>
                  <Text style={styles.careerCategory}>{career.category}</Text>
                </View>
                {targetCareer === career.id && (
                  <MaterialIcons name="check-circle" size={24} color={colors.success} />
                )}
              </View>
              <Text style={styles.careerDesc} numberOfLines={2}>{career.description}</Text>
              <Text style={styles.careerAtar}>Typical ATAR: {career.typicalATAR}+</Text>
            </Pressable>
          ))}
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          {/* Permission Status */}
          <View style={styles.notificationCard}>
            <View style={styles.notificationRow}>
              <View style={styles.notificationLeft}>
                <MaterialIcons 
                  name={permissionGranted ? 'notifications-active' : 'notifications-off'} 
                  size={24} 
                  color={permissionGranted ? colors.success : colors.textTertiary} 
                />
                <View>
                  <Text style={styles.notificationTitle}>
                    {permissionGranted ? 'Notifications Enabled' : 'Notifications Disabled'}
                  </Text>
                  <Text style={styles.notificationDesc}>
                    {permissionGranted 
                      ? `${scheduledCount} reminder${scheduledCount !== 1 ? 's' : ''} scheduled`
                      : 'Enable to get study reminders'}
                  </Text>
                </View>
              </View>
              {!permissionGranted && (
                <Pressable
                  style={styles.enableButton}
                  onPress={requestPermissions}
                >
                  <Text style={styles.enableButtonText}>Enable</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Daily Reminder */}
          {permissionGranted && (
            <Pressable
              style={[styles.appOptionCard, { marginTop: spacing.sm }]}
              onPress={async () => {
                const id = await scheduleDailyReminder(18, 0);
                if (id) {
                  Alert.alert('Daily Reminder Set', 'You\'ll get a reminder at 6:00 PM every day');
                }
              }}
            >
              <View style={styles.appOptionLeft}>
                <MaterialIcons name="alarm" size={24} color={colors.primary} />
                <View>
                  <Text style={styles.appOptionTitle}>Set Daily Reminder</Text>
                  <Text style={styles.appOptionDesc}>Get reminded to study at 6:00 PM</Text>
                </View>
              </View>
              <MaterialIcons name="add" size={24} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        {/* App Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          
          {/* Help & FAQ */}
          <Pressable
            style={styles.appOptionCard}
            onPress={() => router.push('/faq')}
          >
            <View style={styles.appOptionLeft}>
              <MaterialIcons name="help-outline" size={24} color={colors.primary} />
              <View>
                <Text style={styles.appOptionTitle}>Help & FAQ</Text>
                <Text style={styles.appOptionDesc}>Get answers to common questions</Text>
              </View>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color={colors.textTertiary} />
          </Pressable>

          {/* Study Analytics */}
          <Pressable
            style={[styles.appOptionCard, { marginTop: spacing.sm }]}
            onPress={() => router.push('/analytics')}
          >
            <View style={styles.appOptionLeft}>
              <MaterialIcons name="bar-chart" size={24} color={colors.success} />
              <View>
                <Text style={styles.appOptionTitle}>Study Analytics</Text>
                <Text style={styles.appOptionDesc}>View your study insights and heatmap</Text>
              </View>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color={colors.textTertiary} />
          </Pressable>

          {/* Export Data */}
          <Pressable
            style={[styles.appOptionCard, { marginTop: spacing.sm }]}
            onPress={() => router.push('/export-data')}
          >
            <View style={styles.appOptionLeft}>
              <MaterialIcons name="file-download" size={24} color={colors.warning} />
              <View>
                <Text style={styles.appOptionTitle}>Export Data</Text>
                <Text style={styles.appOptionDesc}>Backup your data in JSON or CSV format</Text>
              </View>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color={colors.textTertiary} />
          </Pressable>
        </View>

        {/* Premium Status */}
        {!user.isPremium && (
          <Pressable
            style={styles.premiumBanner}
            onPress={() => router.push('/premium')}
          >
            <MaterialIcons name="star" size={32} color={colors.premium} />
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
              <Text style={styles.premiumDesc}>Unlock advanced features, unlimited notes, and more</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color={colors.premium} />
          </Pressable>
        )}

        {/* Save/Logout Buttons */}
        <View style={styles.actions}>
          {hasChanges && (
            <Button
              title="Save Changes"
              onPress={handleSave}
              fullWidth
            />
          )}
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            fullWidth
          />
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
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
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  profileCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileLabel: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  profileValue: {
    fontSize: typography.body,
    color: colors.textPrimary,
    fontWeight: typography.medium,
  },
  yearSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  yearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  yearButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearButtonText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  yearButtonTextSelected: {
    color: colors.textPrimary,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  subjectCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    minWidth: '31%',
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
  careerCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  careerCardSelected: {
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  careerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  careerTitleContainer: {
    flex: 1,
  },
  careerName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  careerNameSelected: {
    color: colors.textPrimary,
  },
  careerCategory: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  careerDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  careerAtar: {
    fontSize: typography.caption,
    color: colors.primary,
    fontWeight: typography.medium,
  },
  currentStateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  stateDisplayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  stateDisplayAbbr: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.primary,
    minWidth: 50,
  },
  stateDisplayName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  stateDisplaySystem: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectedSection: {
    marginBottom: spacing.lg,
  },
  selectedSectionTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  selectedCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectedCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingRight: spacing.md,
    position: 'relative',
    minWidth: 100,
    maxWidth: '31%',
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.textPrimary,
    borderRadius: borderRadius.full,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  selectedCardCode: {
    fontSize: typography.caption,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
    marginTop: spacing.xs,
  },
  selectedCardName: {
    fontSize: 11,
    color: colors.textPrimary,
    lineHeight: 14,
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
  notificationCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  notificationTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  notificationDesc: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  enableButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  enableButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.premium,
    marginBottom: spacing.lg,
  },
  premiumTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.premium,
  },
  premiumDesc: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  appOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  appOptionTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  appOptionDesc: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    gap: spacing.md,
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  subscriptionCardBasic: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  subscriptionCardPro: {
    borderColor: colors.premium,
    backgroundColor: `${colors.premium}15`,
  },
  subscriptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textSecondary,
  },
  subscriptionTitleActive: {
    color: colors.textPrimary,
  },
  subscriptionDesc: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  upgradeButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.background,
  },
});
