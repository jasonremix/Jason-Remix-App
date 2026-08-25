import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { alpha, gradients, palette } from '@/constants/theme';

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
  const initial = (name ?? '').trim().charAt(0).toLocaleUpperCase('en-US') || '—';

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
        <>
          <LinearGradient
            colors={[...gradients.gunmetal.colors]}
            locations={[...gradients.gunmetal.locations]}
            start={gradients.gunmetal.start}
            end={gradients.gunmetal.end}
            style={StyleSheet.absoluteFill}
          />
          <Text
            variant="heading"
            tone="tertiary"
            style={{ fontSize: size * 0.34, letterSpacing: 1 }}
          >
            {initial}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: palette.graphite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha.edge,
  },
});
