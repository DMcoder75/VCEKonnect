# 🚀 FairPrep Premium Features Implementation Guide

## 📋 Overview

This document outlines the complete premium features system for FairPrep, including database schema, service layers, and UI components.

---

## 💎 Premium Tiers

### Free Tier
- **Price:** $0
- **What-If Scenarios:** 1 per month
- **AI Study Plans:** 1 trial only (no storage)
- **AI Recommendations:** 1 subject once (no storage)
- **AI Practice Questions:** 1 subject once (no storage)
- **ATAR Features:** Current scenario only, locked best/worst case, no roadmap
- **Export Data:** Locked

### Basic Tier ($20 AUD / 6 months)
- **What-If Scenarios:** Unlimited
- **AI Study Plans:** 5 stored plans
- **AI Recommendations:** All subjects, 5 tries each (stored)
- **AI Practice Questions:** All subjects, 5 tries each (stored)
- **ATAR Features:** All scenarios unlocked, roadmap access, AI subject strategy
- **Export Data:** Unlocked

### Pro Tier ($40 AUD / 6 months)
- **What-If Scenarios:** Unlimited
- **AI Study Plans:** Unlimited + personalized weekly AI plans
- **AI Recommendations:** All subjects unlimited (stored)
- **AI Practice Questions:** All subjects unlimited (stored)
- **ATAR Features:** All scenarios + AI advanced subject strategy
- **Export Data:** Unlocked

---

## 🗄️ Database Schema

### Tables Created

1. **vk_premium_subscriptions**
   - Tracks all subscription purchases and renewals
   - Stores payment transaction details
   - Handles auto-renewal logic

2. **vk_whatif_scenarios**
   - Stores user's what-if ATAR predictions
   - Tracks scenario metadata (name, notes, favorites)
   - Compares predicted vs current ATAR

3. **vk_ai_study_plans**
   - Stores AI-generated weekly study plans
   - Tracks user feedback and ratings
   - Stores context data for personalization

4. **vk_ai_recommendations**
   - Stores AI subject recommendations per subject
   - Tracks bookmarks and user ratings
   - Maintains recommendation history

5. **vk_ai_practice_questions**
   - Stores AI-generated practice question sets
   - Tracks user progress (attempted, correct count)
   - Maintains completion status

### User Table Modifications

Added to `vk_users`:
- `premium_tier` (TEXT): 'free', 'basic', 'pro'
- `premium_expires_at` (TIMESTAMP): Expiry date
- `premium_auto_renew` (BOOLEAN): Auto-renewal flag

### Helper Functions

- `has_active_premium(user_id)`: Check if user has active premium
- `get_user_premium_tier(user_id)`: Get user's current tier
- `count_whatif_scenarios_this_month(user_id)`: Count scenarios this month
- `count_ai_study_plans(user_id)`: Count total AI study plans
- `count_ai_recommendations_for_subject(user_id, subject_id)`: Count per-subject
- `count_ai_practice_questions_for_subject(user_id, subject_id)`: Count per-subject

---

## 🔧 Service Layer

### `services/premiumService.ts`

**Functions:**
- `getUserPremiumTier(userId)`: Get user's tier
- `getUserPremiumLimits(userId)`: Get tier limits object
- `hasActivePremium(userId)`: Check premium status
- `canCreateWhatIfScenario(userId)`: Check what-if limit
- `saveWhatIfScenario(scenario)`: Save scenario to DB
- `getUserWhatIfScenarios(userId)`: Fetch user scenarios
- `canCreateAIStudyPlan(userId)`: Check AI plan limit
- `canCreateAIRecommendation(userId, subjectId)`: Check recommendation limit
- `canCreateAIPracticeQuestions(userId, subjectId)`: Check practice questions limit

---

## 🎣 React Hooks

### `hooks/usePremium.ts`

Returns:
- `tier`: Current premium tier ('free' | 'basic' | 'pro')
- `limits`: PremiumLimits object with all feature limits
- `isPremium`: Boolean (true if basic or pro)
- `isLoading`: Loading state
- `refresh()`: Reload premium status

**Usage:**
```tsx
const { tier, limits, isPremium, isLoading } = usePremium();

if (limits.atarRoadmapAccess) {
  // Show roadmap feature
} else {
  // Show paywall
}
```

---

## 🎨 UI Components

### `PremiumPaywall`

Modal overlay for locked features.

**Props:**
- `visible`: Show/hide modal
- `onClose`: Close handler
- `feature`: Feature name (e.g., "ATAR Roadmap")
- `description`: Feature description
- `requiredTier`: 'basic' | 'pro'
- `currentTier`: User's current tier

**Usage:**
```tsx
<PremiumPaywall
  visible={showPaywall}
  onClose={() => setShowPaywall(false)}
  feature="ATAR Roadmap"
  description="See exactly what scores you need to reach your target ATAR"
  requiredTier="basic"
  currentTier={tier}
/>
```

### `PremiumBlurOverlay`

Blur wrapper for content that should be locked.

**Props:**
- `children`: Content to blur
- `isLocked`: Whether to show blur
- `feature`: Feature name
- `requiredTier`: 'basic' | 'pro'
- `onUpgrade`: Upgrade handler

**Usage:**
```tsx
<PremiumBlurOverlay
  isLocked={!limits.exportDataAccess}
  feature="Export Data"
  requiredTier="basic"
  onUpgrade={() => router.push('/premium')}
>
  <ExportDataContent />
</PremiumBlurOverlay>
```

---

## 🎯 Implementation Checklist

### 1. Database Setup
- [x] Run `database/premium_features_schema.sql` on Supabase
- [ ] Verify all tables created
- [ ] Test RLS policies
- [ ] Test helper functions

### 2. ATAR Predictor Updates
- [ ] Hide best/worst case scenarios for free tier (blur)
- [ ] Lock subject score editing for free tier
- [ ] Implement best/worst case calculation algorithm
- [ ] Lock Roadmap tab for free tier (show blur + upgrade button)
- [ ] Add "AI Subject Strategy" button (Basic tier)
- [ ] Add "AI Advanced Strategy" button (Pro tier)
- [ ] Remove duplicate ATAR predictor from Scaling tab

### 3. What-If Scenarios
- [ ] Add "Save Scenario" button
- [ ] Check limits before saving
- [ ] Show paywall if limit exceeded
- [ ] Create scenarios history page

### 4. AI Study Plans
- [ ] Check limits before generation
- [ ] Save to DB if user has storage quota
- [ ] Show paywall for free users after first use
- [ ] Implement personalized weekly plans for Pro tier

### 5. AI Recommendations
- [ ] Check limits before generation
- [ ] Restrict to one subject for free tier
- [ ] Save to DB for Basic/Pro tiers
- [ ] Show history page for stored recommendations

### 6. AI Practice Questions
- [ ] Check limits before generation
- [ ] Restrict to one subject for free tier
- [ ] Save to DB for Basic/Pro tiers
- [ ] Track user progress (attempted/correct)

### 7. Export Data
- [ ] Move to Quick Access Menu
- [ ] Wrap entire page in PremiumBlurOverlay
- [ ] Show "Go Premium" modal on click for free tier

### 8. Premium Page Updates
- [ ] Update feature list with accurate limits
- [ ] Add "Basic" and "Pro" tier comparison table
- [ ] Integrate Stripe payment (future)
- [ ] Add testimonials/social proof

### 9. Quick Access Menu
- [ ] Add "Export Data" menu item
- [ ] Remove "Privacy Policy" and "Terms & Conditions"

---

## 🧪 Testing Checklist

### Free Tier Testing
- [ ] Create 1 what-if scenario → works
- [ ] Try creating 2nd scenario in same month → paywall shown
- [ ] Try AI Study Plan once → works
- [ ] Try AI Study Plan twice → paywall shown
- [ ] Try AI Recommendations → limited to 1 subject
- [ ] Try AI Practice Questions → limited to 1 subject
- [ ] Access ATAR best/worst case → blurred
- [ ] Try editing subject scores → locked
- [ ] Access Roadmap → paywall shown
- [ ] Access Export Data → blurred with modal

### Basic Tier Testing
- [ ] Create unlimited what-if scenarios → all work
- [ ] Create 5 AI study plans → all work
- [ ] Try 6th AI study plan → paywall shown
- [ ] AI Recommendations on all subjects, 5 each → works
- [ ] Try 6th recommendation per subject → paywall shown
- [ ] AI Practice Questions on all subjects, 5 each → works
- [ ] Access all ATAR features → unlocked
- [ ] Access "AI Subject Strategy" → works
- [ ] Access "AI Advanced Strategy" → paywall for Pro

### Pro Tier Testing
- [ ] Unlimited everything → all work
- [ ] Personalized weekly AI study plans → generated
- [ ] All AI features unlimited → confirmed

---

## 📊 Recommended Next Steps

1. **Run Database Script**
   - Execute `database/premium_features_schema.sql` on external Supabase
   - Verify all tables and functions created

2. **Update ATAR Page**
   - Implement premium checks on all features
   - Add blur overlays for locked content
   - Create best/worst case calculation logic

3. **Implement What-If History**
   - Create new page to show saved scenarios
   - Add comparison view

4. **Build AI Feature Pages**
   - Implement premium checks
   - Add save functionality
   - Create history views

5. **Payment Integration**
   - Set up Stripe account
   - Implement checkout flow
   - Handle webhooks for subscription updates

6. **Testing & QA**
   - Test all tier limits
   - Verify paywall triggers correctly
   - Ensure smooth upgrade flow

---

## 💡 Tips for Implementation

### Premium Check Pattern
```tsx
import { usePremium } from '@/hooks/usePremium';
import { PremiumPaywall } from '@/components/feature';

export default function FeaturePage() {
  const { limits, tier } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);

  function handleFeatureAccess() {
    if (!limits.featureName) {
      setShowPaywall(true);
      return;
    }
    // Proceed with feature
  }

  return (
    <>
      {/* Your content */}
      <PremiumPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="Feature Name"
        description="Feature description"
        requiredTier="basic"
        currentTier={tier}
      />
    </>
  );
}
```

### Limit Check Before Action
```tsx
import { canCreateWhatIfScenario } from '@/services/premiumService';

async function handleSaveScenario() {
  const check = await canCreateWhatIfScenario(userId);
  
  if (!check.allowed) {
    alert(check.reason); // Or show paywall modal
    return;
  }
  
  // Proceed with save
  await saveWhatIfScenario(scenarioData);
}
```

---

## 🔐 Security Notes

- All premium checks happen server-side via RLS policies
- Client-side checks are for UX only (paywalls, blur overlays)
- Database functions use SECURITY DEFINER for safe execution
- RLS policies prevent unauthorized data access

---

## 📞 Support

For issues during implementation:
1. Check database function execution
2. Verify RLS policies are enabled
3. Test with different user tiers
4. Review browser console for errors

---

**Implementation Date:** February 26, 2026  
**Version:** 1.0.0  
**Status:** Ready for Database Deployment
