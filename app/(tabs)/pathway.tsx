
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useATAR } from '@/hooks/useATAR';
import { useAlert } from '@/template';
import { 
  getPathwaySuggestions, 
  getBackupCareerSuggestions, 
  getAllCareerPaths,
  CareerPath 
} from '@/services/pathwayService';
import { PathwayCourseCard } from '@/components/feature';

export default function PathwayScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateProfile, isLoading: authLoading } = useAuth();
  const { getPrediction } = useATAR();
  const { showAlert } = useAlert();
  const [isSelectingCareer, setIsSelectingCareer] = useState(false);
  const [selectedCareer, setSelectedCareer] = useState(user?.targetCareer || '');
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
  const [pathway, setPathway] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(true);

  function addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  }
  
  const prediction = getPrediction();
  const targetCareer = (selectedCareer || user?.targetCareer || 'medicine').toLowerCase();
  const career = careerPaths.find(c => c.id === targetCareer);

  // Sync selectedCareer with user's saved targetCareer when user data loads
  useEffect(() => {
    if (user?.targetCareer) {
      setSelectedCareer(user.targetCareer);
    }
  }, [user?.targetCareer]);

  // Load data from external Supabase on mount and focus
  useFocusEffect(
    React.useCallback(() => {
      loadPathwayData();
    }, [targetCareer, prediction.atar])
  );

  async function loadPathwayData() {
    setIsLoading(true);
    addLog('🔄 Loading pathway data...');
    addLog(`🎯 Target career: ${targetCareer}`);
    addLog(`📊 User saved career: ${user?.targetCareer || 'none'}`);
    
    // Fetch all career paths from external Supabase
    const careers = await getAllCareerPaths();
    setCareerPaths(careers);
    addLog(`📚 Loaded ${careers.length} career paths from DB`);

    // Fetch pathway suggestions from external Supabase
    const pathwayData = await getPathwaySuggestions(targetCareer, prediction.atar);
    setPathway(pathwayData);
    addLog(`🎓 Loaded pathway courses from DB`);

    // Fetch backup career suggestions from external Supabase
    const backupData = await getBackupCareerSuggestions(prediction.atar, [targetCareer]);
    setBackups(backupData);
    addLog(`🔍 Loaded ${backupData.length} backup careers`);

    setIsLoading(false);
  }

  function handleSelectCareer(careerId: string) {
    setSelectedCareer(careerId);
  }

  async function handleSaveCareer() {
    if (!user || !selectedCareer) {
      addLog('❌ Save failed: No user or no career selected');
      return;
    }
    
    try {
      addLog(`📝 Attempting to save career: ${selectedCareer}`);
      addLog(`👤 User ID: ${user.id}`);
      addLog(`📧 User email: ${user.email}`);
      addLog(`💾 Saving to external Supabase: https://xududbaqaaffcaejwuix.supabase.co`);
      addLog(`📦 Update payload: { targetCareer: "${selectedCareer.toLowerCase()}" }`);
      
      const result = await updateProfile({ targetCareer: selectedCareer.toLowerCase() });
      
      addLog('✅ Career saved successfully to database');
      addLog(`✅ Update completed, reloading user data...`);
      addLog(`🔄 User data reloaded from DB`);
      addLog(`📊 Updated career value: ${user?.targetCareer || 'null'}`);
      
      // Manually reload pathway data with new career
      await loadPathwayData();
      
      showAlert('Success', 'Dream career saved successfully!');
      setIsSelectingCareer(false);
    } catch (error: any) {
      addLog(`❌ Save error: ${error.message || error}`);
      showAlert('Error', error.message || 'Failed to save career. Please try again.');
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerPlaceholder} />
          <Text style={styles.title}>Uni Pathway</Text>
          <Pressable
            style={styles.settingsButton}
            onPress={() => setIsSelectingCareer(!isSelectingCareer)}
          >
            <MaterialIcons name="settings" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Career Selection */}
        {isSelectingCareer ? (
          <View style={styles.selectionContainer}>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>Select Your Dream Career</Text>
              <Pressable onPress={() => setIsSelectingCareer(false)}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                {careerPaths.map(careerOption => (
                  <Pressable
                    key={careerOption.id}
                    style={[
                      styles.careerOption,
                      selectedCareer === careerOption.id && styles.careerOptionActive,
                    ]}
                    onPress={() => handleSelectCareer(careerOption.id)}
                  >
                    <View style={styles.careerOptionContent}>
                      <Text style={[
                        styles.careerOptionName,
                        selectedCareer === careerOption.id && styles.careerOptionNameActive,
                      ]}>
                        {careerOption.name}
                      </Text>
                      <Text style={styles.careerOptionDesc}>{careerOption.description}</Text>
                      <Text style={styles.careerOptionAtar}>
                        Typical ATAR: {careerOption.typical_atar}
                      </Text>
                    </View>
                    {selectedCareer === careerOption.id && (
                      <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
                {/* Info */}
                <View style={styles.infoCard}>
                  <MaterialIcons name="info-outline" size={20} color={colors.primary} />
                  <Text style={styles.infoText}>
                    ATAR cutoffs change yearly based on demand. 
                    Check VTAC for the latest official requirements.
                  </Text>
                </View>

                {/* Save Button */}
                <Pressable
                  style={[
                    styles.saveButton,
                    !selectedCareer && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSaveCareer}
                  disabled={!selectedCareer}
                >
                  <Text style={styles.saveButtonText}>Save Dream Career</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : (authLoading || isLoading) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              {authLoading ? 'Loading your profile...' : 'Loading your pathway...'}
            </Text>
          </View>
        ) : (
          <>
            {/* Career Target */}
            <View style={styles.careerCard}>
              <Text style={styles.careerLabel}>Your Dream Career</Text>
              <Text style={styles.careerName}>{career?.name || 'Not Set'}</Text>
              <Text style={styles.careerDesc}>{career?.description || ''}</Text>
              <View style={styles.atarRequirement}>
                <Text style={styles.atarLabel}>Typical ATAR Required:</Text>
                <Text style={[
                  styles.atarValue,
                  prediction.atar >= (career?.typical_atar || 0) ? { color: colors.success } : { color: colors.warning }
                ]}>
                  {career?.typical_atar?.toFixed(0) || '--'}
                </Text>
              </View>
            </View>

            {/* Pathway Courses */}
            {pathway && (
              <>
                <Text style={styles.sectionTitle}>Available Pathways</Text>
                <Text style={styles.sectionDesc}>
                  Based on your predicted ATAR: {prediction.atar.toFixed(2)}
                </Text>

                {pathway.courses.map(course => (
                  <PathwayCourseCard
                    key={course.id}
                    universityName={course.universityName}
                    courseName={course.courseName}
                    atar={course.atar}
                    isEligible={course.isEligible}
                    prerequisites={course.prerequisites}
                    pathway={course.pathway}
                  />
                ))}
              </>
            )}

            {/* Backup Careers */}
            {backups.length > 0 && prediction.atar < (career?.typical_atar || 0) && (
              <>
                <Text style={styles.sectionTitle}>Alternative Careers</Text>
                <Text style={styles.sectionDesc}>
                  Consider these careers within your ATAR range
                </Text>

                {backups.map(backup => (
                  <View key={backup.id} style={styles.backupCard}>
                    <Text style={styles.backupName}>{backup.name}</Text>
                    <Text style={styles.backupDesc}>{backup.description}</Text>
                    <Text style={styles.backupAtar}>
                      Typical ATAR: {backup.typical_atar}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Info */}
            <View style={styles.infoCard}>
              <MaterialIcons name="info-outline" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                ATAR cutoffs change yearly based on demand. 
                Check VTAC for the latest official requirements.
              </Text>
            </View>

            {/* Debug Logs */}
            <View style={styles.debugSection}>
              <Pressable
                style={styles.debugHeader}
                onPress={() => setShowDebug(!showDebug)}
              >
                <Text style={styles.debugTitle}>🔧 Debug Logs</Text>
                <MaterialIcons
                  name={showDebug ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={colors.textSecondary}
                />
              </Pressable>
              {showDebug && (
                <View style={styles.debugContent}>
                  <View style={styles.debugInfo}>
                    <Text style={styles.debugLabel}>User ID:</Text>
                    <Text style={styles.debugValue}>{user?.id || 'null'}</Text>
                  </View>
                  <View style={styles.debugInfo}>
                    <Text style={styles.debugLabel}>User Email:</Text>
                    <Text style={styles.debugValue}>{user?.email || 'null'}</Text>
                  </View>
                  <View style={styles.debugInfo}>
                    <Text style={styles.debugLabel}>DB Saved Career:</Text>
                    <Text style={styles.debugValue}>{user?.targetCareer || 'null'}</Text>
                  </View>
                  <View style={styles.debugInfo}>
                    <Text style={styles.debugLabel}>Selected Career:</Text>
                    <Text style={styles.debugValue}>{selectedCareer || 'null'}</Text>
                  </View>
                  <View style={styles.debugDivider} />
                  <Text style={styles.debugLogsTitle}>Operation Logs:</Text>
                  {debugLogs.length === 0 ? (
                    <Text style={styles.debugLogEmpty}>No logs yet</Text>
                  ) : (
                    debugLogs.map((log, index) => (
                      <Text key={index} style={styles.debugLog}>
                        {log}
                      </Text>
                    ))
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  headerPlaceholder: {
    width: 40,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionContainer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  careerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  careerOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  careerOptionContent: {
    flex: 1,
  },
  careerOptionName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  careerOptionNameActive: {
    color: colors.primary,
  },
  careerOptionDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  careerOptionAtar: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  careerCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  careerLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  careerName: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  careerDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  atarRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  atarLabel: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  atarValue: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
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
  backupCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backupName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  backupDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  backupAtar: {
    fontSize: typography.caption,
    color: colors.primary,
    marginTop: spacing.sm,
    fontWeight: typography.medium,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  debugSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  debugTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  debugContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  debugInfo: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  debugLabel: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    width: 140,
  },
  debugValue: {
    flex: 1,
    fontSize: typography.bodySmall,
    color: colors.primary,
    fontFamily: 'monospace',
  },
  debugDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  debugLogsTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  debugLog: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  debugLogEmpty: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
});
