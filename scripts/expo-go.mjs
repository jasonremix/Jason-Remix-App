#!/usr/bin/env node
/**
 * Prepares the project for Expo Go on a physical phone.
 *
 * The one thing that reliably breaks a first run on a real device is `localhost`: the
 * phone resolves that to itself, not to the machine running the API. This script finds
 * the LAN address, writes it into both `.env` files, and prints what it did.
 *
 *   node scripts/expo-go.mjs          show what would be written
 *   node scripts/expo-go.mjs --write  write it
 *
 * A value that is already set to something else is never overwritten silently — the
 * script says so and leaves it alone unless `--force` is passed.
 */
import { networkInterfaces } from 'node:os';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');
const force = process.argv.includes('--force');

const API_PORT = 4000;

/** The first non-internal IPv4 address — the one a phone on the same Wi-Fi can reach. */
function lanAddress() {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) return address.address;
    }
  }
  return null;
}

/**
 * Reads a dotenv file into an ordered list of lines, so comments survive a rewrite.
 *
 * The template is only copied when actually writing — a dry run must not leave a
 * `.env` behind, or `expo start` would silently pick up a file the caller never asked
 * to create.
 */
function readEnv(file, template) {
  if (write && !existsSync(file) && existsSync(template)) copyFileSync(template, file);
  if (existsSync(file)) return readFileSync(file, 'utf8').split('\n');
  return existsSync(template) ? readFileSync(template, 'utf8').split('\n') : [];
}

function currentValue(lines, key) {
  const match = lines.find((line) => line.startsWith(`${key}=`));
  return match ? match.slice(key.length + 1).trim() : '';
}

/** Sets `key` in place, or appends it when the file has no such line yet. */
function setValue(lines, key, value) {
  const index = lines.findIndex((line) => line.startsWith(`${key}=`));
  if (index === -1) {
    lines.push(`${key}=${value}`);
    return lines;
  }
  lines[index] = `${key}=${value}`;
  return lines;
}

const host = lanAddress();
if (!host) {
  console.error('Keine LAN-Adresse gefunden. Ist dieses Gerät im Netzwerk?');
  process.exit(1);
}

const apiBase = `http://${host}:${API_PORT}`;

const targets = [
  {
    label: 'App',
    file: resolve(root, '.env'),
    template: resolve(root, '.env.example'),
    values: { EXPO_PUBLIC_API_BASE_URL: apiBase },
  },
  {
    label: 'Server',
    file: resolve(root, 'server/.env'),
    template: resolve(root, 'server/.env.example'),
    values: { PUBLIC_BASE_URL: apiBase },
  },
];

console.log(`LAN-Adresse dieses Rechners: ${host}`);
console.log(`API-Basis für das Handy:     ${apiBase}`);
console.log('');

let changed = false;
const skipped = [];

for (const target of targets) {
  const lines = readEnv(target.file, target.template);

  for (const [key, value] of Object.entries(target.values)) {
    const existing = currentValue(lines, key);

    if (existing === value) {
      console.log(`  = ${target.label.padEnd(7)} ${key} steht schon richtig`);
      continue;
    }
    // Anything already pointing somewhere real is left alone: it is far more likely to
    // be a deliberate deployment URL than a stale default.
    if (existing && !existing.includes('localhost') && !force) {
      skipped.push(`${target.label}: ${key}=${existing}`);
      console.log(`  ! ${target.label.padEnd(7)} ${key} ist gesetzt (${existing}) — unverändert`);
      continue;
    }

    console.log(`  ${write ? '→' : '·'} ${target.label.padEnd(7)} ${key}=${value}`);
    setValue(lines, key, value);
    changed = true;
  }

  if (write) writeFileSync(target.file, lines.join('\n'));
}

console.log('');

if (skipped.length && !force) {
  console.log('Mit --force überschreiben:');
  for (const entry of skipped) console.log(`  ${entry}`);
  console.log('');
}

if (!write) {
  console.log('Nichts geschrieben. Zum Übernehmen:');
  console.log('  npm run expo-go:write');
  process.exit(0);
}

console.log(changed ? '.env-Dateien aktualisiert.' : '.env-Dateien waren schon korrekt.');
console.log('');
console.log('Weiter so:');
console.log('  1. Terminal A:  npm run server');
console.log('  2. Terminal B:  npm start');
console.log('  3. Expo Go auf dem Handy öffnen und den QR-Code scannen');
console.log('');
console.log('Handy und Rechner müssen im selben WLAN sein. Klappt das nicht');
console.log('(Gastnetz, getrennte Clients), hilft:  npx expo start --tunnel');
