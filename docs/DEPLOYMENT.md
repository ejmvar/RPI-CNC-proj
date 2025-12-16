# CNC Simulator Deployment Guide

Complete guide for deploying the CNC Simulator in various environments.

## Table of Contents

- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Production Checklist](#production-checklist)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 15+ (or Docker)
- Git

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/RPI-CNC-proj.git
cd RPI-CNC-proj

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start PostgreSQL (Docker)
docker-compose up -d postgres

# Run migrations
npm run db:migrate

# Start development servers
npm run dev
```

### Environment Variables

Create `.env` file:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cnc_simulator
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8000

# WebSocket
WS_PORT=3001

# File Upload
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_DIR=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Development Servers

**Frontend:**

```bash
cd Simulator/web
python3 -m http.server 8000
# Access: http://localhost:8000/front.html
```

**Backend:**

```bash
npm run dev
# API: http://localhost:3001
# WebSocket: ws://localhost:3001/ws
```

---

## Docker Deployment

### Prerequisites

- Docker 20+
- Docker Compose 2+

### Development with Docker

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up --build
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    image: nginx:alpine
    volumes:
      - ./Simulator/web:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - '3000:80'
    depends_on:
      - backend

  backend:
    build: .
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=cnc_simulator
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    ports:
      - '3001:3001'
    depends_on:
      - postgres
    volumes:
      - ./uploads:/app/uploads

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=cnc_simulator
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

volumes:
  postgres_data:
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream backend {
        server backend:3001;
    }

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index front.html;

        # Frontend static files
        location / {
            try_files $uri $uri/ /front.html;
        }

        # API proxy
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket proxy
        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
        }

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
}
```

---

## Cloud Deployment

### AWS Deployment

#### Architecture

```
┌─────────────────────────────────────────┐
│         Route 53 (DNS)                  │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│  CloudFront (CDN) + WAF                 │
└─────────────────────────────────────────┘
         │                    │
         │                    │
┌────────▼────────┐  ┌────────▼────────┐
│  S3 (Frontend)  │  │  ALB (Backend)  │
└─────────────────┘  └─────────────────┘
                              │
                     ┌────────┴────────┐
                     │                 │
              ┌──────▼──────┐   ┌──────▼──────┐
              │ ECS/Fargate │   │ ECS/Fargate │
              │  (Backend)  │   │  (Backend)  │
              └─────────────┘   └─────────────┘
                     │
              ┌──────▼──────┐
              │ RDS Postgres│
              └─────────────┘
```

#### S3 + CloudFront (Frontend)

```bash
# Build frontend
npm run build

# Upload to S3
aws s3 sync ./Simulator/web s3://your-bucket-name/ \
  --exclude "*.md" \
  --cache-control "public, max-age=31536000"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

#### ECS Fargate (Backend)

```bash
# Build and push Docker image
docker build -t your-repo/cnc-backend:latest .
docker push your-repo/cnc-backend:latest

# Update ECS service
aws ecs update-service \
  --cluster cnc-cluster \
  --service cnc-backend \
  --force-new-deployment
```

#### RDS PostgreSQL

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier cnc-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.3 \
  --master-username admin \
  --master-user-password YourPassword \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-subnet-group-name your-subnet-group \
  --backup-retention-period 7
```

### Google Cloud Platform

#### Architecture

```
Cloud Load Balancer
      │
      ├─── Cloud Storage (Frontend)
      │
      └─── Cloud Run (Backend)
             │
             └─── Cloud SQL (PostgreSQL)
```

#### Cloud Storage (Frontend)

```bash
# Upload to Cloud Storage
gsutil -m rsync -r ./Simulator/web gs://your-bucket-name/

# Make bucket public
gsutil iam ch allUsers:objectViewer gs://your-bucket-name
```

#### Cloud Run (Backend)

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/your-project/cnc-backend
gcloud run deploy cnc-backend \
  --image gcr.io/your-project/cnc-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DB_HOST=your-sql-ip,JWT_SECRET=your-secret"
```

#### Cloud SQL (PostgreSQL)

```bash
# Create Cloud SQL instance
gcloud sql instances create cnc-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --backup-start-time=03:00
```

### DigitalOcean

#### Droplet Setup

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone and deploy
git clone https://github.com/your-org/RPI-CNC-proj.git
cd RPI-CNC-proj
cp .env.example .env
# Edit .env
docker-compose up -d
```

#### DigitalOcean App Platform

```yaml
# .do/app.yaml
name: cnc-simulator
services:
  - name: backend
    github:
      repo: your-org/RPI-CNC-proj
      branch: main
      deploy_on_push: true
    build_command: npm install
    run_command: npm start
    envs:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        type: SECRET
        value: ${JWT_SECRET}
    http_port: 3001

  - name: frontend
    github:
      repo: your-org/RPI-CNC-proj
      branch: main
    source_dir: /Simulator/web
    static_sites:
      - name: web
        build_command: echo "Static site"
        output_dir: /

databases:
  - name: cnc-db
    engine: PG
    version: '15'
```

---

## Production Checklist

### Security

- [ ] Change default JWT_SECRET (min 32 characters)
- [ ] Use environment variables (never commit secrets)
- [ ] Enable HTTPS/SSL (Let's Encrypt or cloud provider)
- [ ] Configure CORS with specific origins
- [ ] Enable rate limiting
- [ ] Set secure cookie flags (httpOnly, secure, sameSite)
- [ ] Implement CSP headers
- [ ] Regular security audits (`npm audit`)
- [ ] Database encryption at rest
- [ ] Firewall rules (allow only necessary ports)

### Performance

- [ ] Enable gzip/brotli compression
- [ ] Configure CDN for static assets
- [ ] Enable browser caching headers
- [ ] Database connection pooling
- [ ] Query optimization and indexing
- [ ] Enable service worker caching
- [ ] Minify and bundle JavaScript
- [ ] Optimize images and assets
- [ ] Load testing (Apache Bench, k6)
- [ ] Monitor performance metrics

### Monitoring

- [ ] Setup error tracking (Sentry, Rollbar)
- [ ] Log aggregation (ELK, CloudWatch)
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Performance monitoring (New Relic, Datadog)
- [ ] Database monitoring
- [ ] Alerts for critical errors
- [ ] Metrics dashboard

### Backup

- [ ] Automated database backups (daily)
- [ ] Test restore procedures
- [ ] Off-site backup storage
- [ ] Backup retention policy (30 days)
- [ ] Document recovery procedures

### Documentation

- [ ] API documentation updated
- [ ] Deployment runbook created
- [ ] Incident response plan
- [ ] Disaster recovery plan
- [ ] Changelog maintained

---

## Monitoring

### Health Check Endpoints

```bash
# Backend health
curl http://localhost:3001/health

# Database health
curl http://localhost:3001/health/db

# WebSocket health
wscat -c ws://localhost:3001/ws
```

### Logging

**Production logging:**

```javascript
// Use structured logging
logger.info('User logged in', {
  userId: user.id,
  ip: req.ip,
  timestamp: new Date().toISOString(),
});

logger.error('Database error', {
  error: err.message,
  stack: err.stack,
  query: query,
});
```

### Metrics

**Key metrics to track:**

- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (%)
- Database connection pool usage
- WebSocket connections (active)
- Memory usage (MB)
- CPU usage (%)

---

## Troubleshooting

### Common Issues

**Issue: Database connection failed**

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -h localhost -U postgres -d cnc_simulator

# Check environment variables
echo $DB_HOST $DB_PORT $DB_NAME
```

**Issue: WebSocket not connecting**

```bash
# Check if port is open
netstat -an | grep 3001

# Test WebSocket
wscat -c ws://localhost:3001/ws?token=YOUR_TOKEN

# Check nginx proxy config
nginx -t
```

**Issue: High memory usage**

```bash
# Check Node.js memory
node --max-old-space-size=4096 server.js

# Monitor with PM2
pm2 monit

# Check for memory leaks
node --inspect server.js
```

**Issue: Service worker not updating**

```javascript
// Clear service worker cache
navigator.serviceWorker.getRegistration().then((reg) => {
  reg.unregister();
  window.location.reload();
});
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm start

# Node.js inspector
node --inspect-brk server.js
# Open chrome://inspect in Chrome
```

### Support

- **Documentation:** https://docs.your-domain.com
- **Issues:** https://github.com/your-org/RPI-CNC-proj/issues
- **Discord:** https://discord.gg/your-invite
- **Email:** support@your-domain.com

---

## Performance Tuning

### Database Optimization

```sql
-- Add indexes
CREATE INDEX idx_gcode_files_user_id ON gcode_files(user_id);
CREATE INDEX idx_gcode_files_created_at ON gcode_files(created_at DESC);
CREATE INDEX idx_gcode_files_folder_id ON gcode_files(folder_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM gcode_files WHERE user_id = 1;

-- Update statistics
ANALYZE gcode_files;
```

### Node.js Optimization

```bash
# Use production mode
NODE_ENV=production node server.js

# Enable clustering
node --max-old-space-size=4096 server.js

# Use PM2 for process management
pm2 start server.js -i max --name cnc-backend
```

### Nginx Caching

```nginx
# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

---

## Scaling

### Horizontal Scaling

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cnc-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cnc-backend
  template:
    spec:
      containers:
        - name: backend
          image: your-repo/cnc-backend:latest
          ports:
            - containerPort: 3001
          env:
            - name: DB_HOST
              value: postgres-service
```

### Load Balancing

```nginx
upstream backend {
    least_conn;
    server backend1:3001;
    server backend2:3001;
    server backend3:3001;
}
```

---

**For detailed information, see:**

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Performance Guide](./PERFORMANCE.md)
