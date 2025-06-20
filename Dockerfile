# === Step 1: Build frontend with Vite ===
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies and build
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# === Step 2: Production image with server.js ===
FROM node:18-alpine
WORKDIR /app

# Copy server dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built frontend and server code
COPY --from=builder /app/dist ./dist
COPY server.js mongo.js ./

# Environment variables will be provided at runtime via K8s
ENV PORT=3001
EXPOSE 3001

CMD ["node", "server.js"]

