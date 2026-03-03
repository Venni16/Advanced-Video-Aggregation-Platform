# ── Stage 1: Install dependencies ─────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ── Stage 2: Runtime ───────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Add curl for healthcheck
RUN apk add --no-cache curl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "src/index.js"]
