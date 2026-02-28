# iPhone 16 Plus Crash Debugging Guide

## Current Status
The app is still crashing on iPhone 16 Plus after disabling New Architecture.

## Applied Fixes
1. ✅ Disabled `newArchEnabled: false` in app.json
2. ✅ Added comprehensive null safety checks to Achievements page
3. ✅ Fixed state-specific terminology issues
4. ✅ Added error handling to all async hooks
5. ✅ Added cleanup functions to prevent state updates after unmount
6. ✅ Protected all Promise.all calls with try-catch

## Next Debugging Steps

### Step 1: Get Crash Logs
You need to provide the actual crash logs to identify the exact issue:

**On Mac with iPhone 16 Plus connected:**
```bash
# Clean rebuild
npx expo prebuild --clean
npx expo run:ios --device

# Watch logs in real-time
npx expo start --clear
```

**Or get device logs from Xcode:**
1. Open Xcode
2. Window → Devices and Simulators
3. Select your iPhone 16 Plus
4. Click "View Device Logs"
5. Look for crash reports with "FairPrep" in the name
6. Share the full crash log

### Step 2: Test on Different iOS Version
Try running the app on:
- iPhone 15 Pro (iOS 18)
- iPhone 14 Pro (iOS 17)
- iPhone 16 Plus Simulator (if available)

This will help determine if it's:
- Device-specific (iPhone 16 Plus hardware)
- iOS 18-specific
- Expo/React Native version incompatibility

### Step 3: Check for Memory Issues
iPhone 16 Plus might be running out of memory if:
- Too many large images loaded
- Memory leaks in timers or subscriptions

**Test by:**
1. Commenting out image imports temporarily
2. Reducing the number of simultaneous database queries
3. Checking Xcode Memory Graph Debugger

### Step 4: Isolate the Crash
**Which screen crashes?**
- Login screen?
- Dashboard after login?
- Specific tab (ATAR, Study, Notes, etc.)?
- Achievements page?
- Goals page?

**When does it crash?**
- On app launch?
- After login?
- When navigating to a specific screen?
- When interacting with a specific feature?

### Step 5: Common iOS 18 Issues

**Possible causes:**
1. **Safe Area Insets** - iPhone 16 Plus has different dimensions
   - Check if any hardcoded values assume smaller screens
   - Verify `useSafeAreaInsets()` is used correctly

2. **Async Storage** - iOS 18 might have stricter security
   - Check if Supabase client initialization is failing
   - Verify environment variables are loaded

3. **Navigation** - Expo Router might have iOS 18 bugs
   - Test with minimal navigation first
   - Check if specific routes crash

4. **Database Queries** - RPC functions might timeout
   - Add timeout handling to Supabase queries
   - Check network connectivity

## Temporary Workaround

**Create a minimal test build to isolate the issue:**

1. **Comment out all database calls temporarily:**
   ```typescript
   // In contexts/AuthContext.tsx
   // Comment out Supabase initialization
   // Use mock user data
   ```

2. **Disable all async data loading:**
   ```typescript
   // In all pages, comment out useEffect data loading
   // Show static UI only
   ```

3. **Test navigation only:**
   - Can you navigate between tabs?
   - Can you open/close drawers?
   - Can you navigate to settings?

## What I Need From You

Please provide:
1. **Exact crash location** - Which screen/action causes the crash?
2. **Crash logs** - From Xcode or `npx expo start` console output
3. **Test results** - Does it crash on other iOS devices/simulators?
4. **Console warnings** - Any warnings before the crash?

## Quick Test Commands

```bash
# Clean everything and rebuild
rm -rf node_modules ios android .expo
npm install
npx expo prebuild --clean
npx expo run:ios --device

# If it crashes on launch, try development client
npx expo start --dev-client --clear

# Test on simulator first
npx expo run:ios
```

## Possible Solutions Based on Crash Type

### If crash shows "RCTFatalException"
- React Native bridge issue
- Likely a native module incompatibility
- Check Expo SDK version compatibility

### If crash shows "EXC_BAD_ACCESS"
- Memory access violation
- Likely accessing deallocated object
- Check for retain cycles or memory leaks

### If crash shows "SIGABRT"
- Assertion failure
- Likely a runtime check failed
- Check console logs for assertion messages

### If crash shows "SIGSEGV"
- Segmentation fault
- Likely null pointer dereference
- Check for undefined object access

## Emergency Downgrade Path

If nothing works, try downgrading critical dependencies:
```bash
npm install expo@~50.0.0
npm install react-native@0.73.6
npx expo install --fix
npx expo prebuild --clean
```

---

**Without the actual crash logs, I cannot pinpoint the exact issue. Please run the debug commands above and share the results.**
