# Payment Redirect Functions Documentation

## Overview

The `payment-success` and `payment-cancel` Edge Functions provide fallback/alternative payment redirect handlers for Stripe checkout. These complement the existing WebView deep linking implementation.

---

## How They Work

### Current Implementation (Primary)
1. User completes checkout in WebView
2. Stripe redirects to deep link: `fairprep://subscription/success?tier=basic`
3. WebView detects navigation change
4. App closes modal and refreshes subscription

### Fallback Implementation (These Functions)
1. User completes checkout
2. Stripe redirects to: `https://xududbaqaaffcaejwuix.supabase.co/functions/v1/payment-success?tier=basic`
3. Function displays success page with:
   - Visual confirmation
   - Auto-redirect to deep link after 3 seconds
   - Manual "Return to App" button
4. Deep link opens app and triggers subscription refresh

---

## Deployment

### 1. Deploy Functions

Deploy both functions to your external Supabase instance:

```bash
# Using Supabase CLI
supabase functions deploy payment-success
supabase functions deploy payment-cancel

# Or via Supabase Dashboard:
# 1. Go to https://supabase.com/dashboard/project/xududbaqaaffcaejwuix
# 2. Navigate to Edge Functions
# 3. Deploy payment-success and payment-cancel
```

### 2. Update Stripe Checkout URLs (Optional)

If you want to use these functions as primary handlers instead of direct deep linking, update `create-checkout` Edge Function:

**Current (Direct Deep Link):**
```typescript
success_url: `fairprep://subscription/success?tier=${tier}`,
cancel_url: `fairprep://subscription/cancel`,
```

**Alternative (Via Functions):**
```typescript
success_url: `https://xududbaqaaffcaejwuix.supabase.co/functions/v1/payment-success?tier=${tier}`,
cancel_url: `https://xududbaqaaffcaejwuix.supabase.co/functions/v1/payment-cancel`,
```

---

## When to Use Which Approach

### Direct Deep Linking (Current Default)
✅ **Pros:**
- Faster - no intermediate page
- Seamless user experience
- Works well in WebView
- Fewer server requests

❌ **Cons:**
- Less visual feedback
- No server-side logging of redirect
- Relies on WebView navigation detection

### Function-Based Redirects (These Functions)
✅ **Pros:**
- Visual confirmation page
- Server-side logging
- Fallback if deep linking fails
- Better debugging (can see redirect in browser)
- Works if user opens checkout in external browser

❌ **Cons:**
- Extra step for user
- Slightly slower
- More complex flow

---

## Recommended Configuration

**Best of Both Worlds:**
1. Keep direct deep linking as primary (current setup)
2. Deploy these functions as **backups**
3. Use these functions if:
   - WebView deep linking fails on some devices
   - Users request to open checkout in external browser
   - You need server-side logging of payment redirects

---

## Function URLs

After deployment, your functions will be available at:

**Success:**
```
https://xududbaqaaffcaejwuix.supabase.co/functions/v1/payment-success?tier=basic
https://xududbaqaaffcaejwuix.supabase.co/functions/v1/payment-success?tier=pro
```

**Cancel:**
```
https://xududbaqaaffcaejwuix.supabase.co/functions/v1/payment-cancel
```

---

## Testing

### Test Success Flow
1. Navigate to:
   ```
   https://xududbaqaaffcaejwuix.supabase.co/functions/v1/payment-success?tier=basic
   ```
2. Should see success page
3. Should auto-redirect to `fairprep://subscription/success?tier=basic` after 3 seconds

### Test Cancel Flow
1. Navigate to:
   ```
   https://xududbaqaaffcaejwuix.supabase.co/functions/v1/payment-cancel
   ```
2. Should see cancel page
3. Should auto-redirect to `fairprep://subscription/cancel` after 3 seconds

---

## Edge Function Logs

Both functions log all redirects:

**Success Logs:**
```
[PAYMENT-SUCCESS] Payment success handler started
[PAYMENT-SUCCESS] Success parameters - {"tier":"basic","sessionId":"cs_test_..."}
[PAYMENT-SUCCESS] Returning success page with auto-redirect
```

**Cancel Logs:**
```
[PAYMENT-CANCEL] Payment cancel handler started
[PAYMENT-CANCEL] Cancel parameters - {"sessionId":"cs_test_..."}
[PAYMENT-CANCEL] Returning cancel page with auto-redirect
```

Check logs in: Supabase Dashboard → Edge Functions → [Function Name] → Logs

---

## Security Notes

- Functions are stateless (no authentication required)
- No sensitive data processed
- No database writes (handled by `stripe-webhook`)
- CORS enabled for web compatibility
- Auto-redirect uses deep links (verified by app)

---

## Maintenance

These functions require minimal maintenance:
- No secrets required
- No database connections
- No Stripe API calls
- Pure redirect/display logic

Update only if:
- Deep link scheme changes
- UI/branding needs updating
- Additional logging needed
