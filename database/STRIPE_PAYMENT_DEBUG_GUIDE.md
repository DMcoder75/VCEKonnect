# Stripe Payment Not Working - Complete Debug Guide

## Problem Summary
- User clicks subscribe
- Payment form appears and accepts card
- User is NOT redirected back to app
- NO subscription entry in `vk_premium_subscriptions` table
- Stripe webhook shows **0 events delivered**

---

## Root Cause Analysis

### Issue 1: Webhook Not Receiving Events
**Symptom:** Stripe webhook dashboard shows "0 events delivered"

**Causes:**
1. **Webhook created AFTER test payment** - Stripe only sends events going forward, not retroactively
2. **Webhook listening to wrong events** - Must listen to `checkout.session.completed`
3. **Test mode vs Live mode mismatch** - Webhook in live mode, payment in test mode (or vice versa)

### Issue 2: WebView Not Detecting Redirect
**Symptom:** After payment, WebView doesn't close and return to app

**Causes:**
1. Stripe checkout not redirecting to deep link URLs
2. WebView not detecting navigation changes
3. Deep link scheme not registered in app.json

---

## Step-by-Step Fix

### Step 1: Verify Webhook Configuration in Stripe

1. **Go to Stripe Dashboard** → https://dashboard.stripe.com/test/webhooks
2. **Click on your webhook** (`elegant-brilliance`)
3. **Check "Events to send"** section:
   - ✅ Must have: `checkout.session.completed`
   - ✅ Recommended: `customer.subscription.updated`, `customer.subscription.deleted`
4. **If missing**, click "Add events" and select these events

### Step 2: Update STRIPE_WEBHOOK_SECRET in Supabase

Your webhook secret is: `whsec_oKouENcEjg2gnImPUTa7rTwD6SDuE1XS`

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/xududbaqaaffcaejwuix/settings/functions
2. **Check if `STRIPE_WEBHOOK_SECRET` exists**
3. **If missing or different**, add/update it:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_oKouENcEjg2gnImPUTa7rTwD6SDuE1XS`
4. **Redeploy `stripe-webhook` function** after updating secret

### Step 3: Verify Deep Link Configuration

Check your `app.json` has the correct scheme:

```json
{
  "expo": {
    "scheme": "fairprep"
  }
}
```

### Step 4: Test Payment Flow End-to-End

#### A. Using Stripe Test Mode

1. **Click Subscribe** in your app
2. **Use test card**: `4242 4242 4242 4242`
3. **Any future expiry** (e.g., 12/25)
4. **Any 3-digit CVC** (e.g., 123)
5. **Click Subscribe** in Stripe checkout

#### B. Check What Happens

**Expected Flow:**
1. ✅ Payment processes successfully
2. ✅ Stripe redirects to `fairprep://subscription/success?tier=basic`
3. ✅ WebView detects navigation change
4. ✅ WebView closes and returns to premium page
5. ✅ Stripe sends webhook event to your endpoint
6. ✅ Database record created in `vk_premium_subscriptions`
7. ✅ User sees "Pro" or "Basic" badge

**Current Problem:**
1. ✅ Payment processes
2. ❌ WebView NOT closing (redirect not working)
3. ❌ Webhook NOT receiving events (0 delivered)
4. ❌ No DB record
5. ❌ User stuck on checkout page

### Step 5: Debug Webhook Events

#### Option A: Use Stripe CLI (Recommended)

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhook events to your endpoint
stripe listen --forward-to https://xududbaqaaffcaejwuix.supabase.co/functions/v1/stripe-webhook

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

#### Option B: Manual Test via Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/events
2. Click "+ Add event"
3. Select `checkout.session.completed`
4. Click "Send test webhook"
5. Check if your webhook receives it

### Step 6: Check Edge Function Logs

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/xududbaqaaffcaejwuix/functions
2. **Click on `stripe-webhook`**
3. **View Logs** tab
4. **Look for entries** starting with `[STRIPE-WEBHOOK]`
5. **If no logs**: Webhook isn't being called at all
6. **If error logs**: Check the error message

### Step 7: Verify Database Table

Check if `vk_premium_subscriptions` table exists and has correct structure:

```sql
-- Run this in Supabase SQL Editor
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'vk_premium_subscriptions'
ORDER BY ordinal_position;
```

Expected columns:
- `id` (uuid)
- `user_id` (uuid)
- `subscription_tier` (text)
- `price_aud` (numeric)
- `payment_status` (text)
- `start_date` (timestamp)
- `end_date` (timestamp)
- `payment_transaction_id` (text)
- etc.

---

## Common Issues & Solutions

### Issue: "Webhook signature verification failed"

**Cause:** STRIPE_WEBHOOK_SECRET doesn't match webhook secret in Stripe

**Fix:**
1. Copy secret from Stripe webhook details page
2. Update `STRIPE_WEBHOOK_SECRET` in Supabase
3. Redeploy `stripe-webhook` function

### Issue: "User not found in vk_users table"

**Cause:** User's `auth_user_id` doesn't exist in `vk_users` table

**Fix:**
```sql
-- Check if user exists
SELECT id, email, auth_user_id 
FROM vk_users 
WHERE auth_user_id = 'YOUR_AUTH_USER_ID';

-- If missing, create user record manually or check signup flow
```

### Issue: WebView stays open after payment

**Cause:** Deep link redirect not working

**Fix in app/stripe-checkout-modal.tsx:**
- Check `onNavigationStateChange` is detecting URL changes
- Verify deep link scheme matches `app.json`
- Add more detailed logging to see what URLs are being navigated to

### Issue: Payment successful but webhook not fired

**Cause:** Webhook only created for live mode, but using test mode

**Fix:**
1. Verify you're in **Test mode** in Stripe dashboard (check top-left corner)
2. Create separate webhooks for test and live mode
3. Use correct webhook secret for each mode

---

## Quick Fix: Manual Database Entry (Temporary)

If you need to test the app while debugging webhook:

```sql
-- Manually create subscription record
INSERT INTO vk_premium_subscriptions (
  user_id,
  subscription_tier,
  price_aud,
  duration_months,
  start_date,
  end_date,
  payment_method,
  payment_transaction_id,
  payment_status,
  auto_renew
) VALUES (
  'YOUR_VK_USER_ID',  -- Get from vk_users table
  'basic',             -- or 'pro'
  20,                  -- or 40 for pro
  6,
  now(),
  now() + interval '6 months',
  'test_card',
  'manual_test_transaction',
  'completed',
  true
);

-- Update user premium status
UPDATE vk_users
SET 
  is_premium = true,
  premium_tier = 'basic',  -- or 'pro'
  premium_expires_at = now() + interval '6 months',
  premium_auto_renew = true
WHERE id = 'YOUR_VK_USER_ID';
```

---

## Next Steps

1. **Immediate**: Check webhook events configuration in Stripe
2. **Immediate**: Verify STRIPE_WEBHOOK_SECRET in Supabase
3. **Test**: Make a new test payment and watch webhook deliveries in Stripe
4. **Debug**: Check Edge Function logs for any errors
5. **Verify**: Check database after payment to see if record appears

---

## Contact Points to Check

✅ **Stripe Checkout Session**: Created correctly with metadata
✅ **Webhook Endpoint**: Deployed and accessible
❌ **Webhook Events**: Not being delivered (0 events)
❌ **Database Insert**: Not happening (no records)
❌ **WebView Redirect**: Not closing modal

**Focus on:** Getting webhook events to fire first, then fix WebView redirect.
