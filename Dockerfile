# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Create uploads directory
RUN mkdir -p /app/public/uploads

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY package.json ./
COPY src ./src
COPY Server ./Server
COPY public ./public

EXPOSE 3000

CMD ["npm", "start"]
