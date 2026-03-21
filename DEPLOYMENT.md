# RAT Analytics Deployment Guide

This guide covers various hosting options for RAT Analytics, from simple demos to enterprise deployments.

## Table of Contents

- [Quick Demo](#quick-demo)
- [One-Click Deployments](#one-click-deployments)
- [Self-Hosting](#self-hosting)
- [Cloud Platform Deployments](#cloud-platform-deployments)
- [Database Configuration](#database-configuration)

## Quick Demo

### Local Demo Environment

Perfect for testing and development:

```bash
# Clone the repository
git clone https://github.com/wenesay/rat.git
cd rat

# Run demo environment
cd demo
docker-compose -f docker-compose.demo.yml up -d

# Access at http://localhost:3000
# Demo credentials: admin/demo123, analyst/demo123
```

## One-Click Deployments

### Railway (Recommended for beginners)

1. Click the deploy button: [![Deploy to Railway](https://railway.app/button.svg)](https://railway.app/template/rat-analytics)
2. Connect your GitHub account
3. Railway will automatically:
   - Build the Docker image
   - Set up a PostgreSQL database
   - Configure environment variables
   - Deploy the application

### Render

1. Click: [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/wenesay/rat)
2. Connect your GitHub
3. Choose your plan and deploy

### DigitalOcean App Platform

1. Go to DigitalOcean App Platform
2. Create new app from GitHub
3. Select the RAT repository
4. Configure environment variables
5. Deploy

## Self-Hosting

### Docker (Recommended)

```bash
# Clone and setup
git clone https://github.com/wenesay/rat.git
cd rat

# Create environment file
cp .env.example .env
# Edit .env with your settings

# Run with Docker Compose
docker-compose up -d
```

### Manual Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env

# Start the application
npm start
```

### System Requirements

- **Node.js**: 14.0.0 or higher
- **Memory**: 512MB minimum, 1GB recommended
- **Storage**: 100MB for application, variable for database
- **OS**: Linux, macOS, Windows

## Cloud Platform Deployments

### AWS

#### Option 1: Lightsail (Simple)
```bash
# Create Lightsail instance
aws lightsail create-instances \
  --instance-names rat-analytics \
  --availability-zones us-east-1a \
  --blueprint-id nodejs \
  --bundle-id nano_2_0

# Deploy application
git clone https://github.com/wenesay/rat.git
cd rat
npm install
npm start
```

#### Option 2: ECS with Fargate
- Use the provided Dockerfile
- Set up ECS cluster
- Configure load balancer
- Attach RDS database

### Google Cloud

#### Cloud Run (Serverless)
```bash
# Build and deploy
gcloud run deploy rat-analytics \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### App Engine
```yaml
# app.yaml
runtime: nodejs18
env_variables:
  SESSION_SECRET: your-secret-here
```

### Azure

#### App Service
```bash
# Deploy to App Service
az webapp up \
  --name rat-analytics \
  --resource-group myResourceGroup \
  --runtime "NODE:18-lts"
```



Perfect for single instances and development:

```bash
# Environment variables
DATABASE_PATH=./analytics.db
```

### PostgreSQL

Recommended for production:

```bash
# Environment variables
DATABASE_URL=postgresql://user:pass@host:5432/rat_db

# Or individual settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rat_analytics
DB_USER=rat_user
DB_PASS=secure_password
```

### MySQL

For enterprise environments:

```bash
DATABASE_URL=mysql://user:pass@host:3306/rat_db
```

### Database Migration

When switching databases:

1. Export data from current database
2. Update environment variables
3. Run the application (it will create tables automatically)
4. Import data using database-specific tools

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SESSION_SECRET` | Yes | - | Secret for session encryption |
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `ALLOWED_ORIGINS` | No | http://localhost:3000 | CORS allowed origins |
| `DATABASE_URL` | No | - | Full database connection URL |
| `DATABASE_PATH` | No | ./analytics.db | SQLite database path |
| `DEMO_MODE` | No | false | Enable demo features |

## Monitoring & Maintenance

### Health Checks

The application provides health check endpoints:

- `GET /health` - Basic health check
- `GET /api/status` - Detailed status with metrics

### Logs

```bash
# View application logs
docker-compose logs -f rat-analytics

# Or for manual installation
npm run logs
```

### Backups

```bash
# SQLite backup
cp analytics.db analytics-$(date +%Y%m%d).db

# PostgreSQL backup
pg_dump rat_db > backup-$(date +%Y%m%d).sql
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find process using port 3000
   lsof -i :3000
   # Kill the process
   kill -9 <PID>
   ```

2. **Database connection failed**
   - Check DATABASE_URL format
   - Verify database server is running
   - Check firewall settings

3. **Session secret not set**
   ```bash
   export SESSION_SECRET=$(openssl rand -hex 32)
   ```

### Support

- 📖 [Documentation](https://github.com/wenesay/rat/wiki)
- 🐛 [Bug Reports](https://github.com/wenesay/rat/issues)
- 💬 [Discussions](https://github.com/wenesay/rat/discussions)