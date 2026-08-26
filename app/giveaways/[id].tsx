import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CreditPill } from '@/components/credits/CreditPill';
import { CoverArt } from '@/components/music/CoverArt';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Hairline, Surface } from '@/components/ui/Surface';
import { EmptyState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { palette, radius, spacing } from '@/constants/theme';
import { useCredits } from '@/hooks/useCredits';
import { useEnterGiveaway, useGiveaways } from '@/hooks/useGiveaways';
import { formatCredits, formatDateTime, formatTimeRemaining } from '@/lib/format';

/** Der Server liefert den Status englisch; angezeigt wird er deutsch. */
const GIVEAWAY_STATUS: Record<string, string> = {
  DRAFT: 'ENTWURF',
  SCHEDULED: 'GEPLANT',
  OPEN: 'OFFEN',
  CLOSED: 'GESCHLOSSEN',
  DRAWN: 'GEZOGEN',
  CANCELLED: 'ABGESAGT',
};

/**
 * Ein einzelnes Gewinnspiel.
 *
 * Die Teilnahme läuft immer über die Rückfrage, in der die Kosten genau stehen. Das Los
 * selbst entsteht auf dem Server; über den Ausgang wird hier nichts entschieden.
 */
export default function GiveawayDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const giveaways = useGiveaways();
  const credits = useCredits();
  const enter = useEnterGiveaway();

  const [entryCount, setEntryCount] = useState(1);
  const [confirming, setConfirming] = useState(false);

  const giveaway = useMemo(
    () => (giveaways.data?.giveaways ?? []).find((entry) => entry.id === id) ?? null,
    [giveaways.data, id],
  );

  const balance = credits.data?.balance.balance ?? 0;
  const remainingForMe = giveaway ? giveaway.maxEntriesPerUser - giveaway.myEntries : 0;
  const cost = giveaway ? giveaway.entryCost * entryCount : 0;
  const affordable = balance >= cost;
  const canEnter = Boolean(giveaway) && giveaway?.status === 'OPEN' && remainingForMe > 0 && affordable;

  const submit = useCallback(async () => {
    if (!giveaway) return;
    try {
      await enter.mutateAsync({ giveawayId: giveaway.id, entries: entryCount });
      setEntryCount(1);
    } finally {
      setConfirming(false);
    }
  }, [enter, entryCount, giveaway]);

  if (giveaways.isPending) {
    return (
      <Screen header={<ScreenHeader title="GEWINNSPIEL" />} contentStyle={styles.content}>
        <Skeleton height={220} rounded="lg" />
        <Skeleton height={22} width="70%" />
        <Skeleton height={12} width="45%" />
      </Screen>
    );
  }

  if (!giveaway) {
    return (
      <Screen header={<ScreenHeader title="GEWINNSPIEL" />}>
        <EmptyState
          icon="ticket"
          title="Gewinnspiel nicht gefunden."
          message="Möglicherweise ist es beendet oder wurde zurückgezogen."
          actionLabel="ALLE GEWINNSPIELE"
          onAction={() => router.replace('/giveaways')}
        />
      </Screen>
    );
  }

  const filled =
    giveaway.totalEntries === null ? null : giveaway.entriesUsed / Math.max(1, giveaway.totalEntries);

  return (
    <Screen
      header={<ScreenHeader title="GEWINNSPIEL" />}
      contentStyle={styles.content}
      tabBarInset={false}
    >
      <CoverArt uri={giveaway.imageUrl} title={giveaway.title} showTitle={false} rounded="lg" />

      <View style={styles.tags}>
        <Chip
          label={
            giveaway.status === 'OPEN'
              ? formatTimeRemaining(giveaway.endsAt)
              : (GIVEAWAY_STATUS[giveaway.status] ?? giveaway.status)
          }
          tone={giveaway.status === 'OPEN' ? 'active' : 'muted'}
        />
        <Chip
          label={
            giveaway.winnerCount === 1
              ? '1 GEWINNER'
              : `${giveaway.winnerCount} GEWINNER`
          }
        />
        {giveaway.myEntries > 0 && (
          <Chip
            label={`${giveaway.myEntries} ${giveaway.myEntries === 1 ? 'LOS' : 'LOSE'}`}
            tone="success"
          />
        )}
      </View>

      <View style={styles.titleBlock}>
        <Text variant="display" tone="primary">
          {giveaway.title}
        </Text>
        {giveaway.subtitle && (
          <Text variant="labelWide" tone="tertiary" uppercase>
            {giveaway.subtitle}
          </Text>
        )}
      </View>

      <Text variant="body" tone="tertiary">
        {giveaway.description}
      </Text>

      {filled !== null && (
        <View style={styles.progress}>
          <ProgressBar progress={filled} accessibilityLabel="Vergebene Lose" />
          <Text variant="caption" tone="muted">
            {formatCredits(giveaway.entriesUsed)} von{' '}
            {formatCredits(giveaway.totalEntries ?? 0)} Losen vergeben
          </Text>
        </View>
      )}

      {/* --- Entry ------------------------------------------------------------- */}
      {giveaway.status === 'OPEN' && (
        <Surface style={styles.entryCard}>
          <View style={styles.entryHead}>
            <Text variant="labelWide" tone="muted" uppercase>
              LOSE
            </Text>
            <Text variant="caption" tone="muted">
              Noch {remainingForMe} von {giveaway.maxEntriesPerUser} für dich
            </Text>
          </View>

          <View style={styles.stepper}>
            <Stepper
              icon="minus"
              disabled={entryCount <= 1}
              onPress={() => setEntryCount((value) => Math.max(1, value - 1))}
              label="Weniger Lose"
            />
            <View style={styles.stepperValue}>
              <Text variant="title" tone="primary" style={styles.stepperNumber}>
                {entryCount}
              </Text>
              <Text variant="labelWide" tone="muted" uppercase>
                {entryCount === 1 ? 'LOS' : 'LOSE'}
              </Text>
            </View>
            <Stepper
              icon="plus"
              disabled={entryCount >= remainingForMe}
              onPress={() => setEntryCount((value) => Math.min(remainingForMe, value + 1))}
              label="Mehr Lose"
            />
          </View>

          <Hairline />

          <View style={styles.costRow}>
            <Text variant="labelWide" tone="muted" uppercase>
              GESAMTKOSTEN
            </Text>
            <CreditPill amount={cost} />
          </View>

          <Button
            label={
              remainingForMe <= 0
                ? 'LOS-LIMIT ERREICHT'
                : !affordable
                  ? 'GUTHABEN REICHT NICHT'
                  : 'JETZT TEILNEHMEN'
            }
            variant="primary"
            fullWidth
            disabled={!canEnter}
            loading={enter.isPending}
            onPress={() => setConfirming(true)}
          />

          <Text variant="caption" tone="muted">
            Dein Guthaben: {formatCredits(balance)} Credits
          </Text>
        </Surface>
      )}

      {/* --- Terms -------------------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader title="BEDINGUNGEN" />
        <Text variant="bodySmall" tone="tertiary">
          {giveaway.terms}
        </Text>
        <View style={styles.dates}>
          <Text variant="caption" tone="muted">
            Beginn {formatDateTime(giveaway.startsAt)}
          </Text>
          <Text variant="caption" tone="muted">
            Ende {formatDateTime(giveaway.endsAt)}
          </Text>
        </View>
        <Button
          label="VOLLSTÄNDIGE TEILNAHMEBEDINGUNGEN"
          variant="ghost"
          size="sm"
          icon="chevron-right"
          iconTrailing
          onPress={() => router.push('/legal/giveaway-terms')}
        />
      </View>

      <ConfirmDialog
        visible={confirming}
        eyebrow="TEILNAHME BESTÄTIGEN"
        title={giveaway.title}
        message={`Du nimmst mit ${entryCount === 1 ? 'einem Los' : `${entryCount} Losen`} teil. Nach der Ziehung lassen sich Lose nicht mehr zurückziehen.`}
        detail={`Du gibst dafür ${formatCredits(cost)} Credits aus. Danach hast du noch ${formatCredits(Math.max(0, balance - cost))}.`}
        confirmLabel="TEILNEHMEN"
        loading={enter.isPending}
        onConfirm={() => void submit()}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

function Stepper({
  icon,
  onPress,
  disabled,
  label,
}: {
  icon: 'plus' | 'minus';
  onPress: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.stepperButton, disabled && styles.stepperDisabled]}
    >
      <Icon name={icon} size={16} color={disabled ? palette.faint : palette.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingTop: spacing.lg },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  titleBlock: { gap: spacing.sm },
  progress: { gap: spacing.sm },
  entryCard: { padding: spacing.lg, gap: spacing.lg },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperButton: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.paperSunk,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.rule,
  },
  stepperDisabled: { opacity: 0.45 },
  stepperValue: { alignItems: 'center', gap: spacing.xs },
  stepperNumber: { fontVariant: ['tabular-nums'] },
  costRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { gap: spacing.md },
  dates: { gap: spacing.xs },
});
