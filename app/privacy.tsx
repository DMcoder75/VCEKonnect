import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>FairPrep by Dalsi Academy</Text>
        <Text style={styles.subtitle}>Privacy Policy</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Effective Date: February 14, 2026</Text>
          <Text style={styles.infoText}>Company: Dalsi Firm</Text>
          <Text style={styles.infoText}>App: FairPrep by Dalsi Academy</Text>
          <Text style={styles.infoText}>Contact: info@neodalsi.com</Text>
          <Text style={styles.infoText}>ABN: [Insert ABN]</Text>
        </View>

        {/* 1. Introduction */}
        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Dalsi Firm ("we", "us", "our") operates FairPrep by Dalsi Academy ("App", "Services"), a study planning platform for Australian Year 12 students. This Privacy Policy explains how we collect, use, store, share, and protect your information when you use our Services.
        </Text>
        <Text style={styles.paragraph}>
          We are committed to protecting your privacy in accordance with the Australian Privacy Principles (APPs) under the Privacy Act 1988 (Cth).
        </Text>

        {/* 2. Information We Collect */}
        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        
        <Text style={styles.subsectionTitle}>2.1 Personal Information</Text>
        <Text style={styles.paragraph}>
          We collect the following personal information when you use the Services:
        </Text>
        
        <View style={styles.tableContainer}>
          <View style={styles.tableRow}>
            <Text style={styles.tableHeader}>Data Type</Text>
            <Text style={styles.tableHeader}>Required?</Text>
            <Text style={styles.tableHeader}>Purpose</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Email address</Text>
            <Text style={styles.tableCell}>✅ Yes</Text>
            <Text style={styles.tableCell}>Login, notifications</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Full name</Text>
            <Text style={styles.tableCell}>❌ Optional</Text>
            <Text style={styles.tableCell}>Personalization</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Date of birth</Text>
            <Text style={styles.tableCell}>❌ Optional</Text>
            <Text style={styles.tableCell}>Analytics</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>School name</Text>
            <Text style={styles.tableCell}>❌ Optional</Text>
            <Text style={styles.tableCell}>State content</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Phone number</Text>
            <Text style={styles.tableCell}>❌ Optional</Text>
            <Text style={styles.tableCell}>SMS (opt-in)</Text>
          </View>
        </View>

        <Text style={styles.subsectionTitle}>2.2 Study Data (Your Educational Records)</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Study session duration (per subject)</Text>
          <Text style={styles.bullet}>• SAC/practice exam scores (user-entered)</Text>
          <Text style={styles.bullet}>• Assessment calendar events</Text>
          <Text style={styles.bullet}>• Goal targets (weekly/monthly/term)</Text>
          <Text style={styles.bullet}>• ATAR/HSC/QCE/WACE predictions generated</Text>
        </View>
        <Text style={styles.note}>Note: Study data belongs to you. We only store it for App functionality.</Text>

        <Text style={styles.subsectionTitle}>2.3 Technical & Usage Data</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Device type/model (iOS/Android)</Text>
          <Text style={styles.bullet}>• Operating system version</Text>
          <Text style={styles.bullet}>• IP address (anonymized for location)</Text>
          <Text style={styles.bullet}>• App version</Text>
          <Text style={styles.bullet}>• Crash reports</Text>
          <Text style={styles.bullet}>• Feature usage patterns (aggregate only)</Text>
        </View>

        {/* 3. How We Collect Information */}
        <Text style={styles.sectionTitle}>3. How We Collect Information</Text>
        
        <Text style={styles.subsectionTitle}>3.1 Direct Collection</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Account registration (email/name)</Text>
          <Text style={styles.bullet}>• Manual data entry (study hours, SAC scores)</Text>
          <Text style={styles.bullet}>• Settings/preferences</Text>
        </View>

        <Text style={styles.subsectionTitle}>3.2 Automatic Collection</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Cookies/session data (App analytics)</Text>
          <Text style={styles.bullet}>• Device information</Text>
          <Text style={styles.bullet}>• Usage patterns (which features used)</Text>
        </View>

        <Text style={styles.subsectionTitle}>3.3 Third Parties</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Stripe (payment processing - PCI compliant)</Text>
          <Text style={styles.bullet}>• Supabase (database - Australian servers)</Text>
          <Text style={styles.bullet}>• Firebase (push notifications - opt-in)</Text>
        </View>

        {/* 4. How We Use Your Information */}
        <Text style={styles.sectionTitle}>4. How We Use Your Information</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• App Functionality: Login, store goals, predictions</Text>
          <Text style={styles.bullet}>• Notifications: Reminders, goal alerts (opt-in)</Text>
          <Text style={styles.bullet}>• Analytics: Usage patterns, crash reporting</Text>
          <Text style={styles.bullet}>• Marketing: Email communications (opt-in only)</Text>
          <Text style={styles.bullet}>• Support: Issue diagnosis and resolution</Text>
        </View>

        {/* 5. Information Sharing */}
        <Text style={styles.sectionTitle}>5. Information Sharing (Strictly Limited)</Text>
        
        <Text style={styles.subsectionTitle}>5.1 We NEVER Sell Your Data</Text>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightText}>❌ NO data sold to marketers</Text>
          <Text style={styles.highlightText}>❌ NO data sold to third parties</Text>
          <Text style={styles.highlightText}>❌ NO data used for advertising</Text>
        </View>

        <Text style={styles.subsectionTitle}>5.2 Service Providers Only (Data Processors)</Text>
        <Text style={styles.paragraph}>
          We share data only with trusted service providers under strict contracts:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Supabase: Database storage (Sydney, AU)</Text>
          <Text style={styles.bullet}>• Stripe: Payments (AU servers, PCI DSS Level 1)</Text>
          <Text style={styles.bullet}>• Firebase: Notifications (Google Cloud AU, opt-in)</Text>
        </View>

        <Text style={styles.subsectionTitle}>5.3 Legal Requirements</Text>
        <Text style={styles.paragraph}>
          Data disclosed only if required by law: court order, subpoena, or law enforcement request.
        </Text>

        {/* 6. Data Storage & Security */}
        <Text style={styles.sectionTitle}>6. Data Storage & Security</Text>
        
        <Text style={styles.subsectionTitle}>6.1 Storage Location</Text>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightText}>✅ 100% AUSTRALIAN SERVERS</Text>
          <Text style={styles.highlightText}>✅ Supabase Sydney region</Text>
          <Text style={styles.highlightText}>✅ No overseas data transfers</Text>
        </View>

        <Text style={styles.subsectionTitle}>6.2 Security Measures</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>🔒 Data encryption (AES-256 at rest)</Text>
          <Text style={styles.bullet}>🔒 TLS 1.3 encryption (in transit)</Text>
          <Text style={styles.bullet}>🔒 Row-Level Security (your data isolated)</Text>
          <Text style={styles.bullet}>🔒 Password hashing (bcrypt)</Text>
          <Text style={styles.bullet}>🔒 Regular security audits</Text>
          <Text style={styles.bullet}>🔒 2FA available (premium)</Text>
        </View>

        <Text style={styles.subsectionTitle}>6.3 Data Retention</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Account active: Indefinite (until deletion)</Text>
          <Text style={styles.bullet}>• Inactive 24 months: Optional deletion notice</Text>
          <Text style={styles.bullet}>• Deleted accounts: Permanent erasure within 30 days</Text>
        </View>

        {/* 7. Your Privacy Rights */}
        <Text style={styles.sectionTitle}>7. Your Privacy Rights (Australian Privacy Principles)</Text>
        <Text style={styles.paragraph}>
          Under APPs, you have these rights:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Access: Email info@neodalsi.com (30 days response)</Text>
          <Text style={styles.bullet}>• Correction: Edit in App settings (instant)</Text>
          <Text style={styles.bullet}>• Deletion: "Delete Account" in settings (30 days)</Text>
          <Text style={styles.bullet}>• Portability: "Export Data" button (CSV download)</Text>
        </View>

        {/* 8. Children's Privacy */}
        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Intended Age: 13 years and older</Text>
          <Text style={styles.bullet}>• Under 18: Parental consent recommended</Text>
          <Text style={styles.bullet}>• No COPPA compliance required (Australian jurisdiction)</Text>
        </View>

        {/* 9. Cookies & Tracking */}
        <Text style={styles.sectionTitle}>9. Cookies & Tracking</Text>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightText}>✅ No third-party cookies</Text>
          <Text style={styles.highlightText}>✅ No advertising trackers</Text>
          <Text style={styles.highlightText}>✅ Minimal first-party analytics only</Text>
          <Text style={styles.highlightText}>✅ Full opt-out available</Text>
        </View>

        {/* 10. Changes to Privacy Policy */}
        <Text style={styles.sectionTitle}>10. Changes to Privacy Policy</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Notice: Posted in-app + email (major changes)</Text>
          <Text style={styles.bullet}>• Continued use = acceptance</Text>
          <Text style={styles.bullet}>• Effective date updated above</Text>
        </View>

        {/* 11. Contact Information */}
        <Text style={styles.sectionTitle}>11. Contact Information</Text>
        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>Dalsi Firm - Privacy Officer</Text>
          <Text style={styles.contactText}>FairPrep by Dalsi Academy</Text>
          <Text style={styles.contactText}>Email: info@neodalsi.com</Text>
          <Text style={styles.contactText}>ABN: [Insert ABN]</Text>
          <Text style={styles.contactText}>Address: [Insert Business Address]</Text>
          <Text style={styles.contactText}></Text>
          <Text style={styles.contactText}>Complaints: Contact us first. If unsatisfied, contact Office of the Australian Information Commissioner (OAIC).</Text>
        </View>

        {/* 12. Mandatory User Acknowledgment */}
        <Text style={styles.sectionTitle}>12. Mandatory User Acknowledgment</Text>
        <View style={styles.acknowledgmentBox}>
          <Text style={styles.acknowledgmentTitle}>BY USING FAIRPREP BY DALSI ACADEMY, YOU ACKNOWLEDGE:</Text>
          <Text style={styles.acknowledgmentText}>✅ We collect minimal personal data (email + optional info)</Text>
          <Text style={styles.acknowledgmentText}>✅ Study data belongs to YOU (we just store it)</Text>
          <Text style={styles.acknowledgmentText}>✅ Data stored 100% in Australia</Text>
          <Text style={styles.acknowledgmentText}>✅ No data selling - EVER</Text>
          <Text style={styles.acknowledgmentText}>✅ You can delete everything anytime</Text>
          <Text style={styles.acknowledgmentText}>✅ Full privacy rights under Australian law</Text>
        </View>

        <Text style={styles.lastUpdated}>Last Updated: February 14, 2026</Text>
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  tableContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeader: {
    flex: 1,
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  tableCell: {
    flex: 1,
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  bulletList: {
    marginBottom: spacing.md,
  },
  bullet: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xs,
  },
  note: {
    fontSize: typography.bodySmall,
    color: colors.warning,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  highlightBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.success,
  },
  highlightText: {
    fontSize: typography.body,
    color: colors.success,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  contactBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  contactTitle: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  contactText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  acknowledgmentBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  acknowledgmentTitle: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  acknowledgmentText: {
    fontSize: typography.bodySmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  lastUpdated: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontStyle: 'italic',
  },
});
