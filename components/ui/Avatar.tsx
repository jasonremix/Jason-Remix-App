import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { palette } from '@/constants/theme';

import { Text } from './Text';

/**
 * Member avatar. With no picture set it falls back to the initial on a machined disc
 * rather than a stock silhouette.
 */
export function Avatar({
  uri,
  name,
  size = 56,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initial = (name ?? '').trim().charAt(0).toLocaleUpperCase('de-DE') || '—';

  return (
    <View
      style={[
        styles.root,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={220}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          variant="title"
          tone="accent"
          style={{ fontSize: size * 0.4, lineHeight: size * 0.46 }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: palette.accentWash,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.rule,
  },
});
