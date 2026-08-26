# Jason Remix API

Accounts, the credit ledger, missions, rewards, giveaways and the Spotify token
exchange. Express 5 + SQLite, TypeScript throughout.

## Running

```bash
npm install
cp .env.example .env

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # TOKEN_ENCRYPTION_KEY

npm run seed     # schema + reference data (+ first admin, if configured)
npm run dev      # http://localhost:4000
npm test         # 94 tests
```

In production both secrets are mandatory — the process refuses to start without them,
so a deployment can never silently fall back to a development key.

## Why SQLite

better-sqlite3 is synchronous, which is exactly what a credit ledger wants: a
transaction really is atomic with no interleaving `await` points inside it. The schema
is ordinary SQL and ports to Postgres without redesign when scale requires it.

## Endpoints

### Public

| | |
| --- | --- |
| `GET /health` | Liveness and whether Spotify is configured |
| `GET /catalog` | Tracks, albums, news, featured release |
| `GET /catalog/tracks/:id` | One release |

### Authentication

| | |
| --- | --- |
| `POST /auth/register` | Create an account |
| `POST /auth/login` | Sign in |
| `POST /auth/refresh` | Rotate the refresh token |
| `POST /auth/logout` | Revoke a refresh token |

### Member (bearer token)

| | |
| --- | --- |
| `GET /me` | Identity, balance, Spotify link, achievements |
| `PATCH /me/profile` | Update the profile |
| `POST /me/password` | Change password (revokes other sessions) |
| `GET /me/export` | GDPR Art. 15/20 export |
| `POST /me/delete` | Irreversible account deletion |
| `GET /credits` | Balance and ledger, cursor-paginated |
| `GET /missions` · `POST /missions/:id/claim` | Missions |
| `GET /rewards` · `POST /rewards/:id/redeem` | Rewards |
| `GET /giveaways` · `POST /giveaways/:id/enter` | Giveaways |
| `GET /spotify/connection` · `POST /spotify/exchange` · `POST /spotify/disconnect` | Spotify |
| `GET /spotify/now-playing` · `/recently-played` · `/top-tracks` | Read-only Spotify data |
| `POST /notifications/token` · `/preferences` | Push registration |

### Admin (bearer token + `ADMIN` role)

`GET /admin/users` · `POST /admin/users/:id/status` · `POST /admin/credits/adjust` ·
`POST /admin/tracks` · `DELETE /admin/tracks/:id` · `POST /admin/news` ·
`POST /admin/rewards` · `POST /admin/missions` · `POST /admin/achievements` ·
`POST /admin/giveaways` · `POST /admin/giveaways/:id/close` · `/draw` · `/cancel` ·
`POST /admin/redemptions/:id/status` · `POST /admin/notifications` · `GET /admin/audit`

## Idempotency

Every credit-moving endpoint requires an `idempotency-key` header (8–200 characters).
The response is stored against the key, so a client retrying after a timeout receives
the original outcome rather than spending twice.

```http
POST /missions/msn-daily/claim
Authorization: Bearer <access token>
Idempotency-Key: 6f8a3c1e-...
```

## Errors

Every failure has the same shape. Messages are member-safe; internal detail never
leaves the process.

```json
{ "error": { "code": "INSUFFICIENT_CREDITS",
             "message": "You do not have enough credits for this.",
             "details": { "password": "Use at least 10 characters." } } }
```

`BAD_REQUEST` · `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `CONFLICT` ·
`INSUFFICIENT_CREDITS` · `MISSION_ON_COOLDOWN` · `MISSION_ALREADY_COMPLETED` ·
`GIVEAWAY_CLOSED` · `GIVEAWAY_ENTRY_LIMIT` · `REWARD_UNAVAILABLE` · `RATE_LIMITED` ·
`SPOTIFY_NOT_CONFIGURED` · `SPOTIFY_AUTH_FAILED` · `TOKEN_EXPIRED` · `ACCOUNT_BANNED` ·
`SERVER_ERROR`

## The ledger

`src/services/credits.service.ts` is the only place a balance changes. Everything else
calls `applyLedgerEntry` inside a surrounding transaction, so a domain record and its
ledger row can never disagree. Three invariants hold at all times:

1. A balance is never negative — enforced in code and by a `CHECK` constraint.
2. Every movement writes a row recording the balance it produced.
3. Lifetime earned only increases, so a member's level cannot fall.

## Giveaway draws

Winners are selected over the recorded entries using a cryptographic seed with
rejection sampling, so every entry has an equal chance and one member cannot take two
prizes. Each draw writes a `giveaway_draws` row with the entry count and the SHA-256 of
the seed, and a giveaway can only be drawn once. Cancelling instead refunds every active
entry in a single transaction.

## Administrators

There is no API route that grants the `ADMIN` role. Promotion is a database operation:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@jasonremix.de';
```

Every admin action writes an append-only `admin_action_log` entry naming the account
that performed it.

## Push notifications

`POST /admin/notifications` records a message in `push_notifications` and returns the
number of opted-in recipients. Delivery is left to a worker reading that table —
pushing from inside a request would block the admin on a third-party service. Turning
notifications off deletes the member's tokens, not just the preference flag.
