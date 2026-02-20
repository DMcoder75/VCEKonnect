# Quick Deployment Instructions (v2 Cloud Functions)

## Prerequisites

1. **Firebase CLI** installed:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Gmail App Password** (16 characters):
   - Get it from: https://myaccount.google.com/apppasswords

---

## Deploy Steps

### Option A: Using the Deploy Script (Recommended)

```bash
cd firebase-functions
chmod +x DEPLOY.sh
./DEPLOY.sh
```

### Option B: Manual Deployment

```bash
cd firebase-functions

# Install dependencies
npm install

# Set Gmail credentials in Secret Manager (v2 API)
firebase functions:secrets:set EMAIL_USER
# When prompted, enter: studentkonnectnoreply@gmail.com

firebase functions:secrets:set EMAIL_PASS
# When prompted, enter: your-16-character-app-password

# Deploy with secrets
firebase deploy --only functions:Fairprep_email
```

---

## Update App Configuration

After deployment, add to your `.env` file:

```
EXPO_PUBLIC_FIREBASE_EMAIL_FUNCTION_URL=https://us-central1-studentkonnectcom.cloudfunctions.net/Fairprep_email
```

---

## Test

Test signup in your app - users should receive emails from `studentkonnectnoreply@gmail.com`

---

## Troubleshooting

**View secrets:**
```bash
firebase functions:secrets:access EMAIL_USER
firebase functions:secrets:access EMAIL_PASS
```

**Update credentials:**
```bash
firebase functions:secrets:set EMAIL_USER
firebase functions:secrets:set EMAIL_PASS
firebase deploy --only functions:Fairprep_email
```

**View logs:**
```bash
firebase functions:log --only Fairprep_email
```

Or: https://console.firebase.google.com/u/0/project/studentkonnectcom/functions/logs

---

## What's Different (v2 vs v1)?

**Old (v1, DEPRECATED):**
```bash
firebase functions:config:set email.user="..." email.pass="..."
```

**New (v2, SECURE):**
```bash
firebase functions:secrets:set EMAIL_USER
firebase functions:secrets:set EMAIL_PASS
```

✅ **Benefits**: Encrypted storage, IAM access control, no deprecation warnings
