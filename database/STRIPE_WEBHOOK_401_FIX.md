# Fix: Stripe Webhook 401 "Missing authorization header" Error

## Problem
Stripe webhook failing with:
```json
{
  "code": 401,
  "message": "Missing authorization header"
}
```

## Root Cause
Supabase Edge Functions on your external instance (`https://xududbaqaaffcaejwuix.supabase.co`) are configured to require JWT authentication by default. Stripe webhooks don't send authorization headers - they use signature verification instead.

---

## Solution: Deploy Function with Anonymous Access

### Step 1: Redeploy with Correct Configuration

The webhook function MUST be publicly accessible (no JWT required). Deploy with these exact steps:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Make sure you're connected to the right project
supabase link --project-ref xududbaqaaffcaejwuix

# Deploy with --no-verify-jwt flag to allow anonymous access
supabase functions deploy stripe-webhook --no-verify-jwt

# Verify deployment
supabase functions list
```

#### Option B: Via Supabase Dashboard

1. **Go to Edge Functions**: https://supabase.com/dashboard/project/xududbaqaaffcaejwuix/functions
2. **Delete existing `stripe-webhook` function** (if it exists)
3. **Create new function**:
   - Name: `stripe-webhook`
   - **IMPORTANT**: Uncheck "Require authentication" or set to "Allow anonymous access"
4. **Upload/paste** the updated `stripe-webhook/index.ts` code
5. **Deploy**

### Step 2: Verify Function is Public

Test the endpoint without auth:

```bash
# Should return 405 Method Not Allowed (not 401)
curl -X GET https://xududbaqaaffcaejwuix.supabase.co/functions/v1/stripe-webhook

# OPTIONS request should work (CORS preflight)
curl -X OPTIONS https://xududbaqaaffcaejwuix.supabase.co/functions/v1/stripe-webhook \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: stripe-signature"
```

**Expected responses:**
- GET: `405 Method Not Allowed` (function only accepts POST)
- OPTIONS: `204 No Content` with CORS headers

**BAD response (means function still requires auth):**
- `401 Unauthorized` or `Missing authorization header`

### Step 3: Update Stripe Webhook (if needed)

Once function is public, test webhook delivery:

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/test/webhooks
2. **Click your webhook** (`elegant-brilliance`)
3. **Click "Send test webhook"**
4. **Select event**: `checkout.session.completed`
5. **Send test**

**Expected result:**
- ✅ Status: 200 OK
- ✅ Response: `{"received":true}`
- ✅ No 401 errors

---

## Alternative: Use Supabase Service Role Key (NOT Recommended)

If you absolutely cannot make the function public, you can configure Stripe to send a custom header, but this is complex and insecure. **Don't do this** - use the public deployment method above.

---

## Verify Fix is Working

### Test 1: Manual POST Request

```bash
curl -X POST https://xududbaqaaffcaejwuix.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{
    "id": "evt_test",
    "object": "event",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test",
        "metadata": {
          "user_id": "test-user-id",
          "tier": "basic"
        }
      }
    }
  }'
```

**Expected**: Function should process the request (might fail signature verification, but NOT return 401)

### Test 2: Stripe Test Webhook

1. Stripe Dashboard → Webhooks → Your webhook → Send test webhook
2. Select `checkout.session.completed`
3. Click Send

**Expected**: Delivery status = Success (200 OK)

### Test 3: Real Payment

1. Use test card `4242 4242 4242 4242` in your app
2. Complete checkout
3. Check Stripe webhook deliveries - should see successful delivery
4. Check `vk_premium_subscriptions` table - should have new record

---

## Common Issues

### Issue: Still getting 401 after redeployment

**Cause**: Function cached or not properly deployed as public

**Fix**:
1. Delete function completely from Supabase dashboard
2. Wait 1 minute
3. Redeploy with `--no-verify-jwt` flag
4. Clear any CDN/proxy caches

### Issue: "Webhook signature verification failed"

**Cause**: `STRIPE_WEBHOOK_SECRET` not set or incorrect

**Fix**:
1. Get signing secret from Stripe webhook details page
2. Add to Supabase: Dashboard → Project Settings → Edge Functions → Secrets
3. Key: `STRIPE_WEBHOOK_SECRET`
4. Value: `whsec_...` (from Stripe)
5. Redeploy function

### Issue: "User not found in vk_users table"

**Cause**: User's `auth_user_id` doesn't match metadata

**Fix**: Check that the user making the payment has a record in `vk_users` with `auth_user_id` matching the authenticated user

---

## Security Notes

**Q: Is it safe to make this function public?**

**A: YES** - This is the standard pattern for webhook handlers:
- Function doesn't expose sensitive data
- Stripe signature verification ensures requests are authentic
- No database reads without valid Stripe event
- Service role key used server-side only for writes

**Q: Can someone spam this endpoint?**

**A: No** - Invalid signatures are rejected immediately. Only genuine Stripe events with valid signatures are processed.

---

## Next Steps After Fix

Once webhook is working:

1. ✅ Test complete payment flow end-to-end
2. ✅ Verify subscription appears in database
3. ✅ Confirm user sees premium badge in app
4. Implement subscription renewal notifications
5. Set up customer portal for subscription management

---

## Quick Checklist

- [ ] Function deployed with `--no-verify-jwt` flag
- [ ] OPTIONS request returns 204 (not 401)
- [ ] POST request without auth doesn't return 401
- [ ] `STRIPE_WEBHOOK_SECRET` configured in Supabase
- [ ] Stripe test webhook sends successfully
- [ ] Real payment creates database record
- [ ] User sees premium status in app
