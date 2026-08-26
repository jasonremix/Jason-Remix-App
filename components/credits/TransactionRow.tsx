import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { palette, spacing } from '@/constants/theme';
import { formatDateTime, formatSignedCredits } from '@/lib/format';
import type { CreditTransaction } from '@/types/models';

const TYPE_LABELS: Record<CreditTransaction['type'], string> = {
  EARN: 'EARN',
  SPEND: 'SPEND',
  BONUS: 'BONUS',
  ADMIN_ADJUSTMENT: 'ADJUSTMENT',
  REFUND: 'REFUND',
};

/** One line of the ledger. The running balance is shown so the history reconciles. */
export function TransactionRow({ transaction }: { transaction: CreditTransaction }) {
  const positive = transaction.amount >= 0;

  return (
    <View style={styles.root}>
      <View style={styles.left}>
        <Text variant="body" tone="secondary" numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text variant="caption" tone="muted">
          {TYPE_LABELS[transaction.type]} · {formatDateTime(transaction.timestamp)}
        </Text>
      </View>

      <View style={styles.right}>
        <Text
          variant="body"
          style={[styles.amount, { color: positive ? palette.chrome : palette.silver }]}
        >
          {formatSignedCredits(transaction.amount)}
        </Text>
        <Text variant="caption" tone="muted" style={styles.balance}>
          {transaction.balanceAfter.toLocaleString('en-US')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: spacing.base,
  },
  left: { flex: 1, gap: 3 },
  right: { alignItems: 'flex-end', gap: 3 },
  amount: { fontVariant: ['tabular-nums'], letterSpacing: 0.4 },
  balance: { fontVariant: ['tabular-nums'] },
});
