import { Pressable, StyleSheet, View } from 'react-native';

import { CreditPill } from '@/components/credits/CreditPill';
import { CoverArt } from '@/components/music/CoverArt';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { formatTimeRemaining } from '@/lib/format';
import type { Giveaway } from '@/types/models';

export function GiveawayCard({ giveaway, onPress }: { giveaway: Giveaway; onPress: () => void }) {
  const open = giveaway.status === 'OPEN';
  const filled =
    giveaway.totalEntries === null ? null : giveaway.entriesUsed / Math.max(1, giveaway.totalEntries);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={giveaway.title}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Surface style={styles.card}>
        <CoverArt uri={giveaway.imageUrl} title={giveaway.title} showTitle={false} rounded="md" />

        <View style={styles.body}>
          <View style={styles.tags}>
            <Chip
              label={open ? formatTimeRemaining(giveaway.endsAt) : giveaway.status}
              tone={open ? 'active' : 'muted'}
            />
            {giveaway.myEntries > 0 && (
              <Chip
                label={`${giveaway.myEntries} ${giveaway.myEntries === 1 ? 'LOS' : 'LOSE'}`}
                tone="success"
              />
            )}
          </View>

          <View style={styles.titleBlock}>
            <Text variant="display" tone="primary" numberOfLines={2}>
              {giveaway.title}
            </Text>
            {giveaway.subtitle && (
              <Text variant="labelWide" tone="tertiary" uppercase numberOfLines={1}>
                {giveaway.subtitle}
              </Text>
            )}
          </View>

          <Text variant="bodySmall" tone="tertiary" numberOfLines={2}>
            {giveaway.description}
          </Text>

          {filled !== null && (
            <View style={styles.progress}>
              <ProgressBar progress={filled} accessibilityLabel="Entries taken" />
              <Text variant="caption" tone="tertiary">
                {giveaway.entriesUsed.toLocaleString('de-DE')} von{' '}
                {(giveaway.totalEntries ?? 0).toLocaleString('de-DE')} Losen vergeben
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <CreditPill amount={giveaway.entryCost} size="sm" />
            <Text variant="labelWide" tone="tertiary" uppercase>
              {giveaway.winnerCount === 1 ? '1 GEWINNER' : `${giveaway.winnerCount} GEWINNER`}
            </Text>
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  pressed: { opacity: 0.9 },
  body: { padding: spacing.lg, gap: spacing.md },
  tags: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  titleBlock: { gap: spacing.xs },
  progress: { gap: spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
});
