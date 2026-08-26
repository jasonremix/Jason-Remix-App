# ---------------------------------------------------------------------------
# Jason Remix API
#
# Node strips TypeScript annotations natively, so there is no build step and no
# compiled output to keep in sync with the source — the image runs exactly the
# files that are in the repository.
#
# Debian slim rather than Alpine: better-sqlite3 publishes prebuilt binaries for
# glibc, so the image needs no compiler toolchain at all.
# ---------------------------------------------------------------------------

FROM node:22-bookworm-slim AS deps

WORKDIR /app
COPY package.json package-lock.json ./

# Production dependencies only. tsx, vitest and the type packages are never
# needed at runtime, and leaving them out keeps the attack surface smaller.
RUN npm ci --omit=dev && npm cache clean --force


FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_URL=/data/jason-remix.sqlite

WORKDIR /app

# `--init` is not guaranteed by every platform, so PID 1 gets a real init that
# forwards SIGTERM. The server's own shutdown handler does the rest: in-flight
# requests finish before the process exits, so a deploy cannot cut a credit
# transaction in half.
RUN apt-get update \
 && apt-get install --no-install-recommends -y tini curl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# The database lives on a mounted volume, owned by the unprivileged user the
# process runs as.
RUN mkdir -p /data && chown -R node:node /data /app
USER node

VOLUME ["/data"]
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "--experimental-strip-types", "src/index.ts"]
