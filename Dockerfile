FROM node:22-alpine AS base

# ── Install dependencies ──────────────────────────────────
FROM base AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ── Build ─────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects telemetry — disable in CI/Docker
ENV NEXT_TELEMETRY_DISABLED=1

# Railway injects these as build args so Next.js can inline them
ARG NEXT_PUBLIC_TENOR_SETTLEMENT_ADDRESS
ARG NEXT_PUBLIC_HEDERA_RPC_URL
ARG NEXT_PUBLIC_USDC_ADDRESS
ARG NEXT_PUBLIC_SECURITY_ADDRESS
ARG NEXT_PUBLIC_HCS_TOPIC_ID
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ARG NEXT_PUBLIC_PRIVY_APP_ID

ENV NEXT_PUBLIC_TENOR_SETTLEMENT_ADDRESS=$NEXT_PUBLIC_TENOR_SETTLEMENT_ADDRESS
ENV NEXT_PUBLIC_HEDERA_RPC_URL=$NEXT_PUBLIC_HEDERA_RPC_URL
ENV NEXT_PUBLIC_USDC_ADDRESS=$NEXT_PUBLIC_USDC_ADDRESS
ENV NEXT_PUBLIC_SECURITY_ADDRESS=$NEXT_PUBLIC_SECURITY_ADDRESS
ENV NEXT_PUBLIC_HCS_TOPIC_ID=$NEXT_PUBLIC_HCS_TOPIC_ID
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ENV NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID

RUN npm run build

# ── Production image ──────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/data/tenor.db

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Railway sets PORT automatically; default to 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000

CMD ["node", "server.js"]
