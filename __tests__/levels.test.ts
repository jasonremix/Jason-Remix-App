import { LEVELS, MAX_LEVEL } from '@/constants/levels';
import { formatLevel, resolveLevel } from '@/lib/levels';

describe('level resolution', () => {
  it('starts everyone at level one', () => {
    expect(resolveLevel(0).level).toBe(1);
    expect(resolveLevel(0).progress).toBe(0);
  });

  it('lands exactly on a threshold', () => {
    for (const definition of LEVELS) {
      expect(resolveLevel(definition.threshold).level).toBe(definition.level);
    }
  });

  it('stays on a level until the next threshold is reached', () => {
    expect(resolveLevel(499).level).toBe(1);
    expect(resolveLevel(500).level).toBe(2);
    expect(resolveLevel(1_499).level).toBe(2);
    expect(resolveLevel(1_500).level).toBe(3);
  });

  it('reports progress through the current level', () => {
    // Halfway between 500 and 1,500.
    const progress = resolveLevel(1_000);
    expect(progress.level).toBe(2);
    expect(progress.progress).toBeCloseTo(0.5, 5);
    expect(progress.remaining).toBe(500);
  });

  it('caps at the highest level', () => {
    const top = resolveLevel(10_000_000);
    expect(top.level).toBe(MAX_LEVEL);
    expect(top.nextThreshold).toBeNull();
    expect(top.remaining).toBeNull();
    expect(top.progress).toBe(1);
  });

  it('treats negative or fractional input as its floor', () => {
    expect(resolveLevel(-500).level).toBe(1);
    expect(resolveLevel(1_499.9).level).toBe(2);
  });

  it('zero-pads the displayed level', () => {
    expect(formatLevel(1)).toBe('LEVEL 01');
    expect(formatLevel(8)).toBe('LEVEL 08');
    expect(formatLevel(12)).toBe('LEVEL 12');
  });
});
