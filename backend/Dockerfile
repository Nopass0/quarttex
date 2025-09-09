# Backend Dockerfile
FROM oven/bun:latest

# Set memory limits for build process
ENV NODE_OPTIONS="--max-old-space-size=512"

# Install OpenSSL, Node.js and other required dependencies
RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Install dependencies with reduced memory usage
RUN bun install

# Generate Prisma client with memory limits
RUN NODE_OPTIONS="--max-old-space-size=384" bunx prisma generate || \
    (echo "Retrying with lower memory..." && NODE_OPTIONS="--max-old-space-size=256" bunx prisma generate)

# Copy source code
COPY . .

# Make entrypoint script executable
RUN chmod +x /app/scripts/docker-entrypoint.sh

# Expose port
EXPOSE 3001

# Use entrypoint script to handle migrations before starting app
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["bun", "run", "src/index.ts"]