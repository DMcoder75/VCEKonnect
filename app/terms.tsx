import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

export default function TermsAndConditionsScreen() {
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
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>FairPrep by Dalsi Academy</Text>
        <Text style={styles.subtitle}>Terms & Conditions</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Effective Date: February 14, 2026</Text>
          <Text style={styles.infoText}>Company: Dalsi Firm ABN [Insert ABN]</Text>
          <Text style={styles.infoText}>App: FairPrep by Dalsi Academy</Text>
          <Text style={styles.infoText}>Website: [Insert Website]</Text>
          <Text style={styles.infoText}>Contact: info@neodalsi.com</Text>
        </View>

        {/* 1. Introduction & Acceptance */}
        <Text style={styles.sectionTitle}>1. INTRODUCTION & ACCEPTANCE</Text>
        
        <Text style={styles.subsectionTitle}>1.1 Binding Legal Agreement</Text>
        <Text style={styles.paragraph}>
          By accessing, downloading, installing, registering for, or using FairPrep by Dalsi Academy (the "App"), associated website, APIs, or any related services (collectively, the "Services"), you ("User", "you") agree to be bound by these Terms & Conditions ("Terms").
        </Text>

        <Text style={styles.subsectionTitle}>1.2 No Agreement = No Access</Text>
        <Text style={styles.paragraph}>
          If you do not agree to these Terms, you must immediately cease all use of the Services and delete the App.
        </Text>

        <Text style={styles.subsectionTitle}>1.3 Parties to Contract</Text>
        <Text style={styles.paragraph}>
          These Terms create a legally binding contract between you and Dalsi Firm ("Dalsi Firm", "we", "us", "our"), operating as FairPrep by Dalsi Academy.
        </Text>

        <Text style={styles.subsectionTitle}>1.4 Updates to Terms</Text>
        <Text style={styles.paragraph}>
          We may update these Terms at any time. Continued use after changes constitutes acceptance. Major changes notified via email or in-App notice.
        </Text>

        {/* 2. Service Description */}
        <Text style={styles.sectionTitle}>2. SERVICE DESCRIPTION</Text>
        
        <Text style={styles.subsectionTitle}>2.1 What FairPrep Provides</Text>
        <Text style={styles.paragraph}>
          FairPrep by Dalsi Academy offers professional study planning tools for Australian Year 12 students across all states/territories:
        </Text>
        
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• ATAR/HSC/QCE/WACE/SACE predictions - Mathematical estimates based on user input</Text>
          <Text style={styles.bullet}>• Multi-period goal tracking - Weekly/monthly/term study targets</Text>
          <Text style={styles.bullet}>• SAC/Exam calendars - State-specific assessment schedules</Text>
          <Text style={styles.bullet}>• Study time tracking - Timer integration with auto-goal updates</Text>
          <Text style={styles.bullet}>• Progress analytics - Performance dashboards and reports</Text>
          <Text style={styles.bullet}>• Export tools - PDF/CSV summaries (Premium)</Text>
        </View>

        <Text style={styles.subsectionTitle}>2.2 Informational Tools Only</Text>
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>CRITICAL: Services are planning and organizational tools ONLY.</Text>
          <Text style={styles.warningText}>They do NOT constitute:</Text>
          <Text style={styles.warningText}>• Academic advice</Text>
          <Text style={styles.warningText}>• Tutoring services</Text>
          <Text style={styles.warningText}>• Guaranteed educational outcomes</Text>
          <Text style={styles.warningText}>• Official assessment calculations</Text>
          <Text style={styles.warningText}>• Career counseling</Text>
        </View>

        <Text style={styles.subsectionTitle}>2.3 Supported Certificates</Text>
        <Text style={styles.paragraph}>
          HSC (NSW) • VCE (VIC) • QCE (QLD) • WACE (WA) • SACE (SA) • TCE (TAS) • NTCET (NT) • ACT Senior Secondary
        </Text>

        {/* 3. User Eligibility & Accounts */}
        <Text style={styles.sectionTitle}>3. USER ELIGIBILITY & ACCOUNTS</Text>
        
        <Text style={styles.subsectionTitle}>3.1 Age Requirements</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Minimum Age: 13 years</Text>
          <Text style={styles.bullet}>• Under 18: Parental/guardian consent required</Text>
          <Text style={styles.bullet}>• No COPPA compliance (Australian jurisdiction)</Text>
        </View>

        <Text style={styles.subsectionTitle}>3.2 Account Creation</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Email verification required</Text>
          <Text style={styles.bullet}>• You must provide accurate registration information</Text>
          <Text style={styles.bullet}>• Account security is YOUR responsibility</Text>
        </View>

        <Text style={styles.subsectionTitle}>3.3 Account Termination</Text>
        <Text style={styles.paragraph}>We may suspend/terminate accounts for:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Violation of Terms</Text>
          <Text style={styles.bullet}>• Fraudulent data entry</Text>
          <Text style={styles.bullet}>• Abuse of Services</Text>
          <Text style={styles.bullet}>• Security risks</Text>
        </View>

        {/* 4. User Responsibilities & Data Input */}
        <Text style={styles.sectionTitle}>4. USER RESPONSIBILITIES & DATA INPUT</Text>
        
        <Text style={styles.subsectionTitle}>4.1 Your Data = Your Responsibility</Text>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>ALL DATA YOU ENTER IS YOURS:</Text>
          <Text style={styles.highlightText}>✓ Study hours logged</Text>
          <Text style={styles.highlightText}>✓ SAC/practice exam scores</Text>
          <Text style={styles.highlightText}>✓ Assessment dates</Text>
          <Text style={styles.highlightText}>✓ Goal targets</Text>
          <Text style={styles.highlightText}>✓ Prediction inputs</Text>
        </View>

        <Text style={styles.subsectionTitle}>4.2 Accuracy Guarantee</Text>
        <Text style={styles.paragraph}>You represent and warrant that all data entered is:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Accurate</Text>
          <Text style={styles.bullet}>• Complete</Text>
          <Text style={styles.bullet}>• Up-to-date</Text>
          <Text style={styles.bullet}>• Legitimate (not fabricated)</Text>
        </View>

        <Text style={styles.subsectionTitle}>4.3 No Verification</Text>
        <Text style={styles.paragraph}>
          Dalsi Firm does NOT verify, validate, or guarantee the accuracy of user-entered data.
        </Text>

        {/* 5. Predictions & Calculations */}
        <Text style={styles.sectionTitle}>5. PREDICTIONS & CALCULATIONS - COMPREHENSIVE DISCLAIMER</Text>
        
        <Text style={styles.subsectionTitle}>5.1 Nature of Predictions</Text>
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>ALL PREDICTIONS ARE MATHEMATICAL ESTIMATES:</Text>
          <Text style={styles.warningText}>✓ Based entirely on YOUR inputted data</Text>
          <Text style={styles.warningText}>✓ Using historical scaling statistics (VTAC/UAC/TISC/SATAC)</Text>
          <Text style={styles.warningText}>✓ Generic statistical models</Text>
          <Text style={styles.warningText}>✓ NOT official authority algorithms</Text>
        </View>

        <Text style={styles.subsectionTitle}>5.2 Factors Causing Variance</Text>
        <Text style={styles.paragraph}>Predictions WILL DIFFER from official results due to:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Exam performance variation (High Impact)</Text>
          <Text style={styles.bullet}>• Annual scaling methodology changes (High Impact)</Text>
          <Text style={styles.bullet}>• Cohort performance shifts (High Impact)</Text>
          <Text style={styles.bullet}>• Input data inaccuracies (High Impact)</Text>
          <Text style={styles.bullet}>• Different calculation methods (Medium Impact)</Text>
        </View>

        <Text style={styles.subsectionTitle}>5.3 No Official Affiliation</Text>
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>FairPrep by Dalsi Academy is COMPLETELY INDEPENDENT from:</Text>
          <Text style={styles.warningText}>• VCAA ✓ VTAC ✓ NESA ✓ UAC</Text>
          <Text style={styles.warningText}>• QCAA ✓ SCSA ✓ TISC ✓ SACE Board</Text>
          <Text style={styles.warningText}>• TASC ✓ BSSS ✓ NTBOS</Text>
        </View>

        <Text style={styles.subsectionTitle}>5.4 Prohibited Uses</Text>
        <Text style={styles.paragraph}>You agree NOT to rely on predictions for:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Subject selection (irreversible decisions)</Text>
          <Text style={styles.bullet}>• University applications</Text>
          <Text style={styles.bullet}>• Career planning</Text>
          <Text style={styles.bullet}>• Financial commitments (tutoring, courses)</Text>
          <Text style={styles.bullet}>• Academic counseling</Text>
        </View>

        {/* 6. Subscriptions & Payments */}
        <Text style={styles.sectionTitle}>6. SUBSCRIPTIONS & PAYMENTS</Text>
        
        <Text style={styles.subsectionTitle}>6.1 Freemium Model</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• FREE: Basic features (limited goals, 20h/week cap)</Text>
          <Text style={styles.bullet}>• PREMIUM: Unlimited features ($20/6 months)</Text>
        </View>

        <Text style={styles.subsectionTitle}>6.2 Payment Terms</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• All prices in AUD</Text>
          <Text style={styles.bullet}>• Processed via Stripe (PCI compliant)</Text>
          <Text style={styles.bullet}>• No refunds except as required by Australian Consumer Law</Text>
          <Text style={styles.bullet}>• Auto-renewal unless cancelled</Text>
        </View>

        <Text style={styles.subsectionTitle}>6.3 Cancellation</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Cancel anytime in App settings</Text>
          <Text style={styles.bullet}>• No prorated refunds</Text>
          <Text style={styles.bullet}>• Access until billing period ends</Text>
        </View>

        {/* 7. Intellectual Property Rights */}
        <Text style={styles.sectionTitle}>7. INTELLECTUAL PROPERTY RIGHTS</Text>
        
        <Text style={styles.subsectionTitle}>7.1 Ownership</Text>
        <Text style={styles.paragraph}>Dalsi Firm owns all rights to:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• App design and functionality</Text>
          <Text style={styles.bullet}>• Prediction algorithms</Text>
          <Text style={styles.bullet}>• Database structure</Text>
          <Text style={styles.bullet}>• Brand names/logos</Text>
          <Text style={styles.bullet}>• Proprietary scaling data</Text>
        </View>

        <Text style={styles.subsectionTitle}>7.2 Limited License</Text>
        <Text style={styles.paragraph}>Subject to these Terms, you receive:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>✓ Non-exclusive</Text>
          <Text style={styles.bullet}>✓ Non-transferable</Text>
          <Text style={styles.bullet}>✓ Personal use only</Text>
          <Text style={styles.bullet}>✓ No commercial rights</Text>
          <Text style={styles.bullet}>✓ Terminable anytime</Text>
        </View>

        <Text style={styles.subsectionTitle}>7.3 Prohibited Actions</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>❌ Copying/reverse engineering</Text>
          <Text style={styles.bullet}>❌ Commercial redistribution</Text>
          <Text style={styles.bullet}>❌ Data scraping</Text>
          <Text style={styles.bullet}>❌ Brand misuse</Text>
          <Text style={styles.bullet}>❌ Algorithm extraction</Text>
        </View>

        {/* 8. Acceptable Use Policy */}
        <Text style={styles.sectionTitle}>8. ACCEPTABLE USE POLICY</Text>
        
        <Text style={styles.subsectionTitle}>8.1 Permitted Use</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>✅ Personal Year 12 study planning</Text>
          <Text style={styles.bullet}>✅ Legitimate academic data entry</Text>
          <Text style={styles.bullet}>✅ Internal progress sharing</Text>
          <Text style={styles.bullet}>✅ Official authority verification</Text>
        </View>

        <Text style={styles.subsectionTitle}>8.2 Prohibited Conduct</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>❌ Fabricating SAC/exam scores</Text>
          <Text style={styles.bullet}>❌ Multiple fake accounts</Text>
          <Text style={styles.bullet}>❌ Commercial tutoring services</Text>
          <Text style={styles.bullet}>❌ Data export for sale</Text>
          <Text style={styles.bullet}>❌ Automated scraping</Text>
        </View>

        {/* 9. Disclaimers */}
        <Text style={styles.sectionTitle}>9. DISCLAIMERS (MAXIMUM LEGAL PROTECTION)</Text>
        
        <Text style={styles.subsectionTitle}>9.1 General Disclaimers</Text>
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>DALSI FIRM EXPRESSLY DISCLAIMS ALL WARRANTIES:</Text>
          <Text style={styles.warningText}>✓ Merchantability</Text>
          <Text style={styles.warningText}>✓ Fitness for particular purpose</Text>
          <Text style={styles.warningText}>✓ Accuracy of predictions</Text>
          <Text style={styles.warningText}>✓ Uninterrupted service</Text>
          <Text style={styles.warningText}>✓ Error-free operation</Text>
          <Text style={styles.warningText}>✓ Academic success outcomes</Text>
        </View>

        <Text style={styles.subsectionTitle}>9.2 "AS IS" "AS AVAILABLE"</Text>
        <Text style={styles.paragraph}>
          Services provided "AS IS" and "AS AVAILABLE" without warranties. No guarantee of specific results or performance.
        </Text>

        <Text style={styles.subsectionTitle}>9.3 Third Party Services</Text>
        <Text style={styles.paragraph}>No liability for:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>✓ Payment processors (Stripe)</Text>
          <Text style={styles.bullet}>✓ Cloud providers (Supabase)</Text>
          <Text style={styles.bullet}>✓ Notification services (Firebase)</Text>
          <Text style={styles.bullet}>✓ Official authorities (VCAA/NESA/etc.)</Text>
        </View>

        {/* 10. Limitation of Liability */}
        <Text style={styles.sectionTitle}>10. LIMITATION OF LIABILITY (COMPREHENSIVE)</Text>
        
        <Text style={styles.subsectionTitle}>10.1 No Liability Whatsoever</Text>
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>TO THE MAXIMUM EXTENT PERMITTED BY LAW,</Text>
          <Text style={styles.warningTitle}>DALSI FIRM AND ITS AFFILIATES HAVE ZERO LIABILITY FOR:</Text>
          <Text style={styles.warningText}>• Academic: Poor ATAR/HSC, failed subjects, missed uni offers</Text>
          <Text style={styles.warningText}>• Financial: Tutoring costs, course fees, lost scholarships</Text>
          <Text style={styles.warningText}>• Emotional: Stress, anxiety, disappointment, mental health</Text>
          <Text style={styles.warningText}>• Opportunity: Career delays, missed opportunities</Text>
          <Text style={styles.warningText}>• Data: Input errors, prediction variance</Text>
        </View>

        <Text style={styles.subsectionTitle}>10.2 Indirect Damages Excluded</Text>
        <Text style={styles.paragraph}>
          No liability for indirect, consequential, special, punitive damages including lost profits, lost data, business interruption.
        </Text>

        <Text style={styles.subsectionTitle}>10.3 Consumer Law Exception</Text>
        <Text style={styles.paragraph}>
          Where guarantees apply under Australian Consumer Law: Liability limited to resupply of Services OR Payment for cost of resupply (maximum AUD$50).
        </Text>

        {/* 11. Indemnification */}
        <Text style={styles.sectionTitle}>11. INDEMNIFICATION</Text>
        <Text style={styles.paragraph}>
          You agree to indemnify, defend, and hold harmless Dalsi Firm from all claims, damages, losses, liabilities, costs, and expenses (including legal fees) arising from:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Your use of Services</Text>
          <Text style={styles.bullet}>• Data you enter</Text>
          <Text style={styles.bullet}>• Decisions based on predictions</Text>
          <Text style={styles.bullet}>• Violations of these Terms</Text>
          <Text style={styles.bullet}>• Third-party claims from your use</Text>
        </View>

        {/* 12. Termination */}
        <Text style={styles.sectionTitle}>12. TERMINATION</Text>
        
        <Text style={styles.subsectionTitle}>12.1 By User</Text>
        <Text style={styles.paragraph}>Stop using Services anytime. Delete App/account.</Text>

        <Text style={styles.subsectionTitle}>12.2 By Dalsi Firm</Text>
        <Text style={styles.paragraph}>Immediate termination rights for:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Terms violations</Text>
          <Text style={styles.bullet}>• Fraud/abuse</Text>
          <Text style={styles.bullet}>• Security threats</Text>
          <Text style={styles.bullet}>• Legal requirements</Text>
        </View>

        <Text style={styles.subsectionTitle}>12.3 Effects</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• No refunds (Premium subscriptions)</Text>
          <Text style={styles.bullet}>• Account deletion</Text>
          <Text style={styles.bullet}>• Data purge (30 days)</Text>
        </View>

        {/* 13. Governing Law */}
        <Text style={styles.sectionTitle}>13. GOVERNING LAW & DISPUTE RESOLUTION</Text>
        
        <Text style={styles.subsectionTitle}>13.1 Governing Law</Text>
        <Text style={styles.paragraph}>Laws of Victoria, Australia govern these Terms.</Text>

        <Text style={styles.subsectionTitle}>13.2 Jurisdiction</Text>
        <Text style={styles.paragraph}>Exclusive jurisdiction of Victorian courts.</Text>

        <Text style={styles.subsectionTitle}>13.3 Dispute Process</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>1. Informal resolution (email info@neodalsi.com)</Text>
          <Text style={styles.bullet}>2. Victorian courts (final resolution)</Text>
        </View>

        {/* 14. Miscellaneous */}
        <Text style={styles.sectionTitle}>14. MISCELLANEOUS PROVISIONS</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• 14.1 Entire Agreement: These Terms constitute the complete agreement</Text>
          <Text style={styles.bullet}>• 14.2 Severability: Invalid provisions do not affect remaining Terms</Text>
          <Text style={styles.bullet}>• 14.3 No Waiver: Failure to enforce = not waiver of rights</Text>
          <Text style={styles.bullet}>• 14.4 Assignment: Dalsi Firm may assign rights. You may not</Text>
          <Text style={styles.bullet}>• 14.5 Force Majeure: No liability for events beyond reasonable control</Text>
        </View>

        {/* 15. Contact Information */}
        <Text style={styles.sectionTitle}>15. CONTACT INFORMATION</Text>
        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>Dalsi Firm</Text>
          <Text style={styles.contactText}>FairPrep by Dalsi Academy</Text>
          <Text style={styles.contactText}>Email: info@neodalsi.com</Text>
          <Text style={styles.contactText}>ABN: [Insert ABN]</Text>
          <Text style={styles.contactText}>Address: [Insert Business Address]</Text>
        </View>

        {/* 16. User Acknowledgment */}
        <Text style={styles.sectionTitle}>16. USER ACKNOWLEDGMENT (MANDATORY)</Text>
        <View style={styles.acknowledgmentBox}>
          <Text style={styles.acknowledgmentTitle}>BY USING FAIRPREP BY DALSI ACADEMY, YOU ACKNOWLEDGE:</Text>
          <Text style={styles.acknowledgmentText}>✅ Predictions are ESTIMATES ONLY - not guaranteed</Text>
          <Text style={styles.acknowledgmentText}>✅ Dalsi Firm has ZERO LIABILITY for academic results</Text>
          <Text style={styles.acknowledgmentText}>✅ All entered data is YOUR responsibility</Text>
          <Text style={styles.acknowledgmentText}>✅ You will VERIFY predictions with official authorities</Text>
          <Text style={styles.acknowledgmentText}>✅ You accept these Terms voluntarily and knowingly</Text>
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
  bulletList: {
    marginBottom: spacing.md,
  },
  bullet: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xs,
  },
  warningBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.error,
  },
  warningTitle: {
    fontSize: typography.body,
    color: colors.error,
    fontWeight: typography.bold,
    marginBottom: spacing.sm,
  },
  warningText: {
    fontSize: typography.bodySmall,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  highlightBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.success,
  },
  highlightTitle: {
    fontSize: typography.body,
    color: colors.success,
    fontWeight: typography.bold,
    marginBottom: spacing.sm,
  },
  highlightText: {
    fontSize: typography.bodySmall,
    color: colors.success,
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
