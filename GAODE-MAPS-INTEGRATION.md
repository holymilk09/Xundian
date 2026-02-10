# XúnDiàn — Gaode Maps (高德地图) API Integration Guide

## Overview

XúnDiàn uses Gaode Maps (AMap) as its mapping, geocoding, and route planning provider. Google Maps is blocked in mainland China. Gaode is the market leader (~1B MAU), owned by Alibaba/AutoNavi, and is the standard for Chinese B2B field apps.

## Coordinate System — CRITICAL

China mandates the GCJ-02 coordinate system ("Mars coordinates"). WGS-84 (standard GPS) is **illegal** to use directly in mapping applications in China.

- **Phone GPS** returns WGS-84 natively
- **Gaode SDK** automatically converts WGS-84 → GCJ-02 when using their positioning SDK
- **If doing manual coordinate work**, use Gaode's coordinate conversion API: `https://restapi.amap.com/v3/assistant/coordinate/convert`
- **Never store or display raw WGS-84 coordinates** on any map rendered in China
- Gaode's SDK handles this transparently — just use their SDK for positioning and it's compliant

## Architecture: Backend-Proxied API Calls

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Rep's Phone    │     │  XúnDiàn Backend │     │  Gaode Web API  │
│  (Android/iOS)  │────▶│  (Alibaba Cloud) │────▶│  restapi.amap.com│
│                 │◀────│                  │◀────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Why backend-proxied (not direct from app):
1. **Security**: API key stays on server, never embedded in APK/IPA where it can be extracted
2. **Caching**: Geocoded store addresses are cached in DB — repeat visits = zero API calls
3. **Key rotation**: Swap keys (personal → enterprise) by changing one env var, zero app updates
4. **Rate limiting**: Server-side control over burst traffic
5. **Compliance**: Logging and audit trail for all location API usage (PIPL/CSL requirement)

### What runs on-device (FREE, no API quota):
- **Map rendering** — Gaode Android/iOS SDK, no daily limit
- **GPS positioning** — Gaode location SDK, no daily limit
- **On-device search** — SDK-level POI search, no daily limit

### What runs through backend (COUNTED against API quota):
- **Geocoding** (address → coordinates): Used when onboarding new stores
- **Reverse geocoding** (coordinates → address): Used for check-in address resolution
- **Route planning** (driving/walking directions): Used for route optimization between stores
- **POI search** (find nearby businesses): Used for store discovery/validation

## API Quotas

### Personal Developer (个人开发者)
- Registration: lbs.amap.com + Alipay real-name verification (Chinese person required)
- Setup time: ~10 minutes

| Service | Daily Limit (per key) | Burst Limit |
|---|---|---|
| Geocoding / Reverse Geocoding | 200,000/day | 10,000/10min |
| Route Planning | 100,000/day | 5,000/10min |
| POI / Place Search | 100,000/day | 50,000/10min |
| Input Suggestions | 100,000/day | 50,000/10min |
| Static Maps | 25,000/day | 2,500/10min |
| IP Positioning | 100,000/day | 5,000/10min |
| **Effective total** | **~300,000/day** | — |

### Enterprise Developer (企业开发者)
- Registration: Requires Chinese business license (营业执照)
- Setup time: 1-3 business days for verification
- Quota: ~3,000,000/day (10x personal)
- Upgrade path: Same API, same code — just swap key

### Commercial License (商业授权)
- Required if: charging users, bidding on projects, or any revenue-generating use
- For the pilot phase as an "internal tool" this is likely not required
- Revisit when transitioning to paid SaaS product

## Pilot Phase Capacity Planning

**Scenario: Sichuan + Chongqing pilot, 200-500 reps**

Typical rep daily usage:
- GPS check-in at store → 1 reverse geocode call (or 0 if store already cached)
- Visit 10-15 stores/day → 10-15 reverse geocode calls (first visit only per store)
- Route to next store → 10-15 route planning calls
- Add new store → 1 geocode call (one-time)
- **Conservative estimate: ~30 API calls/rep/day**

| Reps | Daily Calls | % of Personal Quota (300K) |
|---|---|---|
| 50 (initial test) | 1,500 | 0.5% |
| 200 | 6,000 | 2% |
| 500 | 15,000 | 5% |
| 4,000 (full rollout) | 120,000 | 40% |

**Conclusion: Personal developer tier is sufficient through full national rollout.** Enterprise tier only needed if adding location-heavy features (real-time tracking, continuous route recalculation, etc.)

## Caching Strategy (Critical for Efficiency)

### Store Location Cache
- When a store is first geocoded, save coordinates in the database
- Subsequent visits to the same store → pull from DB, zero API calls
- For a company with ~100,000 stores, this is ~100K one-time geocode calls (done in batch during onboarding)
- After initial geocoding, daily API usage drops to mainly route planning + new store additions

### Cache Invalidation
- Re-geocode only if store address is manually updated
- Set a TTL of 90 days as a safety net for address database changes
- POI data can be cached for 24 hours

### Batch Geocoding for Store Onboarding
- When customer provides their store master list (CSV/Excel with addresses)
- Batch geocode all addresses on backend during import
- Gaode supports batch geocoding — multiple addresses per request
- Respect burst limits: 10,000 requests per 10 minutes for geocoding
- 100,000 stores ÷ 10,000 per 10 min = ~100 minutes to geocode entire store database

## Implementation Notes

### API Key Configuration
```
# Environment variable — single source of truth
GAODE_API_KEY=your_key_here
GAODE_API_SECRET=your_secret_here  # Required since Dec 2021 security upgrade
```

### Key Security (Required since Dec 2021)
Gaode requires a paired security key (安全密钥) for all new API keys. For Web Service API calls from the backend, this means:
- Generate a digital signature for each request using the security key
- The signature is an MD5 hash of the sorted query parameters + security key
- Never transmit the security key itself — only the computed signature

### Base URLs
```
# Web Service API (backend calls)
https://restapi.amap.com/v3/    # v3 API
https://restapi.amap.com/v5/    # v5 API (route planning 2.0)

# Key endpoints for XúnDiàn
GET /v3/geocode/geo              # Address → coordinates
GET /v3/geocode/regeo            # Coordinates → address (check-in)
GET /v5/direction/driving         # Driving route planning
GET /v3/place/around             # Nearby POI search
GET /v3/assistant/coordinate/convert  # Coordinate system conversion
```

### Android SDK Integration
```gradle
// build.gradle
dependencies {
    implementation 'com.amap.api:3dmap:latest'        // 3D map rendering
    implementation 'com.amap.api:location:latest'      // GPS positioning
    implementation 'com.amap.api:search:latest'        // On-device search
}
```

### Key Permissions (Android)
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
```

**PIPL Compliance Reminder**: GPS is classified as Sensitive Personal Information under PIPL. The app MUST:
- Show a separate, explicit consent popup for location access (beyond Android system prompt)
- Explain why location is needed in plain Chinese
- Provide option to withdraw consent
- Only collect location on-demand (during check-in), never in background
- Store location data encrypted (AES-256)

## Migration Path

| Phase | API Key Source | Quota | Cost |
|---|---|---|---|
| Development/Testing | Customer's employee personal dev account | 300K/day | Free |
| Pilot (Sichuan/CQ) | Same personal dev account | 300K/day | Free |
| Production (national) | Customer's enterprise account OR family company enterprise account | 3M/day | Free |
| Scale (if needed) | Commercial license with Gaode | Custom | Negotiated |

The transition between phases requires changing **one environment variable** on the backend. Zero code changes, zero app updates.

## Alternatives (Not Recommended for Primary, but Good to Know)

| Provider | Pros | Cons |
|---|---|---|
| **Baidu Maps** | Strong in northern/western China, good POI data | Uses BD-09 coordinate system (different from GCJ-02), requires separate conversion, smaller user base for field apps |
| **Tencent Maps** | WeChat ecosystem integration | Smaller coverage, less developer community |
| **Huawei Maps** | Good for Huawei devices | Limited to Huawei ecosystem |

**Gaode is the correct choice** — it's the industry standard for logistics, delivery, and field operations apps in China (used by DiDi, Ele.me, Cainiao, etc.)

## Documentation References

- Gaode Open Platform: https://lbs.amap.com/
- Web Service API docs: https://lbs.amap.com/api/webservice/summary
- Android SDK docs: https://lbs.amap.com/api/android-sdk/summary
- iOS SDK docs: https://lbs.amap.com/api/ios-sdk/summary
- Quota/rate limits: https://lbs.amap.com/api/webservice/guide/tools/flowlevel
- Coordinate conversion: https://lbs.amap.com/api/webservice/guide/api/convert
- MCP Server (for AI integration): https://lbs.amap.com/api/mcp-server/summary
