# Use Node.js 20 LTS
FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

# Set working directory
WORKDIR /app

# Copy Prisma schema FIRST
COPY prisma ./prisma

# Copy package files
COPY package*.json ./

# Set a placeholder DATABASE_URL for build time (Prisma needs this to generate the client)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/placeholder"

# Install ALL dependencies (postinstall will run prisma generate automatically)
RUN npm install

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Don't prune dependencies - we need tsx and other tools for migrations and seeding

# Regenerate Prisma Client one final time to ensure it's correct
RUN npx prisma generate

# Expose port
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080

# Start the server
CMD ["node", "dist/index.js"]
