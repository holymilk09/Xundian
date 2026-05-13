FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/api/package.json packages/api/tsconfig.json ./packages/api/

RUN npm ci

COPY packages/shared/src ./packages/shared/src
COPY packages/api/src ./packages/api/src

RUN npm run build -w packages/shared && npm run build -w packages/api

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/package.json
COPY --from=builder /app/packages/api/dist ./packages/api/dist

RUN mkdir -p packages/api/uploads \
  && addgroup -g 1001 app \
  && adduser -u 1001 -G app -s /bin/sh -D app \
  && chown -R app:app /app

USER app

EXPOSE 3000

CMD ["node", "packages/api/dist/server.js"]
