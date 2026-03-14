# Stripe Webhook Setup Guide

## Problem Fixed
After users complete Stripe checkout, their subscription wasn't being recorded in `vk_premium_subscriptions` table and the app didn't show success/failure messages.

## Solution Implemented
Created `stripe-webhook` Edge Function to capture Stripe events and write subscription data to your external database.

---

## Deployment Steps

### 1. Deploy the Webhook Edge Function

The `stripe-webhook` Edge Function has been created. Deploy it to your external Supabase instance:

```bash
# Navigate to your Supabase CLI project (if you have local setup)
# OR use Supabase Dashboard Edge Functions UI to deploy

# The function file is at: supabase/functions/stripe-webhook/index.ts
```

**Via Dashboard (Recommended for external Supabase):**
1. Go to https://supabase.com/dashboard/project/xududbaqaaffcaejwuix
2. Navigate to **Edge Functions**
3. Click **New Function** or deploy via CLI

### 2. Get Your Webhook URL

After deployment, your webhook URL will be:
```
https://xududbaqaaffcaejwuix.supabase.co/functions/v1/stripe-webhook
```

### 3. Configure Stripe Webhook

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/webhooks
2. **Add Endpoint**:
   - Click "+ Add endpoint"
   - URL: `https://xududbaqaaffcaejwuix.supabase.co/functions/v1/stripe-webhook`
   - Description: "FairPrep Subscription Webhook"
   - Events to send:
     - ✅ `checkout.session.completed` (REQUIRED)
     - ✅ `customer.subscription.updated` (recommended)
     - ✅ `customer.subscription.deleted` (recommended)
3. **Get Signing Secret**:
   - After creating the endpoint, click "Reveal" next to "Signing secret"
   - Copy the secret (starts with `whsec_...`)

### 4. Add Webhook Secret to Supabase

Add the signing secret to your external Supabase Edge Functions secrets:

1. Go to https://supabase.com/dashboard/project/xududbaqaaffcaejwuix/settings/functions
2. Add new secret:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (your webhook signing secret)
3. **Redeploy** the `stripe-webhook` function after adding the secret

### 5. Test the Webhook

#### Using Stripe CLI (Local Testing)
```bash
stripe listen --forward-to https://xududbaqaaffcaejwuix.supabase.co/functions/v1/stripe-webhook
stripe trigger checkout.session.completed
```

#### Using Stripe Dashboard Test Mode
1. Use test card: `4242 4242 4242 4242`
2. Any future expiry date
3. Any 3-digit CVC
4. Complete checkout
5. Check Stripe Dashboard → Webhooks → Recent deliveries to verify webhook was called
6. Check `vk_premium_subscriptions` table in your database to verify record was created

---

## How It Works

### Payment Flow
1. **User clicks Subscribe** → App calls `create-checkout` Edge Function
2. **Stripe creates checkout session** → Returns checkout URL with success/cancel URLs
3. **User completes payment** → Stripe processes payment
4. **Stripe sends webhook event** → `checkout.session.completed` is sent to your webhook endpoint
5. **Webhook handler processes event**:
   - Retrieves subscription details from Stripe
   - Finds user in `vk_users` table via `auth_user_id`
   - Inserts record into `vk_premium_subscriptions` table
   - Updates `vk_users` premium status
6. **Stripe redirects to success URL** → `fairprep://subscription/success`
7. **App detects deep link** → WebView closes, subscription refreshes, user sees updated premium status

### Database Records Created

**vk_premium_subscriptions table:**
```sql
{
  user_id: uuid,
  subscription_tier: 'basic' | 'pro',
  price_aud: 20 | 40,
  duration_months: 6,
  start_date: timestamp,
  end_date: timestamp (6 months from start),
  payment_method: 'card',
  payment_transaction_id: Stripe payment intent ID,
  payment_status: 'completed',
  auto_renew: true
}
```

**vk_users table updates:**
```sql
{
  is_premium: true,
  premium_tier: 'basic' | 'pro',
  premium_expires_at: end_date,
  premium_auto_renew: true
}
```

---

## Troubleshooting

### Issue: Webhook not receiving events
- **Check Stripe Dashboard** → Webhooks → Recent deliveries for errors
- **Verify webhook URL** is correct: `https://xududbaqaaffcaejwuix.supabase.co/functions/v1/stripe-webhook`
- **Check Edge Function logs** in Supabase Dashboard → Edge Functions → stripe-webhook → Logs

### Issue: Subscription not appearing in database
- **Check webhook logs** for errors in `STRIPE-WEBHOOK` prefix
- **Verify user exists** in `vk_users` table with matching `auth_user_id`
- **Check metadata** in Stripe checkout session has `user_id` and `tier`

### Issue: Signature verification failed
- **Verify STRIPE_WEBHOOK_SECRET** is correctly set in Supabase secrets
- **Make sure secret matches** the one in Stripe Dashboard webhook endpoint
- **Redeploy function** after updating secret

### Issue: App doesn't redirect after payment
- **Check deep link configuration** in `app.json`: `fairprep://` scheme must be registered
- **Verify WebView** is detecting navigation changes to success/cancel URLs
- **Check browser console** in WebView for navigation logs

---

## Security Notes

- Webhook signature verification ensures events are genuinely from Stripe
- Service role key is used server-side only in Edge Functions
- User authentication not required for webhook (Stripe authenticates via signature)
- Metadata contains `user_id` to link payments to users securely

---

## Next Steps

After webhook is working:
1. Test complete payment flow end-to-end
2. Implement subscription renewal notifications (3 days before expiry)
3. Add customer portal integration for managing subscriptions
4. Set up email notifications for successful subscriptions
