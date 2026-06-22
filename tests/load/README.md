# Load Testing with k6

These scripts exercise the **published** Vanguard Salon OS endpoints with
[k6](https://k6.io/). They are not part of `bunx vitest run` — they require a
running deployment and are invoked manually.

## Install k6

```bash
brew install k6        # macOS
sudo apt-get install k6  # Linux
docker run --rm -i grafana/k6 run - <tests/load/healthcheck.js
```

## Run

```bash
BASE_URL=https://project--<id>.lovable.app k6 run tests/load/healthcheck.js
BASE_URL=https://project--<id>.lovable.app k6 run tests/load/booking-catalog.js
BASE_URL=https://project--<id>.lovable.app k6 run tests/load/web-vitals-beacon.js
```

## Scenarios

| Script | Endpoint | Profile | SLO |
|---|---|---|---|
| `healthcheck.js` | `GET /api/public/healthcheck` | 20 VUs × 30s | p95 < 300ms, error rate < 1% |
| `booking-catalog.js` | `GET /_serverFn/getPublicBookingCatalog` | 10 VUs × 60s ramp | p95 < 800ms, error rate < 2% |
| `web-vitals-beacon.js` | `POST /api/public/web-vitals` | 50 VUs × 30s | p95 < 250ms, error rate < 1% |

Thresholds are encoded in each script — k6 exits non-zero when breached, so
wire it into CI for release gating.
