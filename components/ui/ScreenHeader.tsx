import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alpha, layout, palette, spacing } from '@/constants/theme';

import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Header for pushed screens: a back control, a tracked-out title, and a hairline.
 * Tab roots do not use it — they open with their own large type instead.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: { label: string; onPress: () => void };
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        <Pressable
          onPress={onBack ?? (() => router.back())}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}
        >
          <Icon name="chevron-left" size={18} color={palette.brushed} />
        </Pressable>

        <View style={styles.titles}>
          <Text variant="label" tone="secondary" uppercase numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {action ? (
          <Pressable onPress={action.onPress} hitSlop={14} accessibilityRole="button">
            <Text variant="labelWide" tone="tertiary" uppercase>
              {action.label}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
      </View>

      <View style={styles.hairline} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: palette.black },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.gutter,
    paddingBottom: spacing.base,
    gap: spacing.md,
  },
  back: { width: 24, alignItems: 'flex-start' },
  titles: { flex: 1, alignItems: 'center', gap: 2 },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: alpha.hairline },
});
