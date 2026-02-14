import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  // General
  {
    category: 'General',
    question: 'What is VCE Konnect?',
    answer: 'VCE Konnect is a comprehensive study companion app designed specifically for Victorian Certificate of Education (VCE) students in Years 11-12. It helps you track academic progress, predict ATAR scores, manage study time, take notes, and plan your university pathway—all in one place.',
  },
  {
    category: 'General',
    question: 'How do I get started?',
    answer: 'After signing up, complete the onboarding quiz to select your VCE subjects. Then explore the Dashboard to see your study overview, set study goals, start timers, and track your progress towards your ATAR target.',
  },
  {
    category: 'General',
    question: 'Is my data secure?',
    answer: 'Yes! All your data is securely stored in the cloud and synced across your devices. Your study records, notes, and scores are private and only accessible to you.',
  },

  // Dashboard
  {
    category: 'Dashboard',
    question: 'What does the Dashboard show?',
    answer: 'Your Dashboard displays: Total Study Timer (all-time hours), Upcoming Assessments (SACs and exams), ATAR Prediction (based on your subject scores), Study Goals Progress (weekly/monthly/term rings), and Quick Start Timer for each subject.',
  },
  {
    category: 'Dashboard',
    question: 'Why doesn\'t my Dashboard update automatically?',
    answer: 'The Dashboard refreshes every time you navigate back to it from other tabs. If you\'ve just updated scores, completed a study session, or marked an assessment as complete, simply switch back to the Dashboard tab to see the latest data.',
  },
  {
    category: 'Dashboard',
    question: 'What are the progress rings for?',
    answer: 'The three progress rings show your study goal achievement for the current Week (Monday-Sunday), Month, and Term. They automatically update as you log study time using the study timers. Green = on track, Yellow = needs attention, Red = behind target.',
  },

  // ATAR Predictor
  {
    category: 'ATAR Predictor',
    question: 'How accurate is the ATAR prediction?',
    answer: 'Our ATAR calculator uses the official 2024 VTAC scaling formulas based on historical VCE subject scaling data. While predictions are highly accurate, your actual ATAR depends on your final exam performance and state-wide subject scaling each year.',
  },
  {
    category: 'ATAR Predictor',
    question: 'What scores should I enter?',
    answer: 'Enter your current SAC averages, predicted exam scores, or practice exam results for each subject. You can update these scores anytime as you complete more assessments. The predictor will calculate your aggregate and estimated ATAR based on the best 4 subjects + 10% of the next 2.',
  },
  {
    category: 'ATAR Predictor',
    question: 'Can I enter scores for English/EAL?',
    answer: 'Yes! The app automatically recognizes both English (EN) and English as an Additional Language (EAL) and applies the correct scaling. English/EAL is mandatory and always included in your aggregate calculation.',
  },
  {
    category: 'ATAR Predictor',
    question: 'Why is my ATAR showing 0.0?',
    answer: 'You need to enter scores for at least 4 subjects (including English or EAL) to calculate an ATAR. The predictor requires a minimum viable study score set to generate a prediction.',
  },

  // Study Timer
  {
    category: 'Study Timer',
    question: 'How do study timers work?',
    answer: 'Start a timer for any subject you\'re studying. The app tracks your study time per subject and updates your total study hours, subject breakdowns, and goal progress automatically. You can run multiple timers simultaneously for subjects you\'re studying in parallel.',
  },
  {
    category: 'Study Timer',
    question: 'Can I run multiple timers at once?',
    answer: 'Yes! You can run parallel timers for different subjects if you\'re studying multiple topics simultaneously (e.g., reviewing notes while listening to a lecture). Each timer tracks independently.',
  },
  {
    category: 'Study Timer',
    question: 'Where is my study time saved?',
    answer: 'All study sessions are saved to the database and count towards your study goals (weekly/monthly/term). You can view your total study time on the Dashboard and detailed breakdowns per subject on the Study page.',
  },
  {
    category: 'Study Timer',
    question: 'What if I forget to stop a timer?',
    answer: 'You can manually stop any running timer at any time. The recorded study session will reflect the actual elapsed time. For accuracy, remember to stop timers when you take breaks or finish studying.',
  },

  // Study Goals
  {
    category: 'Study Goals',
    question: 'How do I set study goals?',
    answer: 'Tap "Set Study Goals" on the Dashboard or navigate to the Goals screen. Enter your target hours for each subject across three timeframes: Weekly (Mon-Sun), Monthly (calendar month), and Term (Feb-Jun 2026). The app will track your progress automatically as you use study timers.',
  },
  {
    category: 'Study Goals',
    question: 'What does "Even Split" mean?',
    answer: 'The "Even Split" button automatically divides your total hours equally among all your subjects. For example, if you have 6 subjects and want to study 24 hours per week, clicking "Even Split" will set each subject to 4 hours (24 ÷ 6 = 4). This gives you a balanced baseline that you can customize for subjects needing more/less attention.',
  },
  {
    category: 'Study Goals',
    question: 'What does "Weekly × 4.3 → Monthly" mean?',
    answer: 'This quick action multiplies your weekly hours by 4.3 to auto-fill monthly hours. Why 4.3? Most months have approximately 4.3 weeks (30 days ÷ 7 days = 4.28 weeks). This ensures your monthly goals are realistic and consistent with your weekly targets. Example: If Biology has 5 weekly hours, the button sets it to 21.5 monthly hours (5 × 4.3).',
  },
  {
    category: 'Study Goals',
    question: 'How do I use the quick action buttons effectively?',
    answer: 'Strategy: (1) Click "Even Split" to distribute hours equally across subjects, (2) Manually adjust subjects that need more/less time based on difficulty or upcoming SACs, (3) Click "Weekly × 4.3 → Monthly" to sync monthly goals with your adjusted weekly plan. This saves you from calculating monthly targets manually!',
  },
  {
    category: 'Study Goals',
    question: 'Why do my totals not match my subject hours?',
    answer: 'When you first set goals, the app calculates totals by adding up all subject hours. If you manually change the total hours field, it won\'t automatically redistribute to subjects—you need to use "Even Split" or manually adjust each subject. The totals are independent input fields for flexibility.',
  },
  {
    category: 'Study Goals',
    question: 'How often should I update my goals?',
    answer: 'Set goals at the start of each week, month, or term. Review and adjust them if you fall behind or ahead of schedule. During SAC-heavy periods, you might increase hours for specific subjects. The app shows your actual progress, so you can adapt goals to stay on track.',
  },
  {
    category: 'Study Goals',
    question: 'What happens if I don\'t meet my goals?',
    answer: 'Study goals are targets to help you stay accountable, not strict deadlines. The progress rings show if you\'re on track (green), slightly behind (yellow), or need to catch up (red). Use this feedback to adjust your study schedule for the next period.',
  },

  // Calendar (SAC/Exam)
  {
    category: 'Calendar',
    question: 'How do I add a SAC or exam?',
    answer: 'Tap the "+" button on the Calendar tab. Select the subject, event type (SAC or Exam), date, and title. Optionally add notes and duration. Events are automatically numbered (e.g., "SAC #1", "SAC #2") per subject for easy tracking.',
  },
  {
    category: 'Calendar',
    question: 'Can I edit or delete events?',
    answer: 'Yes! Tap any event to view details. You can edit all fields (date, title, notes) or delete the event if it\'s incomplete. Once an event is marked as complete with a score, deletion is disabled to preserve your academic record.',
  },
  {
    category: 'Calendar',
    question: 'How do I record my SAC/exam scores?',
    answer: 'When you complete an assessment, tap the event and mark it as "Complete". Enter your achieved score and total possible score (e.g., 45/50). The app calculates the percentage automatically and uses this data for ATAR predictions and subject tracking.',
  },
  {
    category: 'Calendar',
    question: 'What are the different calendar views?',
    answer: 'List View: Shows all upcoming events chronologically. Week View: Displays 7 days at a time with grouped events per day. Month View: Traditional calendar grid with colored indicators for events. Use the "Today" button to quickly jump back to the current week.',
  },
  {
    category: 'Calendar',
    question: 'Why can\'t I see completed events in "Upcoming Assessments"?',
    answer: 'The Dashboard only shows incomplete (upcoming) assessments to keep the focus on what\'s ahead. Completed events are still visible in the full Calendar view, where you can review all your past SACs and exams.',
  },

  // Notes
  {
    category: 'Notes',
    question: 'How do I organize my notes?',
    answer: 'Create notes for each subject with titles and content. Add tags (e.g., "chapter 3", "formulas", "revision") to categorize topics. Use the search function to quickly find notes by title, content, or tags.',
  },
  {
    category: 'Notes',
    question: 'Can I attach files or images to notes?',
    answer: 'Currently, notes support rich text content. You can type detailed study notes, formulas, and key points. File attachments will be available in a future update.',
  },

  // Pathway
  {
    category: 'Pathway',
    question: 'What is the Pathway feature?',
    answer: 'The Pathway planner helps you explore university courses and career options based on your VCE subjects and ATAR target. Browse courses, check prerequisites, and save your preferred universities and degrees for future reference.',
  },
  {
    category: 'Pathway',
    question: 'How do I find courses that match my subjects?',
    answer: 'The app can filter university courses based on your selected VCE subjects and predicted ATAR. This helps you discover which degrees you\'re eligible for and what ATAR scores you need to aim for.',
  },

  // Premium
  {
    category: 'Premium',
    question: 'What features are included in Premium?',
    answer: 'Premium unlocks: Advanced ATAR analytics and trends, Detailed study reports (exportable PDFs), Goal history and performance insights, Priority support, and Ad-free experience. Premium costs $20 AUD for 6 months.',
  },
  {
    category: 'Premium',
    question: 'Can I try Premium before subscribing?',
    answer: 'The app offers full functionality in the free tier for core features like timers, goals, calendar, and ATAR prediction. Premium adds advanced analytics and reporting features. You can upgrade anytime from the Premium page.',
  },

  // Troubleshooting
  {
    category: 'Troubleshooting',
    question: 'My data isn\'t syncing. What should I do?',
    answer: 'Check your internet connection. The app requires an active connection to sync data to the cloud. If issues persist, try logging out and back in to refresh your session.',
  },
  {
    category: 'Troubleshooting',
    question: 'I can\'t find the Goals feature. Where is it?',
    answer: 'On the Dashboard, look for the "Set Study Goals" card (shown when you have no active goals) or "Study Goals Progress" card (when goals exist). Tap either card to open the Goals screen where you can set or edit your targets.',
  },
  {
    category: 'Troubleshooting',
    question: 'The app is slow or freezing. Help!',
    answer: 'Try closing and reopening the app. Clear any running timers that aren\'t needed. If problems continue, check for app updates in your app store. Contact support at contact@vcekonnect.com.au if issues persist.',
  },
];

const CATEGORIES = [
  'All',
  'General',
  'Dashboard',
  'ATAR Predictor',
  'Study Timer',
  'Study Goals',
  'Calendar',
  'Notes',
  'Pathway',
  'Premium',
  'Troubleshooting',
];

export default function FAQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filteredFAQs = FAQ_DATA.filter(faq => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  function toggleExpand(index: number) {
    setExpandedIndex(expandedIndex === index ? null : index);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search questions..."
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
      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          {CATEGORIES.map(category => (
            <Pressable
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* FAQ List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredFAQs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>
              Try a different search term or category
            </Text>
          </View>
        ) : (
          filteredFAQs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <Pressable
                key={index}
                style={styles.faqCard}
                onPress={() => toggleExpand(index)}
              >
                <View style={styles.faqHeader}>
                  <View style={styles.faqHeaderLeft}>
                    <Text style={styles.categoryBadge}>{faq.category}</Text>
                    <Text style={styles.question}>{faq.question}</Text>
                  </View>
                  <MaterialIcons
                    name={isExpanded ? 'expand-less' : 'expand-more'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </View>
                {isExpanded && (
                  <Text style={styles.answer}>{faq.answer}</Text>
                )}
              </Pressable>
            );
          })
        )}

        {/* Contact Support */}
        <View style={styles.supportCard}>
          <MaterialIcons name="support-agent" size={32} color={colors.primary} />
          <Text style={styles.supportTitle}>Still need help?</Text>
          <Text style={styles.supportText}>
            Contact our support team at{' '}
            <Text style={styles.supportEmail}>support@vcekonnect.com.au</Text>
          </Text>
        </View>
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
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  categoryWrapper: {
    height: 44,
    marginBottom: spacing.xs,
  },
  categoryContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    gap: spacing.sm,
    alignItems: 'center',
  },
  categoryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  faqCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  faqHeaderLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  categoryBadge: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.primary,
    alignSelf: 'flex-start',
  },
  question: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  answer: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  supportCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  supportTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  supportText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  supportEmail: {
    color: colors.primary,
    fontWeight: typography.semibold,
  },
});
