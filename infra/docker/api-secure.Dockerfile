FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache dumb-init

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/core/package.json ./packages/core/
COPY packages/api-secure/package.json ./packages/api-secure/
COPY packages/api-vulnerable/package.json ./packages/api-vulnerable/
COPY packages/web/package.json ./packages/web/
RUN npm ci --workspaces --include-workspace-root

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/api-secure/node_modules ./packages/api-secure/node_modules
COPY --from=deps /app/packages/api-vulnerable/node_modules ./packages/api-vulnerable/node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY . .
RUN npm run build --workspaces --if-present

FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/packages/api-secure/dist ./packages/api-secure/dist
COPY --from=builder /app/packages/api-secure/node_modules ./packages/api-secure/node_modules
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/packages/api-secure

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]