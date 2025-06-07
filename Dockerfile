# ===== FRONTEND (Vite + React + TS) =====
FROM node:18 AS frontend
WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src ./src
RUN npm install
RUN npm run build

# ===== BACKEND =====
FROM node:18 AS backend
WORKDIR /app
COPY --from=frontend /app/dist ./dist
COPY package*.json ./
COPY server.js ./
COPY data ./data
RUN npm install --omit=dev

EXPOSE 5000
CMD ["node", "server.js"]
