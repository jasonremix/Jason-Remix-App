import { brand } from '@/constants/brand';

/** Number and date formatting. German locale for dates, grouped digits for credits. */

const creditFormatter = new Intl.NumberFormat('en-US');

export function formatCredits(amount: number): string {
  return creditFormatter.format(Math.trunc(amount));
}

/** `◈ 12,450` — the canonical way a balance is written anywhere in the app. */
export function formatCreditsWithGlyph(amount: number): string {
  return `${brand.creditGlyph} ${formatCredits(amount)}`;
}

/** `+250` / `−1,000`. Uses a true minus sign so it aligns with the digits. */
export function formatSignedCredits(amount: number): string {
  const sign = amount < 0 ? '−' : '+';
  return `${sign}${formatCredits(Math.abs(amount))}`;
}

export function formatReleaseDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** `2 DAYS LEFT`, `4 HOURS LEFT`, `ENDED` — used on giveaway cards. */
export function formatTimeRemaining(endsAtIso: string, now: number = Date.now()): string {
  const remaining = new Date(endsAtIso).getTime() - now;
  if (Number.isNaN(remaining) || remaining <= 0) return 'ENDED';

  const minutes = Math.floor(remaining / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} MIN LEFT`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} ${hours === 1 ? 'HOUR' : 'HOURS'} LEFT`;
  const days = Math.floor(hours / 24);
  return `${days} DAYS LEFT`;
}

/** `READY IN 6H 12M` — mission cooldowns. */
export function formatCooldown(availableAtIso: string, now: number = Date.now()): string {
  const remaining = new Date(availableAtIso).getTime() - now;
  if (Number.isNaN(remaining) || remaining <= 0) return 'READY';
  const totalMinutes = Math.ceil(remaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `READY IN ${minutes}M`;
  return `READY IN ${hours}H ${minutes.toString().padStart(2, '0')}M`;
}

export function formatRelative(iso: string, now: number = Date.now()): string {
  const elapsed = now - new Date(iso).getTime();
  if (Number.isNaN(elapsed)) return '';
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'JUST NOW';
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}D AGO`;
  return formatReleaseDate(iso);
}

/** Letter-spaced brand rendering, e.g. `JASON REMIX`. */
export function upper(value: string): string {
  return value.toLocaleUpperCase('en-US');
}
