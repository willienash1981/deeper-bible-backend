# Multi-stage Dockerfile for Deeper Bible Backend
# Optimized for minimal image size and security

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install production dependencies
RUN npm ci --only=production && \
    # Create node_modules backup for production
    cp -R node_modules prod_node_modules && \
    # Install all dependencies (including dev) for building
    npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig*.json ./

# Copy source code
COPY src ./src
COPY backend ./backend
COPY database ./database
COPY api ./api

# Build the application
RUN npm run build && \
    # Remove source files after build
    rm -rf src backend

# Stage 3: Production
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/prod_node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy necessary config files
COPY --chown=nodejs:nodejs database ./database
COPY --chown=nodejs:nodejs api ./api

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]