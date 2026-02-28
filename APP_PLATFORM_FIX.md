# iPhone 16 Plus "Failed to Launch App" Error

## Issue
The app is crashing on iPhone 16 Plus with "failed to launch app" error.

## Potential Causes & Solutions

### 1. **React Native New Architecture (Most Likely)**
The app.json has `"newArchEnabled": true` which enables the New Architecture (Fabric + TurboModules).

**Solution:**
Try disabling it temporarily to see if the crash stops:
```json
{
  "expo": {
    "newArchEnabled": false
  }
}
```

### 2. **Edge-to-Edge Android Setting**
The `edgeToEdgeEnabled` is set only for Android, which is fine, but iPhone 16 Plus has different safe area handling.

**Check:**
- Ensure all screens use `useSafeAreaInsets()` properly
- Verify no hardcoded top/bottom padding that might conflict with iPhone 16 Plus notch

### 3. **Large Device Dimensions**
iPhone 16 Plus has specific dimensions that might cause layout issues if using `useWindowDimensions()` incorrectly.

**Check app code for:**
- Any divide-by-zero errors in dimension calculations
- Layout constraints that assume smaller screens

### 4. **iOS Build Settings**
The app might be missing required iOS configuration.

**Required Actions:**
1. Run `npx expo prebuild --clean` to regenerate native folders
2. Check Info.plist for required permissions
3. Verify deployment target matches iPhone 16 Plus iOS version

### 5. **Memory Issues**
iPhone 16 Plus might be running out of memory if:
- Too many images loaded without optimization
- Memory leaks in timers or subscriptions

**Check:**
- All `useEffect` cleanup functions
- All timer clearances
- Image sizes and formats

## Testing Steps

1. **Check Expo Logs:**
   ```bash
   npx expo start
   ```
   Look for crash logs in terminal

2. **Test on Different iOS Versions:**
   Try on iPhone 15 Pro or iPhone 14 to isolate if it's device-specific

3. **Build in Development Mode:**
   ```bash
   npx expo run:ios --device
   ```
   This shows detailed crash logs

4. **Check Supabase Connection:**
   The app connects to external Supabase. Verify:
   - No network timeout causing crashes
   - No RLS policy blocking anonymous access

## Recommended Fix Order

1. ✅ Disable New Architecture first
2. ✅ Clean rebuild: `npx expo prebuild --clean`
3. ✅ Test on device
4. ✅ Check logs for specific error
5. ✅ If still fails, check dimension/layout code

## Note for User
Since I cannot access the actual device logs or build the app, you'll need to:
1. Try disabling `newArchEnabled` in app.json
2. Run `npx expo prebuild --clean`
3. Share any error logs from Xcode or Expo CLI
4. Test on other iOS devices to confirm if it's iPhone 16 Plus specific

The most likely culprit is the New Architecture compatibility with React Native libraries in your project.
