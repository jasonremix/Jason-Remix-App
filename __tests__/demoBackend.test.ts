import { AppError } from '@/lib/errors';
import { clearDemoState, demoBackend } from '@/services/demo/demoBackend';

/**
 * The demo backend stands in for the API when none is configured. It has to enforce the
 * same rules as the server — otherwise the app would behave one way in demo mode and
 * another once pointed at the real thing.
 */
describe('demo backend', () => {
  beforeEach(async () => {
    await clearDemoState();
  });

  it('identifies itself as demo, never as the real backend', () => {
    expect(demoBackend.kind).toBe('demo');
  });

  it('starts from the documented sample balance', async () => {
    const { balance } = await demoBackend.getCredits();
    expect(balance.balance).toBe(45_000);
    // 52,400 lifetime earned puts the sample member at the top level.
    expect(balance.lifetimeEarned).toBe(52_400);
    expect(balance.level).toBe(8);
  });

  it('awards a mission and records a ledger entry', async () => {
    const before = await demoBackend.getCredits();
    const result = await demoBackend.claimMission('msn-daily', 'key-1');

    expect(result.transaction.amount).toBe(100);
    expect(result.balance.balance).toBe(before.balance.balance + 100);
    expect(result.transaction.balanceAfter).toBe(result.balance.balance);
  });

  it('puts a repeatable mission on cooldown', async () => {
    await demoBackend.claimMission('msn-daily', 'key-1');
    await expect(demoBackend.claimMission('msn-daily', 'key-2')).rejects.toMatchObject({
      code: 'MISSION_ON_COOLDOWN',
    });
  });

  it('refuses a second claim of a one-off mission', async () => {
    await demoBackend.claimMission('msn-release', 'key-1');
    await expect(demoBackend.claimMission('msn-release', 'key-2')).rejects.toMatchObject({
      code: 'MISSION_ALREADY_COMPLETED',
    });
  });

  it('replays a repeated idempotency key instead of awarding twice', async () => {
    const first = await demoBackend.claimMission('msn-daily', 'same-key');
    const replay = await demoBackend.claimMission('msn-daily', 'same-key');

    expect(replay.transaction.id).toBe(first.transaction.id);

    const { balance } = await demoBackend.getCredits();
    expect(balance.balance).toBe(45_100);
  });

  it('never claims a Spotify connection it does not have', async () => {
    const connection = await demoBackend.getSpotifyConnection();
    expect(connection.connected).toBe(false);
    expect(connection.spotifyUserId).toBeNull();

    await expect(demoBackend.getSpotifyNowPlaying()).resolves.toBeNull();
    await expect(demoBackend.getSpotifyRecentlyPlayed()).resolves.toEqual([]);
  });

  it('refuses to award the Spotify mission without a connection', async () => {
    await expect(demoBackend.claimMission('msn-spotify', 'key-1')).rejects.toMatchObject({
      code: 'SPOTIFY_NOT_CONFIGURED',
    });
  });

  it('refuses a Spotify token exchange outright', async () => {
    await expect(
      demoBackend.exchangeSpotifyCode({
        code: 'x',
        codeVerifier: 'y',
        redirectUri: 'jasonremix://spotify-callback',
        state: 'z',
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debits a reward redemption and decrements its stock', async () => {
    const before = await demoBackend.getCredits();
    const result = await demoBackend.redeemReward('rwd-merch', 'key-1');

    expect(result.transaction.amount).toBe(-1_000);
    expect(result.balance.balance).toBe(before.balance.balance - 1_000);
    expect(result.redemption.status).toBe('PENDING');

    const { rewards } = await demoBackend.getRewards();
    const merch = rewards.find((reward) => reward.id === 'rwd-merch');
    expect(merch?.remaining).toBe(145);
  });

  it('exposes level gates on rewards so the UI can lock them', async () => {
    const { rewards } = await demoBackend.getRewards();
    const gated = rewards.filter((reward) => reward.minLevel !== null);

    expect(gated.length).toBeGreaterThan(0);
    // The sample member is at the top level, so every gate is satisfied for them.
    const { balance } = await demoBackend.getCredits();
    expect(gated.every((reward) => (reward.minLevel as number) <= balance.level)).toBe(true);
  });

  it('creates giveaway entries and charges per entry', async () => {
    const before = await demoBackend.getCredits();
    const result = await demoBackend.enterGiveaway('gwy-tour-vip', 2, 'key-1');

    expect(result.transaction.amount).toBe(-2_000);
    expect(result.balance.balance).toBe(before.balance.balance - 2_000);
    expect(result.giveaway.myEntries).toBe(2);
  });

  it('enforces the per-member entry limit', async () => {
    await demoBackend.enterGiveaway('gwy-tour-vip', 5, 'key-1');
    await expect(demoBackend.enterGiveaway('gwy-tour-vip', 1, 'key-2')).rejects.toMatchObject({
      code: 'GIVEAWAY_ENTRY_LIMIT',
    });
  });

  it('refuses a closed giveaway', async () => {
    await expect(demoBackend.enterGiveaway('gwy-vinyl', 1, 'key-1')).rejects.toMatchObject({
      code: 'GIVEAWAY_CLOSED',
    });
  });

  it('never lets a balance go negative', async () => {
    // Spend the sample balance down, then try to overspend.
    await demoBackend.redeemReward('rwd-meet', 'key-1'); // 15,000
    await demoBackend.redeemReward('rwd-vip', 'key-2'); // 10,000
    await demoBackend.redeemReward('rwd-vip', 'key-3'); // 10,000
    await demoBackend.redeemReward('rwd-vip', 'key-4'); // 10,000

    const { balance } = await demoBackend.getCredits();
    expect(balance.balance).toBe(0);

    await expect(demoBackend.redeemReward('rwd-merch', 'key-5')).rejects.toMatchObject({
      code: 'INSUFFICIENT_CREDITS',
    });
  });

  it('refuses to draw a giveaway winner on the device', async () => {
    await expect(demoBackend.adminDrawGiveaway('gwy-tour-vip')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('keeps the level from falling when credits are spent', async () => {
    const before = await demoBackend.getCredits();
    await demoBackend.redeemReward('rwd-meet', 'key-1');
    const after = await demoBackend.getCredits();

    expect(after.balance.balance).toBeLessThan(before.balance.balance);
    expect(after.balance.level).toBe(before.balance.level);
    expect(after.balance.lifetimeEarned).toBe(before.balance.lifetimeEarned);
  });

  it('labels its data export as placeholder content', async () => {
    const exported = await demoBackend.exportData();
    expect(String(exported.note)).toMatch(/demo/i);
  });
});
