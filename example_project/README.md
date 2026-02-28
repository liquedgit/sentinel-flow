# Example Project

A minimal Python backend for SentinelFlow agent integration. Exposes `/me` for identity resolution and sample API endpoints.

## Endpoints

- `GET /` - Root
- `GET /api/ping` - Health check
- `GET /me` - Identity (returns `{"user_id": "...", "role": "..."}`)
- `GET /admin` - List all admins
- `POST /admin` - Create admin (requires `admin` role)

## Identity

The `/me` endpoint supports:

1. **X-User-Id / X-Role headers** - Direct identity
2. **Authorization: Bearer &lt;token&gt;** - Token lookup (see `app/identity.py`)

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8081
```

Or:

```bash
./run.sh
```

**Example requests:**

```bash
# List admins (no auth)
curl http://localhost:8081/admin

# Create admin as alice (admin) - succeeds
curl -X POST http://localhost:8081/admin \
  -H "Authorization: Bearer alice-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "new-admin", "email": "new@example.com"}'

# Create admin as bob (user) - 403 Forbidden
curl -X POST http://localhost:8081/admin \
  -H "Authorization: Bearer bob-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "new-admin", "email": "new@example.com"}'
```

## Integration

The SentinelFlow agent forwards requests to this backend on port 8081 and calls `/me` with forwarded auth headers to enrich access events.
