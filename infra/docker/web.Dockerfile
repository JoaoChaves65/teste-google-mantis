FROM node:20-alpine AS base

WORKDIR /app

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

FROM nginx:alpine AS runner
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]