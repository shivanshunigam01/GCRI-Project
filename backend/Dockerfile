# ==========================================
# Stage 1: Build & Compile TypeScript
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install all dependencies (including devDependencies required for compilation)
RUN npm ci

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to dist/
RUN npm run build

# Remove development dependencies to keep production footprint minimal
RUN npm prune --production

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Create uploads directory and ensure node ownership
RUN mkdir -p /app/uploads && chown -R node:node /app

# Security hardening: use non-root user
USER node

# Copy production artifacts from builder stage with appropriate permissions
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

# Expose backend service port
EXPOSE 5000

# Health check targeting the /api/v1/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health || exit 1

# Start the compiled Express server
CMD ["node", "dist/index.js"]
