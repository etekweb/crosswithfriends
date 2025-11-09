# Docker Deployment Guide

This guide covers building and deploying the CrossWithFriends backend using Docker.

## Files Overview

- **`Dockerfile`** - Main production Dockerfile with multi-stage builds
- **`Dockerfile.prod`** - Enhanced production Dockerfile with additional optimizations
- **`server/Dockerfile`** - Alternative Dockerfile for server-only builds
- **`docker-compose.yml`** - Docker Compose configuration for local/production deployment
- **`.dockerignore`** - Files to exclude from Docker build context

## Quick Start

### Build the Docker Image

```bash
# Using the main Dockerfile
docker build -t crosswithfriends-backend:latest .

# Or using the production-optimized Dockerfile
docker build -f Dockerfile.prod -t crosswithfriends-backend:latest .
```

### Run the Container

```bash
docker run -d \
  --name crosswithfriends-backend \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  --env-file .env.production \
  crosswithfriends-backend:latest
```

### Using Docker Compose

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

## Production Best Practices

### 1. Security

- ✅ **Non-root user**: Container runs as `nodejs` user (UID 1001)
- ✅ **Minimal base image**: Uses `node:18-alpine` for smaller attack surface
- ✅ **Security updates**: Base image is regularly updated
- ✅ **No new privileges**: Security options prevent privilege escalation
- ✅ **Read-only filesystem**: Can be enabled if app doesn't need to write files

### 2. Performance

- ✅ **Multi-stage builds**: Reduces final image size
- ✅ **Layer caching**: Package.json copied first for better cache hits
- ✅ **Production dependencies only**: Dev dependencies excluded from final image
- ✅ **Alpine Linux**: Smaller base image (~5MB vs ~150MB)

### 3. Reliability

- ✅ **Health checks**: Built-in health check endpoint
- ✅ **Signal handling**: Uses `dumb-init` for proper signal handling
- ✅ **Graceful shutdown**: Handles SIGTERM/SIGINT properly
- ✅ **Resource limits**: Can be set via docker-compose

### 4. Monitoring

The container includes a health check endpoint at `/api/health`:

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45
}
```

## Environment Variables

Required environment variables (set via `.env.production` or `-e` flags):

- `NODE_ENV=production` - Sets Node.js to production mode
- `PORT=3000` - Server port (default: 3000)
- Database connection strings (if applicable)
- Other service credentials

## Image Size Optimization

The multi-stage build results in a smaller final image:

- **Dependencies stage**: ~200MB (with all node_modules)
- **Build stage**: ~300MB (with dev dependencies)
- **Production stage**: ~150MB (production dependencies only)

## Building for Different Platforms

```bash
# Build for AMD64 (default)
docker build -t crosswithfriends-backend:latest .

# Build for ARM64 (Apple Silicon, Raspberry Pi)
docker build --platform linux/arm64 -t crosswithfriends-backend:arm64 .

# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 -t crosswithfriends-backend:latest .
```

## Troubleshooting

### Container exits immediately

Check logs:
```bash
docker logs crosswithfriends-backend
```

Common issues:
- Missing environment variables
- Port conflicts
- Database connection issues

### Health check fails

Verify the health endpoint is accessible:
```bash
docker exec crosswithfriends-backend curl http://localhost:3000/api/health
```

### Permission errors

If you see permission errors, ensure:
- Files are owned by the correct user (UID 1001)
- Volume mounts have correct permissions

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -f Dockerfile.prod -t crosswithfriends-backend:${{ github.sha }} .
      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push crosswithfriends-backend:${{ github.sha }}
```

## Production Deployment

### Recommended Settings

1. **Resource Limits**:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2.0'
         memory: 1G
   ```

2. **Restart Policy**:
   ```yaml
   restart: unless-stopped
   ```

3. **Health Checks**:
   - Interval: 30s
   - Timeout: 10s
   - Retries: 3

4. **Logging**:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

## Security Scanning

Scan your image for vulnerabilities:

```bash
# Using Trivy
trivy image crosswithfriends-backend:latest

# Using Docker Scout
docker scout cves crosswithfriends-backend:latest
```

## Updating the Image

1. Pull latest changes
2. Rebuild the image
3. Stop old container
4. Start new container

```bash
git pull
docker build -f Dockerfile.prod -t crosswithfriends-backend:latest .
docker stop crosswithfriends-backend
docker rm crosswithfriends-backend
docker run -d --name crosswithfriends-backend -p 3000:3000 --env-file .env.production crosswithfriends-backend:latest
```

## Notes

- The Dockerfile uses `ts-node` to run TypeScript directly. For better performance in production, consider compiling TypeScript to JavaScript first.
- The health check endpoint is registered at `/api/health` - ensure this route is accessible.
- Adjust resource limits based on your actual usage patterns.

