# XunDian Deployment Guide

## Current: Vercel (Staging / Demo)

The web dashboard (`apps/web`) is deployed to Vercel for development previews and stakeholder demos. The API (`packages/api`) runs locally or on a future hosted backend.

- **Framework:** Next.js 14 with `output: 'standalone'`
- **Root directory:** `apps/web`
- **Build command:** `cd ../.. && npm install && cd apps/web && npm run build`
- **Environment variable:** `NEXT_PUBLIC_API_URL` — points to the API server (defaults to `http://localhost:3000`)

API calls will fail on the Vercel deployment until a hosted backend is available. The UI renders fully without a backend.

### What stays on Vercel

Vercel can remain as a staging/preview environment even after Alibaba Cloud production goes live. No Vercel-specific APIs are used anywhere — zero lock-in.

---

## Production: Alibaba Cloud (Chengdu Region)

When the Sichuan pilot customer begins testing, production moves to Alibaba Cloud Chengdu region for <20ms latency and PIPL data residency compliance.

### Infrastructure

| Component | Spec | Cost |
|-----------|------|------|
| ECS instance | 2 vCPU, 4GB RAM, Ubuntu 22.04, Chengdu region | ~200 RMB/mo |
| Managed PostgreSQL (RDS) | Basic tier with PostGIS extension | ~200 RMB/mo |
| **Total** | | **~400 RMB/mo (~$55)** |

### Architecture

```
                    ┌─────────────────────────────────┐
                    │         Alibaba Cloud ECS        │
                    │         (Chengdu Region)         │
                    │                                  │
  Internet ──────►  │  Nginx (80/443)                  │
                    │    ├── /api/* ──► Fastify (3000)  │
                    │    └── /*     ──► Next.js (3001)  │
                    │                                  │
                    │  Process Manager: PM2             │
                    └──────────┬──────────────────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │  Alibaba RDS PostgreSQL 16       │
                    │  + PostGIS extension             │
                    └─────────────────────────────────┘
```

Both `apps/web` (Next.js) and `packages/api` (Fastify) run on the same ECS instance via PM2 or Docker Compose. PostgreSQL runs on Alibaba managed RDS with PostGIS enabled.

### Migration Steps

1. **Provision infrastructure**
   - Create ECS instance (2C4G, Ubuntu 22.04) in Chengdu region
   - Create RDS PostgreSQL 16 instance with PostGIS extension
   - Configure security groups: allow 80, 443, 22 (SSH)

2. **Install dependencies on ECS**
   ```bash
   # Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # PM2
   sudo npm install -g pm2

   # Nginx
   sudo apt-get install -y nginx
   ```

3. **Clone and build**
   ```bash
   git clone <repo-url> /opt/xundian
   cd /opt/xundian
   npm install
   cd apps/web && npm run build && cd ../..
   cd packages/api && npm run build && cd ../..
   ```

4. **Configure environment variables**
   ```bash
   # /opt/xundian/.env
   DATABASE_URL=postgresql://user:pass@rds-host:5432/xundian
   JWT_SECRET=<generate-secure-secret>
   PORT=3000

   # /opt/xundian/apps/web/.env.local
   NEXT_PUBLIC_API_URL=https://api.xundian.com
   ```

5. **Initialize database**
   ```bash
   psql $DATABASE_URL -f packages/api/src/db/schema.sql
   # Optionally run seed for demo data:
   # npm run seed -w packages/api
   ```

6. **Start services with PM2**
   ```bash
   # API server
   pm2 start packages/api/dist/index.js --name xundian-api

   # Next.js web dashboard
   cd apps/web
   pm2 start node_modules/.bin/next --name xundian-web -- start -p 3001
   cd ../..

   pm2 save
   pm2 startup
   ```

7. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name xundian.com api.xundian.com;

       # API routes
       location /api/ {
           proxy_pass http://127.0.0.1:3000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Web dashboard (everything else)
       location / {
           proxy_pass http://127.0.0.1:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   Then obtain SSL with certbot:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d xundian.com -d api.xundian.com
   ```

8. **Point DNS**
   - `xundian.com` A record → ECS public IP
   - `api.xundian.com` A record → ECS public IP (or use path-based routing on single domain)

### Gaode Maps (高德地图)

- Gaode API requires a Chinese citizen ID for registration
- The pilot customer will supply their own API key when testing begins
- Set via `GAODE_API_KEY` environment variable (referenced in root `.env.example`)
- No code changes needed — the app already reads from env

### PIPL Compliance Notes

- All data stored exclusively on China mainland servers (Chengdu region)
- See `docs/LEGAL.md` for the full PIPL compliance checklist
- Auto-delete visit data after 3 years (retention policy)
- Privacy policy displayed on first launch in both EN and ZH
