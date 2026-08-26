#!/usr/bin/env node
/**
 * Preflight for an EAS build or update.
 *
 * Everything below is checkable without an Expo login, which is the point: the things
 * that fail a build tend to fail it twenty minutes in, and most of them are visible
 * here in a second.
 *
 *   node scripts/eas-check.mjs
 *
 * Exits non-zero when something would genuinely stop a build, so CI can gate on it.
 * Anything that only *should* be done before a store release is reported as a warning.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));

const problems = [];
const warnings = [];
const ok = [];

const check = (condition, label, fix) => {
  if (condition) ok.push(label);
  else problems.push({ label, fix });
};
const soft = (condition, label, fix) => {
  if (condition) ok.push(label);
  else warnings.push({ label, fix });
};

// --- The files EAS reads -------------------------------------------------------------

check(existsSync(resolve(root, 'eas.json')), 'eas.json vorhanden', 'eas init anlegen lassen');
check(existsSync(resolve(root, 'app.json')), 'app.json vorhanden', '—');

// Über app.config.js auflösen, nicht app.json direkt lesen: die runtimeVersion
// entsteht erst dort, und genau die entscheidet, ob Expo Go ein Update öffnen kann.
const { createRequire } = await import('node:module');
const require_ = createRequire(import.meta.url);
const base = readJson('app.json').expo;
const app = existsSync(resolve(root, 'app.config.js'))
  ? require_(resolve(root, 'app.config.js'))({ config: base })
  : base;
const pkg = readJson('package.json');

// --- Identity ------------------------------------------------------------------------

check(Boolean(app.slug), 'slug gesetzt', 'expo.slug in app.json setzen');
check(
  Boolean(app.ios?.bundleIdentifier),
  `iOS bundleIdentifier (${app.ios?.bundleIdentifier ?? '—'})`,
  'expo.ios.bundleIdentifier in app.json setzen',
);
check(
  Boolean(app.android?.package),
  `Android package (${app.android?.package ?? '—'})`,
  'expo.android.package in app.json setzen',
);
check(Boolean(app.version), `version (${app.version ?? '—'})`, 'expo.version in app.json setzen');

// The one thing only `eas init` can fill, because it needs an Expo account.
const projectId = app.extra?.eas?.projectId;
check(
  Boolean(projectId),
  'EAS-Projekt-ID gesetzt',
  'eas login && eas init   — legt das Projekt in deinem Expo-Konto an',
);

if (projectId) {
  ok.push(`Projekt-ID ${projectId}`);
}

// `owner` ist nur nötig, solange keine Projekt-ID vorliegt: die ID identifiziert das
// Projekt samt Besitzer eindeutig. Zusätzlich gesetzt kann `owner` nur noch
// widersprechen, deshalb wird er hier nicht eingefordert.
if (app.owner) ok.push(`owner (${app.owner})`);
else if (!projectId) {
  warnings.push({
    label: 'owner nicht gesetzt',
    fix: 'Ohne Projekt-ID entscheidet das eingeloggte Konto, welchem Konto das Projekt zugeordnet wird.',
  });
}

// --- Assets --------------------------------------------------------------------------

for (const [label, path] of [
  ['App-Icon', app.icon],
  ['Adaptive Icon', app.android?.adaptiveIcon?.foregroundImage],
  ['Favicon', app.web?.favicon],
]) {
  if (!path) continue;
  check(existsSync(resolve(root, path)), `${label} (${path})`, `${path} fehlt`);
}

// --- Updates -------------------------------------------------------------------------

const hasUpdates = Boolean(pkg.dependencies?.['expo-updates']);
check(hasUpdates, 'expo-updates installiert', 'npm install expo-updates');
const policy = app.runtimeVersion?.policy ?? app.runtimeVersion;
check(Boolean(policy), 'runtimeVersion gesetzt', 'runtimeVersion in app.config.js setzen');

// Der Unterschied, der darüber entscheidet, ob auf dem Handy etwas ankommt.
if (policy === 'sdkVersion') {
  ok.push(`runtimeVersion: sdkVersion → exposdk:${pkg.dependencies?.expo?.replace(/[~^]/, '') ?? '?'} (Expo Go kann Updates öffnen)`);
} else if (policy) {
  warnings.push({
    label: `runtimeVersion: ${policy} — Expo Go kann solche Updates NICHT öffnen`,
    fix: 'Für Expo Go: EAS_RUNTIME_POLICY nicht setzen (Standard ist sdkVersion). Für Store-Builds ist appVersion richtig.',
  });
}
// Die Update-URL enthält die Projekt-ID. Passen die beiden nicht zusammen, holt die
// App Updates von einem fremden Projekt — und zwar lautlos, ohne Fehlermeldung.
const expectedUrl = projectId ? `https://u.expo.dev/${projectId}` : null;
if (!app.updates?.url) {
  warnings.push({
    label: 'updates.url nicht gesetzt',
    fix: 'eas update:configure   — trägt die URL ein',
  });
} else if (expectedUrl && app.updates.url !== expectedUrl) {
  problems.push({
    label: `updates.url passt nicht zur Projekt-ID`,
    fix: `erwartet ${expectedUrl}, gefunden ${app.updates.url} — eas update:configure korrigiert das`,
  });
} else {
  ok.push(`updates.url passt zur Projekt-ID`);
}

// --- Things that would embarrass a store release --------------------------------------

const operator = read('constants/operator.ts');
const placeholders = [...operator.matchAll(/^\s*(\w+):\s*''/gm)].map((m) => m[1]);
soft(
  placeholders.length === 0,
  'Impressumsdaten vollständig',
  `constants/operator.ts — noch leer: ${placeholders.join(', ')}`,
);

soft(
  existsSync(resolve(root, 'server/catalog.json')),
  'Echte Diskografie hinterlegt',
  'server/catalog.json anlegen (Vorlage: server/catalog.example.json), dann npm --prefix server run import:catalog',
);

// --- Report ---------------------------------------------------------------------------

console.log('');
for (const label of ok) console.log(`  ✓ ${label}`);

if (warnings.length) {
  console.log('');
  console.log('  Vor einer Store-Veröffentlichung noch zu erledigen:');
  for (const { label, fix } of warnings) {
    console.log(`  ! ${label}`);
    console.log(`      ${fix}`);
  }
}

if (problems.length) {
  console.log('');
  console.log('  Das stoppt einen Build:');
  for (const { label, fix } of problems) {
    console.log(`  ✗ ${label}`);
    console.log(`      ${fix}`);
  }
  console.log('');
  process.exit(1);
}

console.log('');
console.log('  Alles bereit. Weiter mit:');
console.log('    eas build --profile preview --platform android');
console.log('');
