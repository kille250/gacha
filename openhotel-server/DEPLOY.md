# OpenHotel Server - Render.com Deployment

## Quick Start

### 1. Setup OpenHotel Server Files

Run the setup script to copy OpenHotel files:

**Windows (PowerShell):**
```powershell
cd openhotel-server
powershell -ExecutionPolicy Bypass -File setup.ps1
```

**Linux/Mac:**
```bash
cd openhotel-server
bash setup.sh
```

This copies the necessary files from `openhotel-reference/` (the cloned OpenHotel repo).

### 2. Enable in render.yaml

Uncomment the OpenHotel service in `render.yaml`:

```yaml
# OpenHotel Server (Social Rooms)
- type: web
  name: openhotel-server
  runtime: docker
  region: frankfurt
  plan: free
  rootDir: openhotel-server
  dockerfilePath: ./Dockerfile
  # ... rest of config
```

Also uncomment the frontend environment variables:

```yaml
- key: VITE_OPENHOTEL_ENABLED
  value: "true"
- key: VITE_OPENHOTEL_HTTP_URL
  fromService:
    type: web
    name: openhotel-server
    property: host
```

### 3. Deploy

Push to GitHub. Render will automatically:
1. Build the Docker image for OpenHotel server
2. Rebuild the frontend with OpenHotel enabled
3. Connect them via service discovery

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│  gacha-frontend     │────▶│  gacha-api          │
│  (Static Site)      │     │  (Node.js)          │
└─────────────────────┘     └─────────────────────┘
         │
         │ WebSocket (wss://)
         ▼
┌─────────────────────┐
│  openhotel-server   │
│  (Deno + Docker)    │
│  ┌───────────────┐  │
│  │  Deno KV DB   │  │
│  └───────────────┘  │
└─────────────────────┘
```

## Health Checks

- **OpenHotel**: `GET /info` returns server status
- **Gacha API**: `GET /api/health` returns API status

Render monitors these endpoints and restarts services if unhealthy.

## Persistent Storage

OpenHotel uses Deno KV for data persistence. The `render.yaml` configures a 1GB disk at `/app/data` for this.

## Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `PORT` | openhotel-server | Server port (auto-set by Render) |
| `FRONTEND_URL` | openhotel-server | CORS origin |
| `VITE_OPENHOTEL_ENABLED` | frontend | Enable integration |
| `VITE_OPENHOTEL_HTTP_URL` | frontend | Server URL |

## Troubleshooting

### Cold Start Delays

Render free tier has cold starts. The WebSocket adapter handles this with:
- 15-second connection timeout (vs 10s for dev)
- Exponential backoff up to 30 seconds
- 10 reconnection attempts (vs 5 for dev)

### Connection Drops

The adapter automatically:
- Reconnects on visibility change (mobile/tab focus)
- Reconnects when network comes back online
- Queues messages during disconnection

### Logs

View logs in Render dashboard or use:

```bash
render logs --service openhotel-server
```
