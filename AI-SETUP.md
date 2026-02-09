# AI Shelf Recognition — On-Premise Setup Guide
# AI货架识别 — 本地部署指南

## Overview 概述

XúnDiàn's AI shelf recognition runs on your company's own hardware. This keeps costs near-zero and your data on-premise. The system automatically processes shelf photos from your field reps and returns structured analysis results to the XúnDiàn platform.

XúnDiàn的AI货架识别在贵公司自有硬件上运行。这使成本接近零，数据保留在本地。系统自动处理业务员的货架照片，并将结构化分析结果返回XúnDiàn平台。

## Hardware Requirements 硬件要求

### Minimum (up to 200 photos/day)
- **GPU**: NVIDIA RTX 4090 (24GB VRAM)
- **CPU**: Intel i7-13700K or AMD Ryzen 9 7900X
- **RAM**: 32GB DDR5
- **Storage**: 500GB NVMe SSD
- **Network**: 100Mbps+ internet connection
- **OS**: Ubuntu 22.04 LTS

**Estimated cost 预估成本**: ¥15,000-20,000 (JD.com / Taobao)

### Recommended (200-1000 photos/day)
- **GPU**: NVIDIA A100 40GB (or 2x RTX 4090)
- **CPU**: Intel Xeon or AMD EPYC
- **RAM**: 64GB DDR5
- **Storage**: 1TB NVMe SSD
- **Network**: 500Mbps+ internet connection

### Enterprise (1000+ photos/day)
- Contact us for multi-GPU cluster configuration

## Quick Start 快速开始

### Step 1: Install Docker + NVIDIA Runtime

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify GPU is visible
docker run --rm --gpus all nvidia/cuda:12.1-base-ubuntu22.04 nvidia-smi
```

### Step 2: Download and Configure XúnDiàn AI Kit

```bash
# Download AI Kit
curl -fsSL https://ai.xundian.com/setup.sh | bash

# This creates ~/xundian-ai/ with:
# - docker-compose.yml
# - config.yml
# - prompts/ (shelf analysis prompt templates)
```

### Step 3: Configure Connection

Edit `~/xundian-ai/config.yml`:

```yaml
# XúnDiàn Platform Connection
platform:
  api_url: https://api.xundian.com
  company_id: YOUR_COMPANY_ID      # From XúnDiàn dashboard
  api_key: YOUR_AI_SERVER_KEY       # From Settings → AI Configuration

# Photo Source (Alibaba OSS)
oss:
  endpoint: oss-cn-shanghai.aliyuncs.com
  bucket: YOUR_COMPANY_BUCKET       # Provided during onboarding
  access_key: YOUR_OSS_KEY
  secret_key: YOUR_OSS_SECRET

# Model Configuration
model:
  name: Qwen2.5-VL-32B-AWQ         # Quantized for single GPU
  max_batch_size: 4                 # Adjust based on VRAM
  timeout_seconds: 30

# Processing
processing:
  poll_interval_seconds: 10         # How often to check for new photos
  max_concurrent: 4                 # Parallel inference jobs
  retry_attempts: 3
```

### Step 4: Start the Service

```bash
cd ~/xundian-ai
docker-compose up -d

# Check logs
docker-compose logs -f

# Verify health
curl http://localhost:8080/health
# Expected: {"status":"ok","model":"Qwen2.5-VL-32B-AWQ","gpu":"NVIDIA RTX 4090"}
```

### Step 5: Verify in XúnDiàn Dashboard

1. Go to XúnDiàn Manager Dashboard → Settings → AI Configuration
2. Click "Test Connection"
3. Upload a test shelf photo
4. Confirm analysis results appear within 30 seconds

## How It Works 工作原理

```
Rep takes photo → Uploads to OSS → AI Kit polls OSS for new photos
→ Downloads photo → Runs Qwen2.5-VL inference → Generates JSON analysis
→ Pushes results to XúnDiàn API → Results appear in app + dashboard
```

### Processing Time
- Single photo: 3-8 seconds (RTX 4090)
- Batch of 10: 15-30 seconds (concurrent processing)
- Daily capacity: ~5,000 photos (RTX 4090, conservative estimate)

## Product Catalog Setup 产品目录配置

For best AI accuracy, configure your product catalog in XúnDiàn:

1. Go to Company Setup → Product Catalog
2. Add each product with:
   - Product name (Chinese + English)
   - SKU number
   - Reference photo (clear, well-lit product image)
   - Category (soy sauce, vinegar, oyster sauce, etc.)

The AI uses this catalog to identify YOUR products specifically on shelves.

## Troubleshooting 故障排除

| Issue | Solution |
|-------|---------|
| `CUDA out of memory` | Reduce `max_batch_size` to 2 in config.yml |
| Photos not processing | Check OSS credentials in config.yml |
| Low confidence scores | Upload better reference images in Product Catalog |
| Connection refused | Ensure firewall allows outbound HTTPS to api.xundian.com |
| Model download slow | First startup downloads ~18GB model. Allow 30-60 min |

## Maintenance 维护

### Updates
```bash
cd ~/xundian-ai
docker-compose pull
docker-compose up -d
```

Model improvements are delivered via container updates automatically.

### Monitoring
- Health endpoint: `http://localhost:8080/health`
- Metrics endpoint: `http://localhost:8080/metrics` (Prometheus format)
- Processing stats: `http://localhost:8080/stats`

### Backup
The AI Kit is stateless. All results are pushed to XúnDiàn's cloud platform. No local backup needed.

## Alternative: Cloud-Hosted AI (Premium)

If you prefer not to manage hardware, XúnDiàn offers cloud-hosted AI inference:
- **Price**: ¥0.5 per photo analyzed
- **Setup**: Zero — just enable in dashboard
- **SLA**: 99.9% uptime, <10s processing time
- **Limitation**: Photos are processed on XúnDiàn's servers (still within mainland China)

Contact sales@xundian.com for cloud AI pricing.
