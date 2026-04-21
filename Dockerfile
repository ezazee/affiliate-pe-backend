# --- STAGE 1: Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for building
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# --- STAGE 2: Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV production

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist
# Include scripts for potential database management (seeding/purging)
COPY --from=builder /app/src/scripts ./src/scripts

EXPOSE 8001

# Use node to run the server for better performance
CMD ["node", "dist/server.js"]
