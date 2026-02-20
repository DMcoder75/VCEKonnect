#!/bin/bash

# FairPrep Firebase Function Deployment Script
# This script deploys the Fairprep_email function to Firebase

echo "🚀 Deploying FairPrep Email Function..."
echo ""

# Navigate to functions directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Set Gmail SMTP credentials
echo "📧 Setting Gmail SMTP credentials..."
firebase functions:config:set email.user="studentkonnectnoreply@gmail.com" email.pass="YOUR_GMAIL_APP_PASSWORD_HERE"

echo ""
echo "⚠️  IMPORTANT: Replace 'YOUR_GMAIL_APP_PASSWORD_HERE' with your actual Gmail app password"
echo "   If you don't have one, get it from: https://myaccount.google.com/apppasswords"
echo ""
read -p "Press Enter to continue with deployment (or Ctrl+C to cancel)..."

# Deploy function
echo ""
echo "🔥 Deploying to Firebase..."
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
