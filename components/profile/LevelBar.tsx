import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { formatCredits } from '@/lib/format';
import { formatLevel } from '@/lib/levels';

/**
 * Level and progress towards the next one.
 *
 * The number is derived from lifetime *earned* credits, so redeeming a reward never
 * costs a member their standing.
 */
export function LevelBar({
  level,
  title,
  progress,
  lifetimeEarned,
  nextLevelAt,
}: {
  level: number;
  title: string;
  /** 0..1 */
  progress: number;
  lifetimeEarned: number;
  nextLevelAt: number | null;
}) {
  const remaining = nextLevelAt === null ? null : Math.max(0, nextLevelAt - lifetimeEarned);

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text variant="label" tone="chrome" uppercase>
          {formatLevel(level)}
        </Text>
        <Text variant="labelWide" tone="muted" uppercase>
          {title}
        </Text>
      </View>

      <ProgressBar progress={progress} accessibilityLabel={`Progress to level ${level + 1}`} />

      <Text variant="caption" tone="muted">
        {remaining === null
          ? `${formatCredits(lifetimeEarned)} credits earned — highest level reached`
          : `${formatCredits(remaining)} more earned credits to ${formatLevel(level + 1)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
