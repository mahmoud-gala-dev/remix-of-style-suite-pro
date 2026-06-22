# Known Issues

## Resolved in audit 2026-06-22
- OTP brute-force / flood window — fixed via `rateLimit("otp:request:*")` + `rateLimit("otp:verify:*")`.
- OTP code leaking in API responses — gated behind `NODE_ENV !== "production"` or `EXPOSE_OTP_FOR_TESTS=1`.
- Cron endpoints unauthenticated — now require `x-cron-secret` header matching `CRON_SECRET` env (skip when env unset for local dev).

## Open
| ID | Description | Impact | Workaround | Status |
|---|---|---|---|---|
| KI-001 | Twilio not connected to OTP send pipe | OTP works only via API response in dev | Use 2FA TOTP for now | Open (P1) |
| KI-002 | ~~Hardcoded VAPID private key fallback in `push.server.ts`~~ | — | — | **Resolved (cycle #3)** — fallback removed, env now required in every environment |
| KI-003 | No realtime; kiosk display polls | Queue updates lag | Manual refresh | Open (P2) |
| KI-004 | 11 admin pages lack loading/error states | Blank screen on query failure | Refresh page | Open (P2) |
| KI-005 | Entire app eager-bundled | Slow first paint on cold cache | — | Open (P2) |
| KI-006 | Calendar is non-interactive | Cannot drag bookings | Edit via booking form | Open (P2) |