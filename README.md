# VCE Konnect - ATAR Tracking App for Victorian Students

A comprehensive React Native mobile app for Victorian Certificate of Education (VCE) students to track progress, predict ATAR, manage study time, take notes, and plan university pathways.

## Features

### ✅ Completed Features
- **User Authentication** - Custom authentication with email/password (no Supabase auth.users)
- **ATAR Predictor** - Real 2024 VTAC scaling formulas with official subject scaling data
- **Study Time Tracker** - Per-subject timers with daily/weekly analytics
- **Notes & Progress Journal** - Subject-based notes with searchable content
- **Career & Uni Pathway Planner** - Course suggestions based on predicted ATAR
- **Dashboard & Analytics** - Real-time ATAR prediction, study time graphs
- **Complete VCE Subjects List** - All 80+ subjects from 2024 VCE scaling report

### 📊 Database Schema (vk_ prefix)
- `vk_users` - User profiles (custom auth, no auth.users dependency)
- `vk_subject_scores` - SAC averages and exam predictions per subject
- `vk_study_sessions` - Study timer session logs
- `vk_notes` - Study notes with tags and timestamps
- `vk_vce_subjects` - Reference table with 2024 scaling data

## Tech Stack
- **Frontend:** React Native, Expo, TypeScript, Expo Router
- **Backend:** External Supabase (xududbaqaaffcaejwuix.supabase.co)
- **Database:** PostgreSQL with Row Level Security (RLS)
- **State:** React Hooks with real-time backend sync
- **Design:** Dark mode, VCE-specific UI, Australian English

## External Supabase Connection
This project uses an external Supabase instance:
- **URL:** https://xududbaqaaffcaejwuix.supabase.co
- **Database:** Custom vk_* tables with RLS policies
- **Auth:** Custom table-based auth (not Supabase Auth)

## 2024 VCE Subjects Included
Complete list from official 2024 VTAC scaling report:

### English (Mandatory)
- English (EN) - Mean: 28.2
- English as Additional Language (EF) - Mean: 27.7
- English Language (EG) - Mean: 32.6
- Literature (L) - Mean: 31.2

### Mathematics
- Foundation Mathematics (MA10) - Mean: 21.3
- General Mathematics (NF) - Mean: 27.8
- Mathematical Methods (NJ) - Mean: 34.5
- Specialist Mathematics (NS) - Mean: 41.6

### Sciences
- Biology (BI) - Mean: 30.4
- Chemistry (CH) - Mean: 33.7
- Physics (PH) - Mean: 32.2
- Psychology (PY) - Mean: 28.4
- Environmental Science (EV) - Mean: 28.0

### Humanities (15+ subjects)
Accounting, Business Management, Economics, Geography, History (Ancient/Australian/Revolutions), Legal Studies, Philosophy, Politics, Sociology, Health & Human Development, Classical Studies, Religion and Society

### Arts
Art Creative Practice, Dance, Drama, Media, Music (Composition/Performance/Inquiry)

### Technology
Algorithmics, Applied Computing (Data Analytics/Software Dev), Product Design

### Languages (25+ languages)
Arabic, Auslan, Chinese (First/Second/Advanced), French, German, Greek, Indonesian, Italian, Japanese, Korean, Spanish, Vietnamese, and more

### Other
Agricultural Studies, Food Studies, Physical Education, Outdoor Studies, Extended Investigation

## ATAR Calculation Method
Uses official 2024 VTAC formulas:
1. **Scaled Study Scores** - Subject-specific scaling using 2024 mean/std deviation
2. **Aggregate Calculation** - English + Best 3 + 10% of 5th/6th subjects
3. **ATAR Conversion** - Official 2024 aggregate-to-ATAR lookup table
4. **Scenarios** - Best case (+10% exams) and worst case (-10% exams)

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator
- Access to external Supabase instance

### Installation
```bash
npm install
```

### Required Dependencies
The project auto-installs these via depcheck:
- `@supabase/supabase-js` - Database client
- `@react-native-async-storage/async-storage` - Session storage
- `react-native-bcrypt` - Password hashing
- Other Expo and React Native core packages

### Running the App
```bash
# Start development server
npx expo start

# iOS
npx expo start --ios

# Android
npx expo start --android

# Web (limited support)
npx expo start --web
```

## Database Setup

All database tables have been created with the SQL script in the development logs. Tables use `vk_` prefix and include:
- RLS policies for user data isolation
- Indexes for performance
- Triggers for `updated_at` timestamps
- Custom set_config function for RLS context

## Authentication Flow
1. User signs up → hashed password stored in vk_users
2. Login → password verification → session stored in AsyncStorage
3. RLS policies use app.user_id context (set via set_config function)
4. No dependency on Supabase auth.users table

## Future Enhancements (Not in V1.0)
- [ ] SAC Calendar with reminders
- [ ] Weekly study goals and progress bars
- [ ] CSV export for study logs
- [ ] Subject performance comparison charts
- [ ] Real Stripe payment integration (currently mocked)
- [ ] Push notifications for study reminders
- [ ] Community features (anonymized ATAR sharing)
- [ ] Offline mode with sync

## Known Limitations
- Premium features are mocked (no real Stripe integration in V1.0)
- ATAR predictions are approximations (not official VTAC results)
- Google OAuth not implemented in V1.0
- Requires internet connection (no offline mode)

## Support
For issues or questions, contact the development team.

## License
Proprietary - All rights reserved
