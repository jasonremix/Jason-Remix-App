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
 * Spotify connection management.
 *
 * States plainly what is shared before anything is authorised, and offers a single
 * unambiguous way to sever the link.
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
                ? 'NOT CONFIGURED'
                : connected
                  ? 'SPOTIFY CONNECTED'
                  : 'NOT CONNECTED'
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
                  {connection.product ? `${connection.product.toLocaleUpperCase('en-US')} · ` : ''}
                  Connected {connection.connectedAt ? formatDateTime(connection.connectedAt) : ''}
                </Text>
              </View>
            </View>
          </>
        )}

        <Hairline style={styles.divider} />

        {connected ? (
          <Button
            label="DISCONNECT"
            variant="danger"
            fullWidth
            loading={disconnect.isPending}
            onPress={() => setConfirmingDisconnect(true)}
          />
        ) : (
          <Button
            label="CONNECT SPOTIFY"
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

      {/* --- Transparency about what is shared --------------------------------- */}
      <View style={styles.section}>
        <SectionHeader title="WHAT IS SHARED" />
        <View>
          {scopes.map((entry, index) => (
            <View key={entry.scope}>
              <View style={styles.scopeRow}>
                <Icon name="check" size={14} color={palette.titanium} strokeWidth={1.4} />
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
          Read-only access. The app cannot control playback, change your library, or post
          anything to your account. No audio is downloaded, copied or stored.
        </Text>
      </View>

      {/* --- Setup reference ---------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader title="REDIRECT URI" />
        <Surface elevation="inset" style={styles.uriBox}>
          <Text variant="caption" tone="secondary" selectable>
            {redirectUri}
          </Text>
        </Surface>
        <Button
          label="COPY REDIRECT URI"
          variant="secondary"
          size="sm"
          icon="link"
          onPress={async () => {
            await Clipboard.setStringAsync(redirectUri);
            showToast('REDIRECT URI COPIED', 'neutral');
          }}
        />
        <Text variant="caption" tone="muted">
          Register this exact value in the Spotify developer dashboard for the client id
          this build uses.
        </Text>
      </View>

      <ConfirmDialog
        visible={confirmingDisconnect}
        eyebrow="DISCONNECT SPOTIFY"
        title="Disconnect your Spotify account?"
        message="The link will be removed and the stored tokens deleted on the server. Credits you have already earned are unaffected."
        confirmLabel="DISCONNECT"
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
