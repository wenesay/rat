# Demo Environment Setup

This directory contains demo configurations for showcasing RAT Analytics.

## Quick Demo Setup

1. **Clone and setup:**

   ```bash
   git clone https://github.com/wenesay/rat.git
   cd rat
   cp .env.example .env
   # Edit .env with demo credentials
   ```

2. **Run demo:**

   ```bash
   docker-compose -f docker-compose.demo.yml up -d
   ```

3. **Access demo at:** `http://localhost:3000`

## Demo Features

- Pre-populated with sample analytics data
- Demo user accounts (admin/demo123, viewer/demo123)
- Sample projects and tracking data
- Read-only mode for public access
