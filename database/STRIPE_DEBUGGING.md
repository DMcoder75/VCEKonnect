# Stripe Subscription Debugging Guide

## Issue: Subscription Not Recording + No Redirect

### Root Cause
Stripe checkout requires **HTTPS URLs** for `success_url` and `cancel_url`. Deep links (`fairprep://`) are NOT supported directly in checkout sessions.

### Solution Applied
Updated `create-checkout` Edge Function to use Edge Function URLs that then redirect to deep links:

**Before (Broken):**
```typescript
success_url: `fairprep://subscription/success?tier=${tier}`,  // ❌ Not supported by Stripe
cancel_url: `fairprep://subscription/cancel`,                 // ❌ Not supported by Stripe
```

**After (Fixed):**
```typescript
success_url: `https://xududbaqaaffcaejwuix.supabase.co/functions/v1/payment-success?tier=${tier}`,
cancel_url: `https://xududbaqaaffcaejwuix.supabase.co/functions/v1/payment-cancel`,
```

---

## Debugging Checklist

### 1. Verify Webhook Configuration

**Check if webhook is receiving events:**

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/test/webhooks
2. **Check Webhook Endpoint**: Should be `https://xududbaqaaffcaejwuix.supabase.co/functions/v1/stripe-webhook`
3. **Check Events**: Must include `checkout.session.completed`
4. **Test the endpoint**: Click "Send test webhook" → Select `checkout.session.completed`

**Check Supabase Edge Function Logs:**

1. Go to: Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
2. Look for logs with `[STRIPE-WEBHOOK]` prefix
3. If no logs appear, webhook is not being triggered

**Common Issues:**
- ❌ Webhook URL is wrong
- ❌ Webhook secret mismatch
- ❌ Webhook events not selected correctly
- ❌ Using production keys with test webhook (or vice versa)

### 2. Test Complete Flow End-to-End

**Step 1: Redeploy Updated Functions**

```bash
# Deploy updated create-checkout function
supabase functions deploy create-checkout

# Verify payment-success and payment-cancel are deployed
supabase functions deploy payment-success
supabase functions deploy payment-cancel

# Verify stripe-webhook is deployed
supabase functions deploy stripe-webhook
```

**Step 2: Test Subscription in App**

1. Open app → Click "Upgrade to Premium"
2. Select Basic or Pro plan
3. Click Subscribe
4. **Watch Debug Panel** - should show:
   ```
   ✅ Checkout URL received
   🌐 Opening WebView modal...
   ```
5. Complete payment with test card: `4242 4242 4242 4242`
6. **After payment completes:**
   - Should see success page with "Payment Successful!" message
   - Should auto-redirect to app after 3 seconds
   - OR you can click "Return to App" button

**Expected Behavior:**
- ✅ WebView closes automatically
- ✅ App returns to Premium screen
- ✅ Subscription status refreshes
- ✅ Premium features unlock

### 3. Verify Database Records

**After successful payment, check database:**

```sql
-- Check vk_premium_subscriptions table
SELECT * FROM vk_premium_subscriptions 
ORDER BY created_at DESC 
LIMIT 5;

-- Check vk_users premium status
SELECT 
  id, 
  email, 
  is_premium, 
  premium_tier, 
  premium_expires_at,
  premium_auto_renew
FROM vk_users 
WHERE auth_user_id = 'YOUR_USER_ID';
```

**Expected Records:**

**vk_premium_subscriptions:**
```
id: uuid
user_id: uuid (from vk_users)
subscription_tier: 'basic' or 'pro'
price_aud: 20 or 40
payment_status: 'completed'
start_date: now()
end_date: 6 months from now
payment_transaction_id: Stripe payment intent ID
auto_renew: true
```

**vk_users:**
```
is_premium: true
premium_tier: 'basic' or 'pro'
premium_expires_at: end_date from subscription
premium_auto_renew: true
```

### 4. Debug Webhook Issues

**If webhook is not creating database records:**

**Check Webhook Logs:**
```
[STRIPE-WEBHOOK] Webhook received
[STRIPE-WEBHOOK] Webhook signature verified - {"eventType":"checkout.session.completed"}
[STRIPE-WEBHOOK] Checkout session completed - {"sessionId":"cs_test_..."}
[STRIPE-WEBHOOK] Subscription retrieved - {"subscriptionId":"sub_..."}
[STRIPE-WEBHOOK] VK user found - {"vkUserId":"..."}
[STRIPE-WEBHOOK] Inserting subscription record - {...}
[STRIPE-WEBHOOK] Subscription inserted successfully
[STRIPE-WEBHOOK] User premium status updated
```

**If logs show errors:**

**Error: "STRIPE_WEBHOOK_SECRET not set"**
- Add secret in Supabase Dashboard → Settings → Edge Functions
- Name: `STRIPE_WEBHOOK_SECRET`
- Value: `whsec_...` (from Stripe Dashboard → Webhooks → Signing secret)

**Error: "User not found in vk_users table"**
- Check that user exists in `vk_users` with correct `auth_user_id`
- Run: `SELECT * FROM vk_users WHERE auth_user_id = 'USER_ID_FROM_METADATA'`

**Error: "Failed to insert subscription"**
- Check table constraints and foreign keys
- Verify `vk_users.id` exists and matches `user_id` in insert

**Error: "Webhook signature verification failed"**
- Webhook secret mismatch
- Check that secret in Supabase matches secret in Stripe Dashboard

### 5. Manual Testing

**Test Webhook Directly:**

```bash
# Send test event from Stripe CLI
stripe trigger checkout.session.completed
```

**Check Edge Function Response:**

```bash
curl -X POST https://xududbaqaaffcaejwuix.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_123",
        "customer": "cus_test_123",
        "subscription": "sub_test_123",
        "metadata": {
          "user_id": "YOUR_USER_ID",
          "tier": "basic"
        }
      }
    }
  }'
```

### 6. Common Mistakes

**❌ Using Deep Links in Stripe Checkout**
- Stripe requires HTTPS URLs for success/cancel
- Fixed by using Edge Function URLs that redirect to deep links

**❌ Webhook Endpoint Not Configured**
- Must add webhook endpoint in Stripe Dashboard
- Must select correct events (`checkout.session.completed`)

**❌ Wrong Database URL**
- Must use external Supabase: `https://xududbaqaaffcaejwuix.supabase.co`
- NOT OnSpace Cloud backend

**❌ Missing Metadata in Checkout Session**
- `user_id` and `tier` must be in session metadata
- Webhook uses these to create database records

**❌ Test vs Production Keys Mismatch**
- Test webhook with test API keys
- Production webhook with production API keys
- Don't mix them!

---

## Quick Verification Commands

**1. Check if Edge Functions are deployed:**
```bash
supabase functions list
```

**2. Check Edge Function logs:**
```bash
supabase functions logs stripe-webhook --tail
```

**3. Test checkout creation:**
```bash
# Check debug panel in app for detailed logs
# Should show full checkout creation flow
```

**4. Verify webhook deliveries:**
- Go to Stripe Dashboard → Webhooks → Click your endpoint
- Check "Recent deliveries" tab
- Should show successful deliveries with 200 status code

---

## Still Not Working?

**Collect these details:**

1. **Stripe webhook delivery logs** (from Stripe Dashboard)
2. **Edge Function logs** (from Supabase Dashboard)
3. **Database query results** (vk_premium_subscriptions and vk_users)
4. **Debug panel logs** (from app Premium screen)

**Common final issues:**

- Webhook secret not set or incorrect
- Webhook endpoint URL typo
- Subscription already exists (check for duplicates)
- RLS policies blocking insert (should use service role)
- User doesn't exist in vk_users table
