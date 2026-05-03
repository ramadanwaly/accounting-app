# Base image - Node.js 18 Slim (Debian based) for better compatibility
FROM node:18-slim

# Install build dependencies for native modules if needed, and sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Rebuild native modules to ensure they match the system architecture
RUN npm rebuild bcrypt sqlite3

# Copy application files
COPY . .

# Create directories for database, logs, backups, and uploads
RUN mkdir -p database logs backups uploads/receipts/original uploads/receipts/thumbnails

# Set permissions
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose the application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
