# Quick Deployment Instructions

## Step 1: Get Gmail App Password (if not already done)

1. Go to: https://myaccount.google.com/apppasswords
2. Create app password for "Mail"
3. Copy the 16-character password

## Step 2: Deploy the Function

### Option A: Using the Deploy Script (Recommended)

```bash
cd firebase-functions
chmod +x DEPLOY.sh
./DEPLOY.sh
```

When prompted, replace `YOUR_GMAIL_APP_PASSWORD_HERE` with your actual app password.

### Option B: Manual Deployment

```bash
cd firebase-functions

# Install dependencies
npm install

# Set Gmail credentials (replace with your app password)
firebase functions:config:set email.user="studentkonnectnoreply@gmail.com" email.pass="your-16-char-app-password"

# Deploy
firebase deploy --only functions:Fairprep_email
```

## Step 3: Update App Configuration

After deployment, add to your `.env` file:

```
EXPO_PUBLIC_FIREBASE_EMAIL_FUNCTION_URL=https://us-central1-studentkonnectcom.cloudfunctions.net/Fairprep_email
```

## Step 4: Test

Test signup in your app - users should receive emails from studentkonnectnoreply@gmail.com

---

## Troubleshooting

**"Configuration not found"**
- Run: `firebase functions:config:get` to verify config is set
- Re-run the config:set command

**"Invalid login"**
- Ensure you're using the app password, not your regular Gmail password
- Verify 2-Step Verification is enabled on the Google account

**View logs:**
```bash
firebase functions:log
```

Or: https://console.firebase.google.com/u/0/project/studentkonnectcom/functions/logs
