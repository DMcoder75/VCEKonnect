# Migration Guide: Custom Auth → Supabase Auth

## Overview

This migration moves FairPrep from custom bcryptjs authentication to Supabase Auth while maintaining the custom Firebase email verification flow.

## Benefits

✅ **Security**: Industry-standard authentication with proper RLS policies using `auth.uid()`  
✅ **Cost**: Free tier includes 50,000 monthly active users  
✅ **Features**: Built-in session management, OAuth support, password reset  
✅ **Maintenance**: Less code to maintain, automatic security patches  

---

## Migration Steps

### Phase 1: Database Migration (Run SQL Scripts)

**Execute on External Supabase:**

```bash
# 1. Apply migration SQL
psql $SUPABASE_DB_URL -f database/migration_to_supabase_auth.sql
```

**What this does:**
- Adds `auth_user_id` column to `vk_users` table
- Creates trigger to sync auth.users → vk_users
- Updates ALL RLS policies to use `auth.uid()`
- Locks down tables (no more `USING (true)`)

### Phase 2: Deploy Edge Functions

**Deploy new auth functions:**

```bash
# Deploy signup function
supabase functions deploy auth-signup

# Deploy email verification function
supabase functions deploy auth-verify-email

# Deploy login function (optional, client SDK can handle this)
supabase functions deploy auth-login
```

**Configure secrets:**

```bash
# Set Firebase email function URL
supabase secrets set FIREBASE_EMAIL_FUNCTION_URL=https://us-central1-studentkonnectcom.cloudfunctions.net/Fairprep_email
```

### Phase 3: Update Frontend Code

The new `authService.ts` has already been created with:
- `registerUser()` - sends verification email
- `verifyEmail()` - creates auth.users after code verification
- `loginUser()` - uses Supabase Auth JWT
- `getCurrentUser()` - reads from auth session
- `updateUserProfile()` - respects RLS policies

**No changes needed to:**
- `AuthContext.tsx` - works with new authService
- UI components - authentication flow unchanged
- Other services - RLS handles permissions

### Phase 4: Test Migration

**New User Signup Flow:**

1. User registers → Edge Function creates verification code
2. Email sent via Firebase
3. User enters 4-digit code
4. Edge Function creates `auth.users` entry (email verified)
5. Trigger auto-creates `vk_users` profile
6. User logged in with Supabase JWT

**Existing User Login:**

⚠️ **Existing users CANNOT login yet** - they need to be migrated first.

---

## Migrating Existing Users

### Option A: One-Time Password Reset (Recommended)

**Force all existing users to reset password:**

1. Send email to all users: "We've upgraded our security. Please reset your password."
2. User clicks "Forgot Password" in app
3. Edge Function creates `auth.users` with their email
4. User sets new password
5. `auth.users` ← → `vk_users` linked automatically

### Option B: Gradual Migration on Login

**Create Edge Function to migrate on first login:**

```typescript
// Pseudocode for migration function
async function migrateUserOnLogin(email, password) {
  // 1. Check if user exists in vk_users but NOT in auth.users
  const vkUser = await getVkUser(email);
  const authUser = await getAuthUser(email);
  
  if (vkUser && !authUser) {
    // 2. Verify password against bcrypt hash in vk_users
    const validPassword = await bcrypt.compare(password, vkUser.password_hash);
    
    if (validPassword) {
      // 3. Create auth.users entry
      await supabase.auth.admin.createUser({
        email,
        password, // Supabase will re-hash
        email_confirm: true,
        user_metadata: {
          name: vkUser.name,
          year_level: vkUser.year_level,
          state_id: vkUser.state_id,
        }
      });
      
      // 4. Link vk_users.auth_user_id
      await linkVkUserToAuth(vkUser.id, authUser.id);
      
      // 5. Sign in with new Supabase Auth
      return supabase.auth.signInWithPassword({ email, password });
    }
  }
}
```

### Option C: Bulk Migration Script

**For production with many existing users:**

```sql
-- Create migration script that:
-- 1. Reads all vk_users without auth_user_id
-- 2. For each user, create auth.users entry
-- 3. Link auth_user_id back to vk_users
-- 4. Send email: "Your password has been reset for security. Please set a new password."
```

---

## Testing Checklist

### New User Flow
- [ ] Register new account
- [ ] Receive verification email (4-digit code)
- [ ] Enter code in app
- [ ] Account created in `auth.users`
- [ ] Profile created in `vk_users`
- [ ] Can log in immediately after verification
- [ ] JWT token stored in app
- [ ] User can access all features

### RLS Policy Tests
- [ ] User can only see their own data in `vk_users`
- [ ] User can only update their own profile
- [ ] User CANNOT update `is_premium` or `premium_tier` directly
- [ ] User can only access their own notes, scores, sessions
- [ ] Anonymous users CANNOT access any user data
- [ ] Test with different users to ensure data isolation

### Security Tests
- [ ] Try to access another user's data → Should fail
- [ ] Try to update premium status directly → Should fail
- [ ] Try to delete account directly → Should fail
- [ ] Verify JWT expiration and refresh works
- [ ] Test logout clears session

---

## Rollback Plan

If migration fails, rollback steps:

1. **Revert RLS policies:**
```sql
-- Drop new policies
DROP POLICY "Users can view own profile" ON vk_users;
DROP POLICY "Users can update own profile" ON vk_users;
-- ... (drop all new policies)

-- Restore old policies
CREATE POLICY "Allow anon access to users" ON vk_users FOR ALL USING (true);
-- ... (restore all old policies)
```

2. **Remove auth_user_id column:**
```sql
ALTER TABLE vk_users DROP COLUMN auth_user_id;
```

3. **Revert authService.ts to custom bcryptjs version** (backup from git)

4. **Undeploy Edge Functions:**
```bash
supabase functions delete auth-signup
supabase functions delete auth-verify-email
supabase functions delete auth-login
```

---

## Post-Migration Tasks

### Deprecate Old Code

After successful migration, remove:
- [ ] `authService.native.ts` (old bcryptjs version)
- [ ] `authService.web.ts` (old bcryptjs version)
- [ ] `bcryptjs` dependency from package.json
- [ ] Custom password hashing logic
- [ ] Old email verification logic (if any)

### Monitor

- [ ] Track auth.users creation rate
- [ ] Monitor failed login attempts
- [ ] Check RLS policy performance
- [ ] Verify email delivery success rate

---

## Support Resources

**Supabase Auth Docs:**
- [Auth Guide](https://supabase.com/docs/guides/auth)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions](https://supabase.com/docs/guides/functions)

**Firebase Email Functions:**
- Existing setup at: `firebase-functions/`
- No changes needed to email sending logic

**Questions?**
- Review this guide
- Check Supabase Dashboard → Authentication
- Test in development before production deploy

---

## Summary

**Before Migration:**
- Custom bcryptjs authentication
- Direct database access with `USING (true)` policies
- Security vulnerabilities

**After Migration:**
- Supabase Auth with JWT tokens
- Proper RLS policies with `auth.uid()`
- Production-ready security
- OAuth support (future)
- Free tier for 50,000 users

**Effort:** 2-3 hours (database + testing)  
**Risk:** Medium (affects all users, requires testing)  
**Recommendation:** Test thoroughly in development, then deploy to production with user communication

🚀 Ready to migrate? Start with Phase 1!
