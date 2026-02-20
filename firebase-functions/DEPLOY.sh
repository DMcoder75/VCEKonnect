#!/bin/bash

# FairPrep Firebase Function Deployment Script (v2 with Secret Manager)
# This script deploys the Fairprep_email function using Firebase v2 API

echo "🚀 Deploying FairPrep Email Function (v2 Cloud Functions)..."
echo ""

# Navigate to functions directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo ""
echo "🔐 Setting Gmail SMTP credentials in Secret Manager..."
echo ""
echo "⚠️  IMPORTANT: You need your Gmail app password"
echo "   If you don't have one, get it from: https://myaccount.google.com/apppasswords"
echo ""
read -p "Enter Gmail address (studentkonnectnoreply@gmail.com): " gmail_user
read -sp "Enter Gmail app password (16 characters): " gmail_pass
echo ""

# Set secrets using Firebase Secret Manager (v2 API)
echo ""
echo "🔑 Storing credentials in Secret Manager..."
echo "$gmail_user" | firebase functions:secrets:set EMAIL_USER
echo "$gmail_pass" | firebase functions:secrets:set EMAIL_PASS

# Deploy function with secrets
echo ""
echo "🔥 Deploying to Firebase with Secret Manager..."
firebase deploy --only functions:Fairprep_email

# Get function URL
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Function URL:"
echo "https://us-central1-studentkonnectcom.cloudfunctions.net/Fairprep_email"
echo ""
echo "🔧 Next step: Add this to your .env file:"
echo "EXPO_PUBLIC_FIREBASE_EMAIL_FUNCTION_URL=https://us-central1-studentkonnectcom.cloudfunctions.net/Fairprep_email"
echo ""
echo "🔐 Your credentials are now securely stored in Google Secret Manager (not deprecated runtime config)"
