import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import type { IconName } from '@/components/ui/Icon';
import { spacing } from '@/constants/theme';
import { PLATFORM_LABELS, PLATFORM_ORDER } from '@/services/catalog.service';
import type { StreamingLinks as StreamingLinksModel } from '@/types/models';

import { openExternal } from '@/lib/openExternal';

const PLATFORM_ICONS: Partial<Record<(typeof PLATFORM_ORDER)[number], IconName>> = {
  spotify: 'spotify',
  youtube: 'youtube',
  appleMusic: 'apple',
};

/**
 * Outbound platform links.
 *
 * The app never plays or stores audio itself: every listen happens on the platform that
 * licenses it, opened in that platform's own app or the browser.
 */
export function StreamingLinks({
  links,
  title,
  layout = 'stack',
  limit,
}: {
  links: StreamingLinksModel;
  title: string;
  layout?: 'stack' | 'inline';
  limit?: number;
}) {
  const available = PLATFORM_ORDER.filter((platform) => Boolean(links[platform]));
  const shown = limit ? available.slice(0, limit) : available;

  if (shown.length === 0) return null;

  return (
    <View style={layout === 'inline' ? styles.inline : styles.stack}>
      {shown.map((platform) => (
        <Button
          key={platform}
          label={layout === 'inline' ? PLATFORM_LABELS[platform] : `OPEN ON ${PLATFORM_LABELS[platform]}`}
          variant="secondary"
          size={layout === 'inline' ? 'sm' : 'md'}
          icon={PLATFORM_ICONS[platform] ?? 'external'}
          onPress={() => openExternal(links[platform] as string)}
          accessibilityHint={`Opens ${title} on ${PLATFORM_LABELS[platform]}`}
          style={layout === 'inline' ? undefined : styles.stacked}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  stacked: { alignSelf: 'stretch' },
  inline: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
