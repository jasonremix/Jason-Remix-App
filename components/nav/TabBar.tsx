import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { layout, motion, palette, spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/useHaptics';

const ICONS: Record<string, IconName> = {
  index: 'home',
  music: 'disc',
  rewards: 'gift',
  credits: 'token',
  profile: 'user',
};

const LABELS: Record<string, string> = {
  index: 'START',
  music: 'MUSIK',
  rewards: 'PRÄMIEN',
  credits: 'CREDITS',
  profile: 'PROFIL',
};

/**
 * The navigation bar.
 *
 * A white plate with one hairline above it. The active tab is the only place the
 * accent appears at rest: icon, label and a short rule that slides between positions.
 * No pill, no fill.
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
      {/* Opaque on every platform: a translucent bar without a blur behind it just
          lets list content show through as ghost text. */}
      <View style={[StyleSheet.absoluteFill, styles.ground]} />
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
                color={focused ? palette.accent : palette.muted}
                strokeWidth={focused ? 2 : 1.6}
              />
              <Text
                variant="labelWide"
                tone={focused ? 'accent' : 'tertiary'}
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
  ground: { backgroundColor: palette.card },
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.rule,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', height: layout.tabBarHeight },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.sm },
  label: { fontSize: 9, letterSpacing: 0.8 },
  indicatorSlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
  },
  indicator: {
    width: 22,
    height: 2.5,
    backgroundColor: palette.accent,
  },
});
