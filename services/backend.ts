import { config } from '@/constants/config';

import type { Backend } from './backend.types';
import { demoBackend } from './demo/demoBackend';
import { httpBackend } from './httpBackend';

/**
 * Resolves the backend for the current configuration.
 *
 * There is exactly one switch in the app between real and demo data, and it is driven
 * purely by whether `EXPO_PUBLIC_API_BASE_URL` is set. No screen decides this for itself.
 */
export function getBackend(): Backend {
  return config.isDemoMode ? demoBackend : httpBackend;
}

export const isDemo = () => getBackend().kind === 'demo';
