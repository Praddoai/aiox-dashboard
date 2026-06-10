# ============================================================
# AIOS Platform — Multi-stage Docker build
# Stage 1: Build SPA (Node + Vite)
# Stage 2: Run Engine + serve dashboard (Bun + Hono)
# ============================================================

# -- Stage 1: Build the dashboard SPA --
FROM node:20-alpine AS spa-build

WORKDIR /app

# Install deps first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY tsconfig*.json vite.config.ts tailwind.config.ts postcss.config.js index.html ./
COPY src/ src/
COPY public/ public/

RUN npm run build


# -- Stage 2: Engine runtime --
FROM oven/bun:1-alpine AS runtime

WORKDIR /app/engine

# Install engine deps
COPY engine/package.json engine/bun.lock* ./
RUN bun install --production --frozen-lockfile 2>/dev/null || bun install --production

# Copy engine source
COPY engine/src/ src/
COPY engine/bin/ bin/
COPY engine/engine.config.yaml ./

# Copy built dashboard from stage 1
COPY --from=spa-build /app/dist /app/dist

# Runtime env defaults
ENV ENGINE_PORT=4002
ENV ENGINE_HOST=0.0.0.0
ENV AIOS_DASHBOARD_DIR=/app/dist

# The project root is mounted at runtime via volume
# Default: /project (user mounts their project here)
ENV AIOS_PROJECT_ROOT=/project

# Expose engine port
EXPOSE 4002

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4002/health || exit 1

# Start engine
CMD ["bun", "run", "src/index.ts"]
