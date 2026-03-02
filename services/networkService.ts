// Platform-aware network service entry point
// Export everything from native by default (works for iOS/Android)
// Web will override this with .web.ts extension
export {
  checkConnection,
  isOnline,
  onNetworkChange,
  requireNetwork,
} from './networkService.native';
