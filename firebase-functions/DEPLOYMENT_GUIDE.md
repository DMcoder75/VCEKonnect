# Firebase Function Deployment Guide for FairPrep Email

## 🚨 SECURITY WARNING

**The service account credentials you shared are now PUBLIC. You MUST rotate them immediately after deployment:**

1. Go to: https://console.firebase.google.com/u/0/project/studentkonnectcom/settings/serviceaccounts/adminsdk
2. Delete the current service account key
3. Generate a new one
4. Never share credentials in chat/public channels again

---

## Prerequisites

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

---

## Setup Gmail SMTP (Recommended)

### Option A: Gmail App Password (Recommended)

1. Go to your Google Account: https://myaccount.google.com/security
2. Enable 2-Step Verification (required for app passwords)
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Generate a new app password for "Mail"
5. Copy the 16-character password (no spaces)

### Option B: SendGrid (Alternative)

If you prefer SendGrid instead of Gmail:
1. Sign up at https://sendgrid.com
2. Get your API key
3. Modify `index.js` to use SendGrid transport

---

## Deployment Steps

### 1. Navigate to functions directory
```bash
cd firebase-functions
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set environment variables (Gmail credentials)

**IMPORTANT**: Replace with your actual Gmail and app password:

```bash
firebase functions:config:set email.user="your-email@gmail.com" email.pass="your-16-char-app-password"
```

Example:
```bash
firebase functions:config:set email.user="fairprep@dalsi.academy" email.pass="abcd efgh ijkl mnop"
```

### 4. Deploy the function
```bash
firebase deploy --only functions:Fairprep_email
```

### 5. Get the function URL

After deployment, Firebase will show the function URL:
```
https://us-central1-studentkonnectcom.cloudfunctions.net/Fairprep_email
```

**Copy this URL** - you'll need it for the app configuration.

---

## Update App Configuration

After deployment, update the Firebase function URL in your app:

1. Open `.env` file
2. Add:
```
EXPO_PUBLIC_FIREBASE_EMAIL_FUNCTION_URL=https://us-central1-studentkonnectcom.cloudfunctions.net/Fairprep_email
```

The app will automatically use this URL to send emails.

---

## Testing

Test the function manually using curl:

```bash
curl -X POST https://us-central1-studentkonnectcom.cloudfunctions.net/Fairprep_email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "1234567",
    "purpose": "signup",
    "name": "Test User"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

---

## Monitoring & Logs

View function logs:
```bash
firebase functions:log
```

Or in Firebase Console:
https://console.firebase.google.com/u/0/project/studentkonnectcom/functions/logs

---

## Troubleshooting

### Error: "Invalid login"
- Check that you're using an app password, not your regular Gmail password
- Ensure 2-Step Verification is enabled on your Google account

### Error: "Configuration not found"
- Run `firebase functions:config:get` to verify config is set
- Re-run the `firebase functions:config:set` command

### Function not deploying
- Check Node.js version: `node --version` (should be 18.x)
- Check Firebase CLI: `firebase --version`
- Try: `firebase deploy --only functions --force`

---

## Cost Estimate

Firebase Cloud Functions pricing:
- First 2 million invocations/month: **FREE**
- After that: $0.40 per million

For email verification, even with 10,000 signups/month, you'll stay within the free tier.

---

## Next Steps After Deployment

1. ✅ Rotate service account credentials (CRITICAL)
2. ✅ Test with real email address
3. ✅ Update app `.env` with function URL
4. ✅ Test signup flow in app
5. ✅ Monitor logs for first few days

---

## Support

If you encounter issues:
- Check Firebase Console logs
- Verify Gmail app password is correct
- Ensure environment variables are set correctly
- Test function directly with curl before testing in app
