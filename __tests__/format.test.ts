import {
  formatCooldown,
  formatCredits,
  formatCreditsWithGlyph,
  formatDuration,
  formatReleaseDate,
  formatSignedCredits,
  formatTimeRemaining,
} from '@/lib/format';

describe('credit formatting', () => {
  it('groups thousands the German way', () => {
    // A full stop is the German thousands separator; a comma would read as a decimal.
    expect(formatCredits(12_450)).toBe('12.450');
    expect(formatCredits(0)).toBe('0');
    expect(formatCredits(1_000_000)).toBe('1.000.000');
  });

  it('prefixes the facet glyph', () => {
    expect(formatCreditsWithGlyph(12_450)).toBe('◈ 12.450');
  });

  it('signs a movement with a true minus for debits', () => {
    expect(formatSignedCredits(250)).toBe('+250');
    expect(formatSignedCredits(-1_000)).toBe('−1.000');
    expect(formatSignedCredits(0)).toBe('+0');
  });

  it('truncates rather than rounding a fractional amount', () => {
    expect(formatCredits(99.9)).toBe('99');
  });
});

describe('date and duration formatting', () => {
  it('writes release dates in German order', () => {
    expect(formatReleaseDate('2026-07-29')).toBe('29.07.2026');
  });

  it('returns nothing for an unparseable date', () => {
    expect(formatReleaseDate('not-a-date')).toBe('');
  });

  it('formats track lengths as minutes and seconds', () => {
    expect(formatDuration(214_000)).toBe('3:34');
    expect(formatDuration(59_000)).toBe('0:59');
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(-5)).toBe('0:00');
  });
});

describe('countdowns', () => {
  const now = Date.parse('2026-08-01T12:00:00Z');

  it('counts down in the largest sensible unit', () => {
    expect(formatTimeRemaining('2026-08-01T12:30:00Z', now)).toBe('NOCH 30 MIN');
    expect(formatTimeRemaining('2026-08-01T18:00:00Z', now)).toBe('NOCH 6 STUNDEN');
    expect(formatTimeRemaining('2026-08-01T13:00:00Z', now)).toBe('NOCH 1 STUNDE');
    expect(formatTimeRemaining('2026-08-06T12:00:00Z', now)).toBe('NOCH 5 TAGE');
  });

  it('reports a past deadline as ended', () => {
    expect(formatTimeRemaining('2026-07-31T12:00:00Z', now)).toBe('BEENDET');
  });

  it('describes a mission cooldown', () => {
    expect(formatCooldown('2026-08-01T18:30:00Z', now)).toBe('WIEDER IN 6 STD 30 MIN');
    expect(formatCooldown('2026-08-01T12:45:00Z', now)).toBe('WIEDER IN 45 MIN');
    expect(formatCooldown('2026-08-01T11:00:00Z', now)).toBe('BEREIT');
  });
});
