import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export type NetworkStatus = {
  /** False only when we are certain there is no usable connection. */
  isOnline: boolean;
  /** True until the first reading arrives, so nothing flashes "offline" on launch. */
  isPending: boolean;
};

/**
 * Connectivity, used to show the offline banner and to keep already-loaded static
 * content visible instead of replacing it with an error.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({ isOnline: true, isPending: true });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable = state.isInternetReachable;
      setStatus({
        isOnline: Boolean(state.isConnected) && reachable !== false,
        isPending: false,
      });
    });
    return unsubscribe;
  }, []);

  return status;
}
