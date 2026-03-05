# Firebase + Supabase Integration Architecture

## Overview

FairPrep uses a **hybrid authentication system** that combines:
- **Supabase Edge Functions** - Authentication logic & database operations
- **Firebase Cloud Functions** - Email delivery via Gmail SMTP

## Why This Architecture?

✅ **Best of Both Worlds:**
- Supabase handles authentication, JWT tokens, and database RLS
- Firebase handles beautiful HTML email templates via Gmail SMTP
- Each system does what it does best

## System Components

### 1. Firebase Cloud Functions (Email Only)
**Location:** `firebase-functions/index.js`

**Function:** `Fairprep_email`

**Purpose:** Send verification emails with beautiful HTML templates

**Request Format:**
```json
{
  "email": "user@example.com",
  "code": "1234567",
  "purpose": "signup" | "password_reset",
  "name": "John Doe" (optional)
}
```

**Email Templates:**
- **Signup:** Welcome email with 7-digit code, gradient header, professional styling
- **Password Reset:** Security-focused email with warning box, reset instructions

---

### 2. Supabase Edge Functions (Authentication Logic)

#### Function: `auth-signup`
**Location:** `supabase/functions/auth-signup/index.ts`

**Flow:**
1. Validate email, password, name
2. Check if email already exists
3. Create user in `auth.users` (UNVERIFIED)
4. Trigger auto-creates `vk_users` profile
5. Generate 4-digit verification code (7-digit coming soon to match Firebase)
6. Store code in `vk_email_verifications` table
7. **Call Firebase Cloud Function** to send email
8. Return success response

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure123",
  "name": "John Doe",
  "yearLevel": 11,
  "stateId": "vic"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent to email",
  "requiresEmailVerification": true
}
```

---

#### Function: `auth-verify-email`
**Location:** `supabase/functions/auth-verify-email/index.ts`

**Flow:**
1. Verify code from `vk_email_verifications` table
2. Get `auth.users` entry by email
3. Update `auth.users.email_confirm = true`
4. Mark verification code as used
5. Return success message

**Request:**
```json
{
  "email": "user@example.com",
  "code": "1234567"
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "message": "Email verified successfully! Please log in.",
  "user": { ... }
}
```

---

#### Function: `auth-login`
**Location:** `supabase/functions/auth-login/index.ts`

**Flow:**
1. Validate email and password
2. Use Supabase Auth SDK to sign in
3. Return JWT tokens and user profile

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure123"
}
```

**Response:**
```json
{
  "success": true,
  "session": { ... },
  "user": { ... }
}
```

---

## Configuration Requirements

### Firebase (Already Deployed)
✅ **Function URL:** Set as `EXPO_PUBLIC_FIREBASE_EMAIL_FUNCTION_URL` in `.env`  
✅ **Secrets:** `EMAIL_USER` and `EMAIL_PASS` configured in Firebase Secret Manager  
✅ **Status:** Working perfectly, no changes needed

### Supabase (Needs Deployment)
⚠️ **Edge Functions:** Need to deploy `auth-signup`, `auth-verify-email`, `auth-login`  
⚠️ **Secret:** Need to set `FIREBASE_EMAIL_FUNCTION_URL` in Supabase secrets  
⚠️ **Database:** Need to apply `migration_to_supabase_auth.sql`

---

## Deployment Steps

### 1. Deploy Supabase Edge Functions

```bash
# Link to your external Supabase project
supabase link --project-ref xududbaqaaffcaejwuix

# Deploy auth functions
supabase functions deploy auth-signup
supabase functions deploy auth-verify-email
supabase functions deploy auth-login

# Set Firebase email function URL as secret
supabase secrets set FIREBASE_EMAIL_FUNCTION_URL=https://YOUR-FIREBASE-URL/Fairprep_email
```

### 2. Apply Database Migration

**Option A: Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select project (xududbaqaaffcaejwuix)
3. Click **SQL Editor**
4. Copy/paste `database/migration_to_supabase_auth.sql`
5. Click **Run**

**Option B: Supabase CLI**
```bash
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.xududbaqaaffcaejwuix.supabase.co:5432/postgres"
```

---

## Data Flow Example: Signup

```
User enters email/password in app
    ↓
App calls Supabase Edge Function: auth-signup
    ↓
Edge Function:
  1. Creates auth.users (unverified)
  2. Trigger creates vk_users profile
  3. Generates 7-digit code
  4. Stores code in vk_email_verifications
  5. Calls Firebase Cloud Function →
    ↓
Firebase Cloud Function:
  1. Formats beautiful HTML email
  2. Sends via Gmail SMTP
  3. Returns success
    ↓
Edge Function returns success to app
    ↓
User receives email with verification code
    ↓
User enters code in app
    ↓
App calls Supabase Edge Function: auth-verify-email
    ↓
Edge Function:
  1. Verifies code
  2. Updates auth.users.email_confirm = true
  3. Returns success
    ↓
User can now login with Supabase Auth
```

---

## Key Differences from Previous System

| Aspect | **OLD (bcrypt)** | **NEW (Supabase Auth + Firebase)** |
|--------|------------------|-------------------------------------|
| **Password Storage** | Client-side bcrypt hash | Supabase Auth server-side |
| **User Creation** | App → vk_users | Edge Function → auth.users → trigger → vk_users |
| **Session Management** | AsyncStorage (custom) | Supabase Auth JWT tokens |
| **Email Sending** | App → Firebase | Edge Function → Firebase |
| **Code Generation** | App (7-digit) | Edge Function (4-digit, to be 7-digit) |
| **RLS Security** | `USING (true)` ⚠️ vulnerable | `USING (auth.uid())` ✅ secure |

---

## Security Benefits

✅ **Server-Side Operations:** All sensitive logic runs on Edge Functions (server-side)  
✅ **Proper RLS:** Database enforces user data isolation with `auth.uid()`  
✅ **JWT Tokens:** Industry-standard session management  
✅ **No Client-Side Hashing:** Passwords never hashed on device  
✅ **Email Verification:** Prevents fake signups and verifies ownership

---

## Firebase Function Details

**Already Working ✅**

The Firebase Cloud Function (`Fairprep_email`) is **already deployed and working perfectly**. It:
- Uses Gmail SMTP with credentials stored in Firebase Secret Manager
- Sends beautiful HTML emails with gradient headers and professional styling
- Handles both signup and password reset emails
- Has proper error handling and validation

**No changes needed to Firebase!** It will continue to work exactly as before.

---

## Next Steps

1. ✅ Fixed `auth-signup` to call Firebase with correct payload
2. ✅ Removed redundant `send-verification-email` Edge Function
3. ⚠️ Deploy Edge Functions to external Supabase
4. ⚠️ Set `FIREBASE_EMAIL_FUNCTION_URL` secret in Supabase
5. ⚠️ Apply database migration
6. ⚠️ Update frontend to call new Edge Functions

---

## Contact

For questions about this architecture, contact the development team.

**Remember:** Firebase handles ONLY email delivery. Supabase handles everything else.
