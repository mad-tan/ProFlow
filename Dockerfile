# ─── Stage 1: deps ────────────────────────────────────────────────────────────
# Install all dependencies and recompile native modules (better-sqlite3) for Linux
FROM node:20-alpine AS deps

# Required build tools for native addons (better-sqlite3 needs python + make + g++)
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./

# clean install → forces recompile of better-sqlite3 for linux/x64
RUN npm ci

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy deps (already compiled for linux)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the standalone Next.js output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public 2>/dev/null || true

# Create the data directory for SQLite and make it writable
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Set DATABASE_PATH to a writable location inside the container
ENV DATABASE_PATH=/app/data/productivity.db

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
