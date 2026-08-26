import { brand } from '@/constants/brand';

/** Zahlen- und Datumsformate. Durchgehend deutsches Format. */

const creditFormatter = new Intl.NumberFormat('de-DE');

export function formatCredits(amount: number): string {
  return creditFormatter.format(Math.trunc(amount));
}

/** `◈ 12.450` — so wird ein Guthaben überall in der App geschrieben. */
export function formatCreditsWithGlyph(amount: number): string {
  return `${brand.creditGlyph} ${formatCredits(amount)}`;
}

/** `+250` / `−1.000`. Echtes Minuszeichen, damit es mit den Ziffern fluchtet. */
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

/** `NOCH 2 TAGE`, `NOCH 4 STUNDEN`, `BEENDET` — steht auf den Gewinnspiel-Karten. */
export function formatTimeRemaining(endsAtIso: string, now: number = Date.now()): string {
  const remaining = new Date(endsAtIso).getTime() - now;
  if (Number.isNaN(remaining) || remaining <= 0) return 'BEENDET';

  const minutes = Math.floor(remaining / 60_000);
  if (minutes < 60) return `NOCH ${Math.max(1, minutes)} MIN`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `NOCH ${hours} ${hours === 1 ? 'STUNDE' : 'STUNDEN'}`;
  const days = Math.floor(hours / 24);
  return `NOCH ${days} TAGE`;
}

/** `WIEDER IN 6 STD 12 MIN` — Abklingzeit einer Mission. */
export function formatCooldown(availableAtIso: string, now: number = Date.now()): string {
  const remaining = new Date(availableAtIso).getTime() - now;
  if (Number.isNaN(remaining) || remaining <= 0) return 'BEREIT';
  const totalMinutes = Math.ceil(remaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `WIEDER IN ${minutes} MIN`;
  return `WIEDER IN ${hours} STD ${minutes.toString().padStart(2, '0')} MIN`;
}

export function formatRelative(iso: string, now: number = Date.now()): string {
  const elapsed = now - new Date(iso).getTime();
  if (Number.isNaN(elapsed)) return '';
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'GERADE EBEN';
  if (minutes < 60) return `VOR ${minutes} MIN`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `VOR ${hours} STD`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `VOR ${days} TAGEN`;
  return formatReleaseDate(iso);
}

export function upper(value: string): string {
  return value.toLocaleUpperCase('de-DE');
}
