import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SpotifyUnavailableNotice } from '@/components/system/Banners';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Hairline, Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { config } from '@/constants/config';
import { palette, spacing } from '@/constants/theme';
import { useConnectSpotify, useDisconnectSpotify, useSpotifyConnection } from '@/hooks/useSpotify';
import { formatDateTime } from '@/lib/format';
import { describeRequestedScopes, getRedirectUri } from '@/services/spotify';
import { useSpotifyStore } from '@/store/spotifyStore';
import { useUiStore } from '@/store/uiStore';

/**
 * Verwaltung der Spotify-Verbindung.
 *
 * Sagt vor der Freigabe klar, was geteilt wird, und bietet genau einen eindeutigen Weg,
 * die Verbindung wieder zu lösen.
 */
export default function SpotifySettings() {
  useSpotifyConnection();
  const connection = useSpotifyStore((state) => state.connection);
  const connecting = useSpotifyStore((state) => state.connecting);
  const lastError = useSpotifyStore((state) => state.lastError);
  const connect = useConnectSpotify();
  const disconnect = useDisconnectSpotify();
  const showToast = useUiStore((state) => state.showToast);

  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  const connected = Boolean(connection?.connected);
  const scopes = describeRequestedScopes();
  const redirectUri = getRedirectUri();

  return (
    <Screen header={<ScreenHeader title="SPOTIFY" />} contentStyle={styles.content}>
      <SpotifyUnavailableNotice />

      <Surface style={styles.card}>
        <View style={styles.statusRow}>
          <Text variant="labelWide" tone="muted" uppercase>
            STATUS
          </Text>
          <Chip
            label={
              !config.isSpotifyConfigured
                ? 'NICHT EINGERICHTET'
                : connected
                  ? 'SPOTIFY VERBUNDEN'
                  : 'NICHT VERBUNDEN'
            }
            tone={connected ? 'success' : 'muted'}
          />
        </View>

        {connected && connection && (
          <>
            <Hairline style={styles.divider} />
            <View style={styles.account}>
              <Avatar uri={connection.avatarUrl} name={connection.displayName} size={48} />
              <View style={styles.accountText}>
                <Text variant="heading" tone="primary" numberOfLines={1}>
                  {connection.displayName ?? connection.spotifyUserId}
                </Text>
                <Text variant="caption" tone="muted">
                  {connection.product ? `${connection.product.toLocaleUpperCase('de-DE')} · ` : ''}
                  Verbunden seit{' '}
                  {connection.connectedAt ? formatDateTime(connection.connectedAt) : ''}
                </Text>
              </View>
            </View>
          </>
        )}

        <Hairline style={styles.divider} />

        {connected ? (
          <Button
            label="VERBINDUNG TRENNEN"
            variant="danger"
            fullWidth
            loading={disconnect.isPending}
            onPress={() => setConfirmingDisconnect(true)}
          />
        ) : (
          <Button
            label="SPOTIFY VERBINDEN"
            variant="primary"
            icon="spotify"
            fullWidth
            disabled={!config.isSpotifyConfigured}
            loading={connecting}
            onPress={() => void connect()}
          />
        )}

        {lastError && (
          <Text variant="bodySmall" tone="danger">
            {lastError}
          </Text>
        )}
      </Surface>

      {/* --- Offenlegung, was geteilt wird ------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader title="DAS WIRD GETEILT" />
        <View>
          {scopes.map((entry, index) => (
            <View key={entry.scope}>
              <View style={styles.scopeRow}>
                <Icon name="check" size={14} color={palette.faint} strokeWidth={1.4} />
                <View style={styles.scopeText}>
                  <Text variant="bodySmall" tone="secondary">
                    {entry.description}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {entry.scope}
                  </Text>
                </View>
              </View>
              {index < scopes.length - 1 && <Hairline />}
            </View>
          ))}
        </View>

        <Text variant="caption" tone="muted">
          Nur Lesezugriff. Die App kann die Wiedergabe nicht steuern, deine Bibliothek nicht
          verändern und nichts in deinem Namen posten. Es werden keine Audiodateien
          heruntergeladen, kopiert oder gespeichert.
        </Text>
      </View>

      {/* --- Nachschlagewert für die Einrichtung -------------------------------- */}
      <View style={styles.section}>
        <SectionHeader title="REDIRECT-URI" />
        <Surface elevation="sunk" style={styles.uriBox}>
          <Text variant="caption" tone="secondary" selectable>
            {redirectUri}
          </Text>
        </Surface>
        <Button
          label="REDIRECT-URI KOPIEREN"
          variant="secondary"
          size="sm"
          icon="link"
          onPress={async () => {
            await Clipboard.setStringAsync(redirectUri);
            showToast('REDIRECT-URI KOPIERT', 'neutral');
          }}
        />
        <Text variant="caption" tone="muted">
          Genau dieser Wert muss im Spotify-Developer-Dashboard für die Client-ID
          hinterlegt sein, die dieser Build verwendet.
        </Text>
      </View>

      <ConfirmDialog
        visible={confirmingDisconnect}
        eyebrow="SPOTIFY TRENNEN"
        title="Spotify-Konto wirklich trennen?"
        message="Die Verbindung wird gelöst und die gespeicherten Tokens werden auf dem Server gelöscht. Bereits verdiente Credits bleiben davon unberührt."
        confirmLabel="TRENNEN"
        destructive
        loading={disconnect.isPending}
        onConfirm={async () => {
          await disconnect.mutateAsync();
          setConfirmingDisconnect(false);
        }}
        onCancel={() => setConfirmingDisconnect(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  card: { padding: spacing.lg, gap: spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { marginVertical: spacing.xs },
  account: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  accountText: { flex: 1, gap: 3 },
  section: { gap: spacing.base },
  scopeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
  scopeText: { flex: 1, gap: 2 },
  uriBox: { padding: spacing.base },
});
