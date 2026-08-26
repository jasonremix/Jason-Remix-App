import { StyleSheet, View } from 'react-native';

import { Monogram } from '@/components/brand/Monogram';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useCountUp } from '@/hooks/useCountUp';
import { formatCredits } from '@/lib/format';

/**
 * The large balance display. The figure counts rather than snapping so an award reads
 * as something that happened, not as a number that was always there.
 */
export function CreditCounter({
  amount,
  size = 'lg',
  animate = true,
}: {
  amount: number;
  size?: 'md' | 'lg';
  animate?: boolean;
}) {
  const displayed = useCountUp(animate ? amount : amount, animate ? 620 : 0);
  const fontSize = size === 'lg' ? 56 : 34;

  return (
    <View style={styles.root} accessibilityRole="text" accessibilityLabel={`${formatCredits(amount)} Credits`}>
      <Monogram size={size === 'lg' ? 30 : 20} />
      <Text
        variant="numeric"
        tone="primary"
        style={{ fontSize, lineHeight: fontSize * 1.02, fontVariant: ['tabular-nums'] }}
        maxFontSizeMultiplier={1.2}
      >
        {formatCredits(displayed)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
