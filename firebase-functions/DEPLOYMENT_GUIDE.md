# Firebase Function Deployment Guide (v2 Cloud Functions)

## ✨ What Changed?

This function now uses **Firebase Functions v2** with **Secret Manager** for secure credential storage. The old `functions.config()` approach is deprecated and has been removed.

---

## 🚀 Quick Deploy

### Option 1: Automated Script (Recommended)

```bash
cd firebase-functions
chmod +x DEPLOY.sh
./DEPLOY.sh
```

The script will:
1. Install dependencies
2. Prompt for Gmail credentials
3. Store them securely in Secret Manager
4. Deploy the function

### Option 2: Manual Deployment

```bash
cd firebase-functions

# Install dependencies
npm install

# Set Gmail credentials in Secret Manager
firebase functions:secrets:set EMAIL_USER
# Enter: studentkonnectnoreply@gmail.com

firebase functions:secrets:set EMAIL_PASS
# Enter: your-16-character-app-password

# Deploy with secrets
firebase deploy --only functions:Fairprep_email
```

---

## 📋 Prerequisites

### 1. Firebase CLI Installed

```bash
# Install globally
npm install -g firebase-tools

# Login
firebase login
```

**OR** use `npx` (no installation):

```bash
npx firebase-tools login
```

### 2. Gmail App Password

1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Select "Mail" as app type
4. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

---

## 🔐 Security Advantages (v2 with Secret Manager)

**Old Way (DEPRECATED):**
```bash
firebase functions:config:set email.user="..." email.pass="..."
```
❌ Runtime config is deprecated  
❌ Credentials stored in plain text  
❌ Not encrypted at rest

**New Way (v2 Secret Manager):**
```bash
firebase functions:secrets:set EMAIL_USER
firebase functions:secrets:set EMAIL_PASS
```
✅ Stored in Google Secret Manager  
✅ Encrypted at rest  
✅ Access controlled via IAM  
✅ Automatic rotation support  
✅ No deprecation warnings

---

## 🔧 After Deployment

### Update App Configuration

Add the function URL to your `.env` file:

```
EXPO_PUBLIC_FIREBASE_EMAIL_FUNCTION_URL=https://us-central1-studentkonnectcom.cloudfunctions.net/Fairprep_email
```

### Test the Function

1. Try signing up in the FairPrep app
2. Check your email inbox (and spam folder)
3. You should receive a professional verification email from `studentkonnectnoreply@gmail.com`

---

## 🛠 Troubleshooting

### "Secret not found" Error

Make sure secrets are set:
```bash
firebase functions:secrets:access EMAIL_USER
firebase functions:secrets:access EMAIL_PASS
```

### View Secret Values (Admin Only)

```bash
firebase functions:secrets:get EMAIL_USER
```

### Update Credentials

```bash
firebase functions:secrets:set EMAIL_USER
# Enter new email

firebase functions:secrets:set EMAIL_PASS
# Enter new password

firebase deploy --only functions:Fairprep_email
```

### View Function Logs

```bash
firebase functions:log --only Fairprep_email
```

Or in Firebase Console:  
https://console.firebase.google.com/u/0/project/studentkonnectcom/functions/logs

### "Invalid login" Error

- Verify you're using the **app password**, not your regular Gmail password
- Ensure **2-Step Verification** is enabled on the Google account
- Check that the app password is exactly 16 characters (no spaces)

---

## 📊 Cost & Billing

**Cloud Functions v2** pricing:
- **Invocations**: First 2 million/month free
- **Compute**: First 400,000 GB-seconds free
- **Secret Manager**: First 6 secret versions free

For FairPrep's email verification use case, you'll likely stay within the free tier.

---

## 🔄 Migration from v1 Config (If Applicable)

If you previously used `functions.config()`:

### 1. Export Old Config (Optional Backup)

```bash
firebase functions:config:get > old-config-backup.json
```

### 2. Migrate to Secret Manager

```bash
# Set new secrets
firebase functions:secrets:set EMAIL_USER
firebase functions:secrets:set EMAIL_PASS

# Deploy v2 function
firebase deploy --only functions:Fairprep_email

# Delete old config (optional cleanup)
firebase functions:config:unset email
```

---

## 📖 Additional Resources

- [Firebase Functions v2 Docs](https://firebase.google.com/docs/functions/2nd-gen)
- [Secret Manager Guide](https://firebase.google.com/docs/functions/config-env#secret-manager)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)

---

## ✅ Success Checklist

- [ ] Firebase CLI installed and authenticated
- [ ] Gmail app password generated (16 characters)
- [ ] Secrets set in Secret Manager (`EMAIL_USER`, `EMAIL_PASS`)
- [ ] Function deployed successfully
- [ ] `.env` file updated with function URL
- [ ] Test signup flow working
- [ ] Verification emails received

🎉 **Ready to send professional verification emails!**
