# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY ../../package.json ../../package-lock.json* ./
COPY ../../tsconfig.base.json ./

# Copy shared package
COPY ../../packages/shared/package.json ./packages/shared/
COPY ../../packages/shared/src/ ./packages/shared/src/
COPY ../../packages/shared/tsconfig.json ./packages/shared/

# Copy api package
COPY package.json ./packages/api/
COPY src/ ./packages/api/src/
COPY tsconfig.json ./packages/api/

WORKDIR /app/packages/shared
RUN npm install && npm run build

WORKDIR /app/packages/api
RUN npm install && npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package.json ./
COPY --from=builder /app/packages/api/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ../shared/dist
COPY --from=builder /app/packages/shared/package.json ../shared/

RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.js"]
