FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY apps/web/package.json apps/web/tsconfig.json apps/web/next.config.js apps/web/postcss.config.js apps/web/tailwind.config.ts ./apps/web/

RUN npm ci

COPY packages/shared/src ./packages/shared/src
COPY apps/web ./apps/web

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build -w packages/shared && npm run build -w apps/web

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3001

CMD ["node", "apps/web/server.js"]
