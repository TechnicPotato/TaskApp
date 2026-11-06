# Base image
FROM node:24-slim AS base
WORKDIR /usr/src/app

# Dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Build
FROM base AS builder
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runner
FROM base AS runner
ENV NODE_ENV=production
COPY --chown=node:node --from=builder /usr/src/app/.next/standalone ./
COPY --chown=node:node --from=builder /usr/src/app/.next/static  ./.next/static
COPY --chown=node:node --from=builder /usr/src/app/public ./public
USER node

ENV PORT=8080
ENV HOSTNAME=0.0.0.0

EXPOSE 8080
CMD ["node", "server.js"]
