# Docker Deployment Guide

This directory contains Docker configuration for deploying the RPI-CNC-proj simulator.

## Architecture

The application consists of two services:

1. **Frontend** - Nginx serving static simulator files (port 8080)
2. **Backend** - Node.js WebSocket server for collaborative editing (port 8765)

## Quick Start

### Development

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production

```bash
# Build with production optimizations
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check health status
docker-compose ps
```

## Access

- **Simulator UI:** http://localhost:8080/front.html
- **WebSocket Server:** ws://localhost:8765
- **Health Check:** http://localhost:8080/health

## Configuration

### Environment Variables

**Frontend:**

- `WEBSOCKET_URL` - WebSocket server URL (default: ws://localhost:8765)

**Backend:**

- `PORT` - WebSocket server port (default: 8765)
- `NODE_ENV` - Environment (development/production)

### Volumes

- `backend-data` - Persistent storage for session data

## Building Images

```bash
# Frontend
docker build -f Dockerfile.frontend -t cnc-simulator-frontend:latest .

# Backend
docker build -f Dockerfile.backend -t cnc-simulator-backend:latest .
```

## Health Checks

Both services include health checks:

- **Frontend:** HTTP GET to /
- **Backend:** WebSocket connection test
- **Interval:** 30 seconds
- **Timeout:** 3 seconds
- **Retries:** 3

## Troubleshooting

### Check service status

```bash
docker-compose ps
docker-compose logs backend
docker-compose logs frontend
```

### Restart services

```bash
docker-compose restart backend
docker-compose restart frontend
```

### Clean rebuild

```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Access container shell

```bash
docker exec -it cnc-simulator-backend sh
docker exec -it cnc-simulator-frontend sh
```

## Security Considerations

- Backend runs as non-root user (nodejs:1001)
- Nginx security headers enabled
- Health checks don't log to reduce noise
- Hidden files (.git, .env) are denied by nginx
- Production images use multi-stage builds for smaller size

## Performance

- Frontend uses gzip compression
- Static assets cached for 1 year
- Worker processes auto-scaled
- TCP optimizations enabled

## Scaling

To run multiple backend instances:

```bash
docker-compose up -d --scale backend=3
```

Note: You'll need a load balancer for WebSocket connections.
