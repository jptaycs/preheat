# Builds and runs services/api out of the pnpm/turbo monorepo.
# Uses `turbo prune` so the install step only sees the packages @preheat/api
# actually depends on (avoids installing apps/mobile's react-native/expo tree).

FROM node:20-bookworm-slim AS base
RUN corepack enable

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@1.13.4
COPY . .
RUN turbo prune @preheat/api --docker

FROM base AS installer
WORKDIR /app
# node-gyp toolchain for bcrypt's native build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm turbo run build --filter=@preheat/api

FROM base AS runner
WORKDIR /app
RUN groupadd --system --gid 1001 apigroup && useradd --system --uid 1001 --gid apigroup apiuser
COPY --from=installer /app .
USER apiuser
ENV NODE_ENV=production
EXPOSE 4000
# Migrations are idempotent; seed exits early when SEED_IF_EMPTY=true and data exists.
CMD ["sh", "-c", "node services/api/dist/db/migrate.js && node services/api/dist/db/seed.js && node services/api/dist/index.js"]
