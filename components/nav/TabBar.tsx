import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { alpha, layout, motion, palette, spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/useHaptics';

const ICONS: Record<string, IconName> = {
  index: 'home',
  music: 'disc',
  rewards: 'gift',
  credits: 'token',
  profile: 'user',
};

const LABELS: Record<string, string> = {
  index: 'HOME',
  music: 'MUSIC',
  rewards: 'REWARDS',
  credits: 'CREDITS',
  profile: 'PROFILE',
};

/**
 * The navigation bar.
 *
 * Glass over black with a single hairline above it. The active tab is marked by a short
 * chrome rule that slides between positions — no pill, no fill, no colour.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { tap } = useHaptics();
  const [barWidth, setBarWidth] = useState(0);
  const indicator = useSharedValue(0);

  const count = state.routes.length;
  const slotWidth = barWidth / Math.max(1, count);

  useEffect(() => {
    const target = state.index * slotWidth;
    // Before the bar has been measured there is nothing to animate towards; jumping
    // avoids a marker that slides in from the left on first paint.
    indicator.value = slotWidth === 0 ? target : withTiming(target, { duration: motion.base });
  }, [indicator, slotWidth, state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicator.value }],
  }));

  return (
    <View style={[styles.host, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {/*
        iOS gets a real blur, so a translucent ground reads as glass. Everywhere else
        there is no blur to do that work, and the same translucency just lets the
        content behind the bar show through as ghost text — so those platforms get an
        opaque ground instead. The hairline above keeps the edge defined either way.
      */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.solidGround]} />
      )}
      <View style={styles.hairline} />

      <View style={styles.row} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}>
        {/*
          One slot-wide marker translated between slots, so switching tabs is a single
          transform rather than five independent animations.
        */}
        {slotWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.indicatorSlot, { width: slotWidth }, indicatorStyle]}
          >
            <View style={styles.indicator} />
          </Animated.View>
        )}

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const name = LABELS[route.name] ?? route.name.toLocaleUpperCase('en-US');

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={name}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (focused || event.defaultPrevented) return;
                tap();
                navigation.navigate(route.name);
              }}
              style={styles.tab}
            >
              <Icon
                name={ICONS[route.name] ?? 'home'}
                size={20}
                color={focused ? palette.chrome : palette.titanium}
                strokeWidth={focused ? 1.4 : 1.1}
              />
              <Text
                variant="labelWide"
                tone={focused ? 'secondary' : 'muted'}
                style={styles.label}
                maxFontSizeMultiplier={1.2}
              >
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.sm,
    overflow: 'hidden',
  },
  solidGround: { backgroundColor: palette.obsidian },
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: alpha.edge,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', height: layout.tabBarHeight },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.sm },
  label: { fontSize: 8.5, letterSpacing: 1.6 },
  indicatorSlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
  },
  indicator: {
    width: 18,
    height: 1.5,
    backgroundColor: palette.chrome,
    borderRadius: 1,
  },
});
