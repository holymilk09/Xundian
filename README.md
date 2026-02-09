# 巡店 XúnDiàn — Smart Field Retail Execution Platform

> Cover more stores. Stock more shelves. See more data.
> 覆盖更多门店 · 上架更多产品 · 洞察更多数据

XúnDiàn is a mobile-first B2B SaaS platform that transforms how FMCG field teams manage retail store coverage in China. It replaces blind store walks with AI-powered route optimization, automated shelf recognition, and intelligent revisit scheduling.

## The Problem

FMCG companies in China employ millions of field representatives who visit retail stores to ensure product availability. Today, these reps:
- Walk random routes with no optimization
- Take hundreds of shelf photos that managers must review manually
- Miss revisit windows, leading to empty shelves and lost sales
- Generate zero structured data for management decisions

## The Solution

**For Field Reps (业务员):**
- 📍 One-tap GPS check-in with offline support
- 🗺️ Optimized daily routes via Gaode Maps
- 🔍 Discover nearby unvisited stores by radius
- 🔔 Smart revisit reminders based on store tier

**For Managers (经理):**
- 📊 Real-time field team tracking dashboard
- 🤖 AI-powered shelf photo analysis (stock counting, competitor detection)
- 📈 Inventory depletion prediction with XGBoost ML
- 🔍 Audit mode for spot-check verification

**For Companies (企业):**
- 🏢 Multi-tenant platform with business license verification
- 👥 Full employee management with role-based access
- 📋 Territory assignment and coverage gap analysis
- 📤 Export reports to Excel and WeChat

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native, Gaode Maps SDK, WatermelonDB |
| Web Dashboard | Next.js, Tailwind CSS, Recharts |
| Backend API | Node.js/Fastify, PostgreSQL + PostGIS, Redis |
| AI Inference | Qwen2.5-VL-32B, vLLM, Docker (on-premise) |
| ML Prediction | XGBoost, scikit-learn, FastAPI |
| Infrastructure | Alibaba Cloud (China mainland) |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/xundian.git
cd xundian

# Start development environment
docker-compose up -d

# Install mobile dependencies
cd apps/mobile && npm install

# Start mobile dev server
npx react-native start
```

## Project Structure

See [CLAUDE.md](./CLAUDE.md) for complete project architecture, database schema, and implementation guidelines.

## Language Support

XúnDiàn supports English and Simplified Chinese (简体中文) with a toggle switch. All strings are externalized in `/i18n/en.json` and `/i18n/zh.json`.

## Legal Compliance

- PIPL (个人信息保护法) compliant — informed consent, data minimization, China-hosted
- Business license verification for company onboarding
- GPS anti-cheat for visit authenticity
- Full audit trail for regulatory requirements

## License

Proprietary. All rights reserved.
