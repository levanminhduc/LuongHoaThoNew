# Docker Setup Guide

## Quick Start

### Development

```bash
docker compose up -d --build
```

### Production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Multi-stage Build                         │
├─────────────────────────────────────────────────────────────┤
│  Stage 1: base      │ Node.js 20.18.1 Alpine + libc6-compat │
│  Stage 2: deps      │ npm ci với cache mount                │
│  Stage 3: builder   │ next build → standalone output        │
│  Stage 4: runner    │ Minimal runtime (~200MB final image)  │
└─────────────────────────────────────────────────────────────┘
```

## Files

| File                      | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `Dockerfile`              | Multi-stage build cho Next.js standalone |
| `compose.yml`             | Development config                       |
| `docker-compose.prod.yml` | Production config với security hardening |
| `.dockerignore`           | Exclude node_modules, .git, etc.         |
| `docker-entrypoint.sh`    | Runtime environment injection            |

## Environment Variables

Runtime environment được inject qua `docker-entrypoint.sh`:

```yaml
environment:
  - NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
  - SUPABASE_SERVICE_ROLE_KEY=xxx
  - JWT_SECRET=xxx
```

## Commands

### Build

```bash
docker build -t luong-hoatho .

docker build --build-arg NODE_VERSION=20.18.1 -t luong-hoatho .
```

### Run

```bash
docker compose up -d

docker compose logs -f app

docker compose ps
```

### Clean

```bash
docker compose down

docker compose down -v

docker system prune -af
```

## Healthcheck

Container sử dụng homepage (`/`) để kiểm tra health:

```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:3000/"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Resource Limits (Production)

```yaml
deploy:
  resources:
    limits:
      cpus: "2"
      memory: 1G
    reservations:
      cpus: "0.5"
      memory: 256M
```

## Troubleshooting

### Peer Dependency Error

Nếu gặp lỗi `react-day-picker` với React 19:

```bash
npm install --legacy-peer-deps
```

Dockerfile đã include flag này.

### Container Unhealthy

1. Kiểm tra logs:

   ```bash
   docker compose logs app
   ```

2. Kiểm tra environment variables được inject đúng:
   ```bash
   docker compose exec app env | grep NEXT_PUBLIC
   ```

### Build Cache

Sử dụng npm cache mount để tăng tốc build:

```dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps
```

## Security Notes

- Chạy với non-root user (`nextjs:nodejs`)
- Standalone output chỉ include files cần thiết
- Production config có `read_only: true` và `no-new-privileges`
