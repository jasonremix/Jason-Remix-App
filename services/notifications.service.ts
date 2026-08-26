import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

import { getBackend } from './backend';

/**
 * Push notifications.
 *
 * Opt-in only: nothing is registered until the member turns notifications on, and
 * turning them off both clears the server preference and stops the token being used.
 */

export type PushPermission = 'granted' | 'denied' | 'undetermined';

export const notificationsService = {
  async getPermission(): Promise<PushPermission> {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  },

  /**
   * Asks for permission and registers the resulting token. Returns the permission state
   * so the caller can explain what happened rather than silently doing nothing.
   */
  async enable(): Promise<PushPermission> {
    if (!Device.isDevice) {
      // Simulators cannot receive push; say so instead of registering a useless token.
      throw new AppError('BAD_REQUEST', 'Push-Benachrichtigungen brauchen ein echtes Gerät.');
    }

    const existing = await Notifications.getPermissionsAsync();
    const status =
      existing.status === 'granted'
        ? existing
        : await Notifications.requestPermissionsAsync();

    if (status.status !== 'granted') {
      return status.status === 'denied' ? 'denied' : 'undetermined';
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Jason Remix',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#001EC8',
        sound: null,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    try {
      const token = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      await getBackend().registerPushToken({ token: token.data, platform: Platform.OS });
      await getBackend().setPushEnabled(true);
      return 'granted';
    } catch {
      // Meist fehlt schlicht die EAS-Projekt-ID — ohne sie gibt es kein Push-Token.
      logger.warn('push token registration failed');
      throw new AppError(
        'SERVER_ERROR',
        'Benachrichtigungen lassen sich gerade nicht einschalten.',
      );
    }
  },

  async disable(): Promise<void> {
    await getBackend().setPushEnabled(false);
  },
};
