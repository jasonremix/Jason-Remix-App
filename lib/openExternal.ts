import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import { palette } from '@/constants/theme';

import { logger } from './logger';

/**
 * Opens a streaming or web link.
 *
 * Tries the platform's own app first via `Linking` — a Spotify URL should land in
 * Spotify, not in a browser tab — and falls back to an in-app browser styled to match
 * the app. Only http(s) and known app schemes are ever opened.
 */
const ALLOWED_SCHEMES = /^(https?|spotify|music|youtube|vnd\.youtube):/i;

export async function openExternal(url: string): Promise<void> {
  if (!ALLOWED_SCHEMES.test(url)) {
    logger.warn('refused to open unsupported url scheme');
    return;
  }

  try {
    if (Platform.OS !== 'web' && (await Linking.canOpenURL(url))) {
      const isWebUrl = /^https?:/i.test(url);
      if (!isWebUrl) {
        await Linking.openURL(url);
        return;
      }
    }

    await WebBrowser.openBrowserAsync(url, {
      controlsColor: palette.accent,
      toolbarColor: palette.paper,
      dismissButtonStyle: 'close',
      enableBarCollapsing: true,
    });
  } catch {
    logger.warn('failed to open external link');
  }
}
