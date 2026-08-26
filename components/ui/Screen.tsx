import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, palette, spacing } from '@/constants/theme';

export type ScreenProps = {
  children: ReactNode;
  /** Wraps content in a scroll view. Off for screens that manage their own list. */
  scroll?: boolean;
  /** Adds the standard horizontal gutter. */
  padded?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Extra bottom space so content clears the tab bar. */
  tabBarInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  header?: ReactNode;
};

/**
 * Page frame: black ground, safe-area aware, one consistent gutter.
 *
 * Top inset is applied here rather than by a navigation header so every screen can put
 * its own type at the very top of the display, which is where the layout wants it.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  onRefresh,
  refreshing = false,
  tabBarInset = false,
  contentStyle,
  style,
  header,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const paddingBottom =
    (tabBarInset ? layout.tabBarHeight + spacing.xl : 0) + Math.max(insets.bottom, spacing.lg);

  const inner = (
    <View style={[padded && { paddingHorizontal: layout.gutter }, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.root, style]}>
      <View style={{ paddingTop: insets.top }}>{header}</View>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingTop: header ? spacing.sm : insets.top + spacing.sm, paddingBottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.titanium}
                colors={[palette.titanium]}
                progressBackgroundColor={palette.graphite}
              />
            ) : undefined
          }
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { paddingTop: header ? 0 : insets.top, paddingBottom }]}>{inner}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.black },
  scroll: { flex: 1 },
  flex: { flex: 1 },
});
