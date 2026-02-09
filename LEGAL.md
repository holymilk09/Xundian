# Legal & Compliance — XúnDiàn (巡店)

## Overview

XúnDiàn operates within China's data protection framework, which consists of three primary laws:

1. **PIPL** (个人信息保护法) — Personal information protection (China's GDPR equivalent)
2. **CSL** (网络安全法) — Cybersecurity law 
3. **DSL** (数据安全法) — Data security law
4. **Network Data Security Management Regulation** (effective January 1, 2025)

## Personal Information We Process

| Data Type | Classification | Purpose | Legal Basis |
|-----------|---------------|---------|-------------|
| Employee name, phone | Personal Information | Account management | Employment contract |
| GPS location (real-time) | **Sensitive PI** | Check-in verification, route tracking | Explicit consent |
| Store visit photos | Personal Information | Shelf analysis, proof-of-visit | Explicit consent |
| Visit timestamps | Personal Information | Performance analytics | Employment contract |
| Device information | Personal Information | Anti-fraud, security | Legitimate interest |

## PIPL Compliance Requirements

### Consent & Transparency
- [ ] Display privacy policy on first launch (bilingual: EN + ZH)
- [ ] Obtain **separate explicit consent** for GPS tracking (Article 29)
- [ ] Obtain **separate explicit consent** for camera access and photo storage
- [ ] Explain data usage purpose clearly — no vague "improve services" language
- [ ] Provide easy consent withdrawal mechanism (Settings → Privacy)
- [ ] Re-obtain consent if processing purposes change

### Data Minimization
- [ ] GPS collected only during working hours (configurable by company)
- [ ] GPS accuracy sufficient for verification (~50m), not centimeter-level tracking
- [ ] Photos processed and results extracted; raw photos retained per company policy only
- [ ] Minimal employee profile data: name, phone, role, territory only

### Data Subject Rights (Article 44-49)
- [ ] Right to access: Employee can view all their visit data
- [ ] Right to correction: Employee can request data corrections
- [ ] Right to deletion: Employee can request data deletion (subject to retention policy)
- [ ] Right to portability: Export personal data in machine-readable format
- [ ] Right to withdraw consent: Must stop processing upon withdrawal

### Data Retention
- Visit data: Retain for **3 years** (standard business records), then auto-delete
- Photos: Retain for **1 year** (or company-configured), then auto-delete
- Employee data: Delete within **30 days** of employment termination
- AI analysis results: Retain with visit data, anonymize on deletion

### Data Residency (Critical)
- **ALL data must be stored on mainland China servers**
- Recommended: Alibaba Cloud Shanghai or Shenzhen region
- No cross-border transfer without CAC security assessment
- If company is foreign-owned: requires Standard Contractual Clauses filing with provincial CAC

### Personal Information Protection Impact Assessment (PIA)
Required before launch. Must cover:
1. Legality, legitimacy, necessity of processing
2. Impact on individual rights and interests
3. Security measures and their effectiveness
4. Risk of personal information leakage
5. Emergency response plan

### Incident Response
- **1 hour**: Report to provincial CAC for incidents affecting 10,000+ individuals
- **24 hours**: Notify affected individuals
- **30 days**: Submit comprehensive incident report
- Maintain incident response plan and test annually

## Company Onboarding Requirements

### Business License Verification (营业执照)
Every company registering on XúnDiàn must provide:
- Valid business license image
- Unified Social Credit Code (统一社会信用代码)
- Legal representative name
- Company address

We verify against the National Enterprise Credit Information Publicity System (国家企业信用信息公示系统).

### Data Processing Agreement
Each company signs a data processing agreement that covers:
- What data XúnDiàn processes on their behalf
- Data retention and deletion policies
- Security measures
- Sub-processor list (Alibaba Cloud, etc.)
- Incident notification procedures

## Technical Security Measures

### At Rest
- PostgreSQL database encryption (AES-256)
- Alibaba OSS server-side encryption for photos
- Encryption keys managed by Alibaba KMS

### In Transit
- TLS 1.3 for all API communications
- Certificate pinning in mobile app
- Encrypted sync protocol for offline data

### Access Control
- Role-based access control (RBAC) at company level
- Multi-tenant data isolation (company_id on every row)
- API rate limiting per company
- Admin audit log for all data access

### Anti-Fraud
- GPS geofence validation on check-in
- Timestamp drift detection (client vs server)
- Photo EXIF metadata validation
- Anomaly detection on visit patterns

## WeChat Mini Program Considerations

If launching as WeChat Mini Program:
- Must comply with Tencent's additional privacy requirements
- User data accessible to Tencent per their platform terms
- Additional privacy disclosures required in Mini Program settings
- Review and approval required by Tencent before launch

## Key Contacts

- **CAC (Cyberspace Administration of China)**: www.cac.gov.cn
- **PIPL Inquiry Hotline**: 12377
- **National Enterprise Credit System**: www.gsxt.gov.cn

## Disclaimer

This document provides guidance for compliance planning. It is NOT legal advice. Engage a qualified China data privacy lawyer before launch. Key firms specializing in China PIPL compliance include: Zhong Lun (中伦), JunHe (君合), King & Wood Mallesons (金杜).
