# 📦 Premium Features - Database Scripts & Files Summary

## ✅ Files Created

### 1. Database Schema
**File:** `database/premium_features_schema.sql`
- Complete SQL script for all premium features
- 5 new tables + user table modifications
- RLS policies for all tables
- Helper functions for limit checking
- Triggers for auto-updates

### 2. Service Layer
**File:** `services/premiumService.ts`
- Premium tier definitions and limits
- Premium check functions
- What-if scenario CRUD operations
- AI feature limit checking
- Usage tracking functions

### 3. React Hook
**File:** `hooks/usePremium.ts`
- Centralized premium state management
- Auto-loads premium status
- Provides tier, limits, and loading state
- Refresh function for manual reload

### 4. UI Components
**File:** `components/feature/PremiumPaywall.tsx`
- Modal overlay for locked features
- Shows required tier and pricing
- "Unlock Premium" CTA

**File:** `components/feature/PremiumBlurOverlay.tsx`
- Blur wrapper for locked content
- Shows lock icon and upgrade button
- Preserves content behind blur

### 5. Documentation
**File:** `database/PREMIUM_IMPLEMENTATION_GUIDE.md`
- Complete implementation guide
- Feature comparison table
- Testing checklist
- Code examples

### 6. Index Updates
**Updated:** `components/feature/index.ts`
- Added PremiumPaywall export
- Added PremiumBlurOverlay export

**Updated:** `hooks/index.ts`
- Added usePremium export

---

## 🗄️ Database Tables Summary

### New Tables

1. **vk_premium_subscriptions**
   ```sql
   - id (UUID, PK)
   - user_id (FK → vk_users)
   - subscription_tier (basic | pro)
   - price_aud (NUMERIC)
   - start_date, end_date (TIMESTAMP)
   - payment_transaction_id
   - payment_status (pending | completed | failed | refunded | cancelled)
   - auto_renew (BOOLEAN)
   ```

2. **vk_whatif_scenarios**
   ```sql
   - id (UUID, PK)
   - user_id (FK → vk_users)
   - scenario_name (TEXT)
   - subject_scores (JSONB)
   - predicted_atar, predicted_aggregate
   - current_atar, atar_difference
   - notes, is_favorite
   ```

3. **vk_ai_study_plans**
   ```sql
   - id (UUID, PK)
   - user_id (FK → vk_users)
   - week_start_date, week_end_date
   - plan_content (JSONB)
   - context_data (JSONB)
   - is_active, user_feedback, user_rating
   ```

4. **vk_ai_recommendations**
   ```sql
   - id (UUID, PK)
   - user_id (FK → vk_users)
   - subject_id (TEXT)
   - recommendation_type
   - recommendation_content (JSONB)
   - context_data (JSONB)
   - is_bookmarked, user_rating
   ```

5. **vk_ai_practice_questions**
   ```sql
   - id (UUID, PK)
   - user_id (FK → vk_users)
   - subject_id, topic, difficulty_level
   - questions_content (JSONB)
   - attempted_count, correct_count
   - completion_status, is_bookmarked
   ```

### Modified Tables

**vk_users** - Added:
- `premium_tier` (TEXT): 'free' | 'basic' | 'pro'
- `premium_expires_at` (TIMESTAMP)
- `premium_auto_renew` (BOOLEAN)

---

## 🚀 Quick Start Deployment

### Step 1: Run Database Script
```bash
# Connect to your Supabase database
# Run this SQL file:
database/premium_features_schema.sql
```

### Step 2: Verify Deployment
Run these checks in Supabase SQL editor:

```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'vk_%' 
ORDER BY table_name;

-- Check helper functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%premium%';

-- Test premium tier function
SELECT get_user_premium_tier('YOUR_USER_ID');
```

### Step 3: Test Premium Service
In your app:

```tsx
import { usePremium } from '@/hooks/usePremium';

export default function TestPage() {
  const { tier, limits, isPremium, isLoading } = usePremium();
  
  if (isLoading) return <Text>Loading...</Text>;
  
  return (
    <View>
      <Text>Current Tier: {tier}</Text>
      <Text>Is Premium: {isPremium ? 'Yes' : 'No'}</Text>
      <Text>What-If Limit: {limits.whatifScenariosPerMonth}</Text>
    </View>
  );
}
```

---

## 💎 Premium Tier Comparison

| Feature | Free | Basic ($20/6m) | Pro ($40/6m) |
|---------|------|----------------|--------------|
| **What-If Scenarios** | 1/month | Unlimited | Unlimited |
| **AI Study Plans** | 1 trial | 5 stored | Unlimited + Personalized |
| **AI Recommendations** | 1 subject once | All subjects, 5 each | All subjects unlimited |
| **AI Practice Questions** | 1 subject once | All subjects, 5 each | All subjects unlimited |
| **ATAR Best/Worst Case** | ❌ Locked | ✅ Unlocked | ✅ Unlocked |
| **Subject Score Editing** | ❌ Locked | ✅ Unlocked | ✅ Unlocked |
| **ATAR Roadmap** | ❌ Locked | ✅ Unlocked | ✅ Unlocked |
| **AI Subject Strategy** | ❌ Locked | ✅ Unlocked | ✅ Unlocked |
| **AI Advanced Strategy** | ❌ Locked | ❌ Locked | ✅ Unlocked |
| **Export Data** | ❌ Locked | ✅ Unlocked | ✅ Unlocked |

---

## 🎯 Next Implementation Tasks

### Priority 1: Database Deployment
- [ ] Run `premium_features_schema.sql` on Supabase
- [ ] Verify all tables and functions created
- [ ] Test RLS policies with test users

### Priority 2: ATAR Page Updates
- [ ] Add premium checks to ATAR scenarios
- [ ] Implement blur overlays for free tier
- [ ] Create best/worst case calculation algorithm
- [ ] Lock Roadmap tab with paywall
- [ ] Add AI Strategy buttons (Basic/Pro)

### Priority 3: What-If Features
- [ ] Add "Save Scenario" functionality
- [ ] Implement limit checking
- [ ] Create scenarios history page
- [ ] Add favorites/notes features

### Priority 4: AI Features
- [ ] Implement premium checks on AI Study Plans
- [ ] Add storage quota handling
- [ ] Create AI Recommendations page with limits
- [ ] Create AI Practice Questions with progress tracking

### Priority 5: Export & Menu
- [ ] Move Export Data to Quick Access Menu
- [ ] Wrap Export page with blur overlay
- [ ] Update menu items as requested

### Priority 6: Premium Page
- [ ] Update with new tier comparison table
- [ ] Add feature descriptions
- [ ] Prepare for Stripe integration

---

## 📝 Important Notes for Next Steps

### Best/Worst Case Algorithm
You mentioned needing a "greatest of algo" for ATAR best/worst case scenarios. Here's the approach:

**Best Case:**
- For each subject, increase scores by 10%
- Recalculate ATAR with improved scores
- Show which subjects improved most

**Worst Case:**
- For each subject, decrease scores by 10%
- Recalculate ATAR with reduced scores
- Show which subjects impacted most

This will require updating the ATAR page to dynamically adjust subject scores when user clicks Best/Worst case tabs.

### Quick Access Menu Changes
Required changes:
- ✅ Rename "AI Recommendations" → "AI Recommends"
- ✅ Rename "Practice Questions" → "AI Questions"
- ❌ Remove "Privacy Policy"
- ❌ Remove "Terms & Conditions"
- ➕ Add "Export Data" menu item

---

## 🔒 Security Reminders

1. **All premium checks must use RLS policies** - Never trust client-side checks alone
2. **Payment verification** - When integrating Stripe, verify payments server-side
3. **Expiry handling** - Set up cron job to check premium expiries daily
4. **Rate limiting** - Consider adding rate limits to AI feature endpoints

---

## 📞 Contact & Support

If you encounter issues:
1. Check Supabase logs for SQL errors
2. Verify RLS policies with test queries
3. Test helper functions in SQL editor
4. Review browser console for client errors

---

**Deployment Ready:** ✅ All files created  
**Database Script:** `database/premium_features_schema.sql`  
**Documentation:** `database/PREMIUM_IMPLEMENTATION_GUIDE.md`  

**Your next step:** Run the SQL script on your external Supabase database!
