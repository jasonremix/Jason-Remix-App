# JASON REMIX — THE OFFICIAL EXPERIENCE

The official mobile app for the German DJ and music artist **Jason Remix** (Brandenburg
an der Havel): a music hub, member club, credits economy, reward catalogue and giveaway
platform, built as an Expo / React Native application with a TypeScript API server.

```
Music  ·  Rewards  ·  Community
```

---

## Getting started

```bash
npm install                  # install the app
npm run server:install       # install the API server
npm start                    # start Expo — scan the QR code with Expo Go
```

The app **runs immediately with no configuration**. Without an API URL it enters
[Demo Mode](#demo-mode) and every screen is fully explorable against a clearly-labelled
sample dataset.

### Running against the real API

```bash
cp .env.example .env
cp server/.env.example server/.env

# Generate the two server secrets:
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('TOKEN_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

npm run server:seed          # creates the schema and German reference data
npm run server                # http://localhost:4000
```

Then set `EXPO_PUBLIC_API_BASE_URL` in `.env` and restart Expo. A physical device needs
your machine's LAN address, not `localhost`.

Create the first administrator by setting `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`
before running the seed. There is deliberately **no API route that grants the admin
role** — promotion is a database operation.

### On a phone, with Expo Go

```bash
npm run expo-go:write        # writes your LAN address into both .env files
npm run server               # terminal A
npm start                    # terminal B — scan the QR code with Expo Go
```

`expo-go` alone prints what it *would* write without touching anything. It never
overwrites a value that already points somewhere real; pass `--force` for that.

Every dependency is either an Expo SDK module or bundled with Expo Go, so **no custom
development build is needed**.

Two things that reliably trip up a first run:

- **`localhost` in `.env`.** The phone resolves that to itself. Use the LAN address —
  which is exactly what `npm run expo-go:write` puts there.
- **A stale Metro cache.** `EXPO_PUBLIC_*` values are compiled into the bundle, so after
  editing `.env` start with `npm run start:clear`, or the previous value is reused.

If the phone cannot reach your machine at all (guest Wi-Fi, client isolation), use
`npm run tunnel`.

---

## Account email

Registration creates the account and sends a confirmation link; following it sends a
welcome message. Both are German, and both are recorded in `email_deliveries` before
anything reports them as sent.

Set **either** a Resend API key **or** an SMTP host in `server/.env`:

```bash
RESEND_API_KEY=re_...                 # option A — one key, nothing to run
SMTP_HOST=smtp.example.com            # option B — any SMTP server
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...

EMAIL_FROM_ADDRESS=noreply@jasonremix.de
PUBLIC_BASE_URL=http://192.168.1.42:4000   # must be reachable from the phone
```

`PUBLIC_BASE_URL` is what goes into the link inside the email, so it has to be reachable
from the member's device — `npm run expo-go:write` sets it alongside the app's API URL.

**With neither configured, nothing is faked.** The API reports `emailVerification.sent:
false` with a reason, the app says "no email was sent" instead of pointing at an empty
inbox, and the delivery is logged as `SKIPPED`. An admin can check what actually went out
under **Admin → E-Mail-Versand**.

Tokens are stored as SHA-256 hashes — the plaintext exists only in the link in the
member's inbox — and requesting a new link invalidates the previous one.

---

## Project layout

```
app/            Expo Router routes — the whole navigable surface
components/     UI, brand, and domain components
constants/      Design tokens, brand strings, level thresholds, runtime config
hooks/          Data hooks (React Query) and interaction hooks
lib/            API client, secure storage, PKCE, formatting, errors, logging
services/       Domain services and the two backend implementations
store/          Zustand stores for session and transient UI state
types/          Domain models, API contracts, Spotify payloads
assets/         Generated brand assets
server/         The API — accounts, credit ledger, giveaways, Spotify exchange
__tests__/      Client logic tests
```

### One contract, two backends

Every screen talks to a single typed interface, `services/backend.types.ts`:

| Implementation | Used when | Source |
| --- | --- | --- |
| `httpBackend` | `EXPO_PUBLIC_API_BASE_URL` is set | `services/httpBackend.ts` |
| `demoBackend` | no API is configured | `services/demo/demoBackend.ts` |

Because both satisfy the same interface, a demo screen cannot drift from a real one, and
there is exactly one switch between them (`services/backend.ts`).

---

## Demo Mode

Demo mode exists so the app is reviewable before an API or Spotify credentials exist.
It is entered **only** when `EXPO_PUBLIC_API_BASE_URL` is empty, or when
`EXPO_PUBLIC_FORCE_DEMO_MODE=true`.

- Every screen showing sample data displays a persistent `DEMO MODE` marker.
- The demo backend enforces the same rules as the server: cooldowns, stock, entry
  limits, idempotency, and no negative balances.
- Demo state lives under a namespaced key and is discarded when you leave demo mode —
  **demo credits never become real credits.**
- Spotify reports *not connected* and refuses a token exchange. Nothing in the app ever
  pretends a connection exists.
- Giveaway draws are refused: winners are a server responsibility, never the device's.

Sign in with any credentials. `admin@jasonremix.de` opens the admin area for review.

---

## Design

The visual language is obsidian and machined metal: deep black grounds, graphite
surfaces separated by hairlines rather than drop shadows, and titanium-to-chrome type.
Colour appears almost nowhere — hierarchy comes from luminance, weight and space.

- **Tokens** live in `constants/theme.ts`. Nothing hard-codes a colour.
- **Icons** are hand-authored on a 24pt grid at a 1.25pt stroke (`components/ui/Icon.tsx`)
  — noticeably finer than a standard icon set, which is what keeps the interface reading
  as machined rather than app-like.
- **Type** is Sora for display and wordmarks, Inter for interface. Tracking is the main
  expressive lever: brand terms are set wide and uppercase.
- **The facet mark** (`components/brand/Monogram.tsx`) is both the brand mark and the
  credit token — one shape at two sizes. The app icon is the same figure.
- **Release artwork** is generated deterministically from the title when no cover exists
  (`components/music/CoverArt.tsx`), so an unpopulated catalogue still looks intentional.
- **Motion** is short and eased, never bouncy, and runs on the UI thread via Reanimated.

---

## Credits, missions, rewards and giveaways

The economy is entirely server-authoritative.

- `credit_transactions` is the ledger; `credit_balances` is a cache. Every movement
  records the balance it produced, so the history reconciles end to end.
- A `CHECK` constraint forbids a negative balance at the database level — application
  code cannot overdraw an account even with a bug.
- Every credit-moving endpoint requires an `idempotency-key` header and stores the
  response against it, so a retry after a timeout returns the original outcome instead
  of spending twice.
- Levels derive from **lifetime earned** credits, so redeeming a reward never demotes a
  member.
- Reward stock and giveaway capacity use guarded `UPDATE`s, so two members racing for
  the last item cannot both succeed.
- Winners are drawn on the server with rejection sampling over the recorded entries,
  one prize per member, and each draw stores the entry count and the hash of its random
  seed so it can be checked afterwards.

The client never computes a balance. A mutation returns the authoritative figure and
that replaces the cache wholesale.

---

## Spotify

Sign-in uses the **Authorization Code flow with PKCE** (RFC 7636), `S256` only. The
implicit grant is not used, and the app holds no client secret.

```
app  ──PKCE authorize──▶  Spotify
app  ──code + verifier─▶  our API  ──code + verifier + secret──▶  Spotify
                          our API  ◀──access + refresh tokens───
                          (encrypted at rest, AES-256-GCM)
app  ──/spotify/*──────▶  our API  ──▶ Spotify Web API (read-only)
```

Spotify tokens are therefore **never stored on the device at all**. Scopes are minimal
and read-only; Settings → Spotify lists exactly what is shared before you authorise, and
shows the redirect URI to register in the Spotify dashboard.

The app does not download, copy, store or re-serve audio, does not control playback, and
does not synchronise Spotify audio with its own media. Connecting is rewarded once as a
mission — individual streams are not, and a listening-based reward module stays disabled
until a method exists that is compatible with Spotify's platform rules. See
`app/legal/spotify-notice.tsx`.

---

## Security

- **Passwords** — scrypt (N=2¹⁵), constant-time verification, never logged.
- **Sessions** — short-lived JWT access tokens; opaque refresh tokens stored as SHA-256
  hashes and rotated on every use. Replaying a rotated token revokes the whole family.
- **Authorisation** — the account is re-read from the database on every request, so a
  ban or demotion takes effect immediately rather than when a token expires. An `ADMIN`
  claim in a token is worthless on its own.
- **Secrets** — the Spotify client secret exists only in the server process. Nothing
  prefixed `EXPO_PUBLIC_` is secret, and the app bundle contains no other credential.
- **Token storage** — Keychain / Keystore via `expo-secure-store`; in-memory only on web,
  where no equivalent guarantee exists.
- **Logging** — both client and server route through a redacting logger. Tokens,
  verifiers, password material and long opaque strings are masked before anything is
  written, in development too.
- **Validation** — every request body and query is parsed with Zod before reaching a
  service.
- **Rate limiting** — separate budgets for reads, authentication and credit movements.
- **Audit** — every administrative action is recorded append-only with the admin's
  identity. There is no edit or delete path anywhere in the codebase.
- **Errors** — members never see a status code, stack trace or internal message.

---

## Privacy

Only what the app needs is collected: email, username, password hash. No date of birth
unless a giveaway legally requires it, no location, no contacts, no advertising
identifiers, no third-party tracking.

Data export (GDPR Art. 15/20) and account deletion are first-class controls in
Settings → Account, not something a member has to email about. Deletion cascades through
every table, voids open giveaway entries, and revokes all sessions. The export
deliberately excludes credential material.

Legal texts (Impressum, Datenschutzerklärung, Nutzungsbedingungen, Gewinnspiel­bedingungen,
Spotify notice) live under `app/legal/` in German.

**The operator's details go in one file: `constants/operator.ts`.** Until the required
fields are filled in, every legal screen shows a warning naming exactly what is missing
and renders the gaps as visible `[placeholders]`. The warning is derived from that
config rather than hard-coded, so it switches itself off once the details are supplied —
there is nothing to remember to remove, and an incomplete Impressum cannot ship
unnoticed.

---

## expo.dev (EAS)

Everything that does not require an Expo account is already in place: bundle identifier
and package name, icons, `eas.json`, `expo-updates`, a `runtimeVersion` policy, an
`.easignore` that keeps the API server out of the upload, and two GitHub Actions.

The project id is committed, so `npm run eas:check` passes with no blockers:

```bash
npm run eas:check      # what is still missing, before a build burns 20 minutes
npm run eas:build      # preview APK for Android
npm run eas:update     # ship a JS-only change, openable in Expo Go
```

`eas:check` separately lists what should be done before a *store* release (Impressum
details, the real discography) without treating those as build failures.

`expo.slug` must match the slug of the project the id points at — EAS refuses the
build otherwise, naming both values.

> **To look at the app on a phone, use EAS Update, not EAS Build.** An update needs no
> build and opens in Expo Go. A build is for putting an installable app on a device,
> and an iOS one additionally needs Apple Developer credentials on the EAS account.

### Builds versus updates

`eas.json` defines three build profiles: `development` (dev client, iOS simulator +
Android APK), `preview` (internal distribution) and `production` (store-ready,
auto-incrementing build numbers).

Once a build is installed, `eas update` ships JavaScript-only changes to it without a
new binary. `runtimeVersion.policy: appVersion` draws the line: a change to native code,
a permission or an SDK version needs `version` bumped in `app.json` and a fresh build,
and the policy stops an incompatible update from reaching an older binary.

`runtimeVersion` is not fixed in `app.json` — it comes from `app.config.js`, because
the right value differs by audience:

| | policy | resolves to | opens in |
| --- | --- | --- | --- |
| default (`preview`) | `sdkVersion` | `exposdk:57.0.0` | **Expo Go** |
| `production` | `appVersion` | `1.0.0` | builds from `eas build --profile production` |

`eas.json` sets `EAS_RUNTIME_POLICY=appVersion` on the production profile; everything
else falls through to the default. So an update pushed to the `preview` branch appears
under the project in Expo Go and opens there, with nothing installed locally — while a
production update can only ever reach a binary with matching native code.

Hardcoding either one would be wrong half the time, and the mistake would only show up
as an update that silently never arrives.

### Configuration per environment

`EXPO_PUBLIC_*` values are compiled into the bundle, so they are set per build
environment rather than committed:

```bash
eas env:create --environment production --name EXPO_PUBLIC_API_BASE_URL       --value https://api.jasonremix.de
eas env:create --environment production --name EXPO_PUBLIC_SPOTIFY_CLIENT_ID  --value <client id>
```

A build with neither set produces a working app in demo mode — useful for a first
internal build before the API is deployed.

> The Spotify **client secret** is never part of a build. It belongs only in the API
> server's environment.

### Seeing it on a phone without installing anything

Once the project id is committed and `EXPO_TOKEN` is a repository secret, the **EAS
Update** workflow publishes to the `preview` branch. The branch then appears under the
project in Expo Go, and opens there — no clone, no `npm install`, no dev server.

### Building from GitHub

`.github/workflows/eas-build.yml` and `eas-update.yml` both run on demand, so a build
never starts by accident and never spends EAS minutes on a push. Both need one
repository secret:

**Settings → Secrets and variables → Actions → `EXPO_TOKEN`**, from
<https://expo.dev/settings/access-tokens>.

A workflow only appears in the Actions tab once its file is on the **default branch** —
until this branch is merged, the two buttons will not be there.

### CI

`.github/workflows/ci.yml` runs typecheck, lint and both test suites on every push. It
needs no secrets.

`.github/workflows/eas-build.yml` starts a build on manual dispatch and is the only
workflow that needs credentials: an **Expo access token** stored as the repository
secret `EXPO_TOKEN` (Settings → Secrets and variables → Actions). Create the token at
<https://expo.dev/settings/access-tokens>. Treat it like a password — it authenticates
as your Expo account, so it belongs in the secret store and never in a file, a commit,
or a message.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run start:clear` | Expo dev server with a cleared Metro cache (after editing `.env`) |
| `npm run expo-go` / `expo-go:write` | Show / write your LAN address into both `.env` files |
| `npm run tunnel` | Expo dev server over a tunnel, when the LAN is not usable |
| `npm run eas:check` | Preflight: what would stop a build, and what to do before a store release |
| `npm run eas:setup` | `eas init` + `eas update:configure` (needs `eas login` first) |
| `npm run eas:build` | Preview APK for Android |
| `npm run eas:update` | Ship a JS-only change to installed builds |
| `npm run android` / `ios` / `web` | Start on a platform |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Client logic tests |
| `npm run server` | API server in watch mode |
| `npm run server:seed` | Schema + reference data + first admin |
| `npm --prefix server run import:catalog` | Import the real discography from `server/catalog.json` |
| `npm --prefix server run backup` | Online SQLite snapshot |
| `docker compose up --build` | Run the API locally in a container |
| `npm run server:test` | API test suite |

## Tests

```bash
npm test              # 72 client tests
npm run server:test   # 110 API tests
```

The API suite covers registration, login, email confirmation, credit balance and ledger
integrity, mission completion and cooldowns, reward redemption and stock races, giveaway
entry and draws, Spotify connect and disconnect, token expiration and refresh rotation,
unauthorised admin access, account deletion, and rate limiting. Spotify and the mail
transport are stubbed at their boundaries — no test makes a network call.

The email tests assert the properties that matter rather than the wording: the token is
stored only as a hash, a delivery row exists for every claimed send, a failed or skipped
send is reported as such instead of being swallowed, and requesting a new link
invalidates the old one.

---

## Status

Complete and working: the design system, all member screens, onboarding,
authentication, the credits economy, rewards, giveaways, achievements, settings, legal
pages, the admin dashboard, the API server, and demo mode.

Present but deliberately inert until configured:

- **Apple / Google sign-in** — shown disabled and labelled, not faked.
- **Push delivery** — notifications are recorded server-side for a dispatch worker;
  registration and preferences work end to end.
- **Spotify** — fully implemented; needs a client id and secret to become active.

