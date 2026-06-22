# Features Registry

| Feature | Status | Files | Notes |
|---|---|---|---|
| Setup wizard | ✅ done | `src/routes/setup.tsx`, `setup.functions.ts` | First-run flow |
| Auth (email + Google OAuth) | ✅ done | `routes/auth.tsx`, `auth.functions.ts` | Google via Lovable broker |
| 2FA (TOTP) | ✅ done | `2fa.functions.ts`, `settings/-Settings2FA.tsx` | otplib |
| SAML SSO | ✅ done | `saml.functions.ts`, `settings/-SettingsSAML.tsx` | Admin-configurable |
| Role-based access | ✅ done | `user_roles` table, `has_role()` RPC, `access.functions.ts` | super_admin/admin/reception/staff/customer |
| Multi-branch | ✅ done | `branches.tsx`, `user_branches` | Per-branch scoping |
| Multi-tenant | ✅ done | `tenants.tsx`, `tenants.functions.ts` | |
| Bookings | ✅ done | `bookings.tsx`, `bookings.functions.ts` | Public catalog API |
| Calendar | 🟡 partial | `calendar.tsx` | No drag-and-drop yet |
| Queue / kiosk display | ✅ done | `queue.tsx`, `display.$branch.tsx` | No realtime |
| Waitlist | ✅ done | `waitlist.tsx`, `waitlist.functions.ts` | |
| Customers + customer portal | ✅ done | `customers.tsx`, `my.$token.tsx`, `customer-portal.functions.ts` | |
| Services / Employees | ✅ done | `services.tsx`, `employees.tsx` | |
| Invoices + POS | ✅ done | `invoices.tsx`, `invoices/InvoiceForm.tsx`, `-InvoiceView.tsx` | PDF + thermal print |
| Payments | ✅ done | `payments` table | Cash by default |
| Memberships | ✅ done | `memberships.tsx`, `membership_plans` | |
| Coupons | ✅ done | `coupons.tsx` | |
| Loyalty / points | ✅ done | `loyalty.tsx`, `points_transactions` | |
| Inventory / products | ✅ done | `inventory.tsx`, `products.functions.ts`, `stock_movements` | |
| Commissions | ✅ done | `commissions.tsx`, `commissions.functions.ts` | |
| Reports | ✅ done | `reports.tsx`, `reports.functions.ts` | recharts; needs lazy-load |
| Reviews | ✅ done | `reviews.functions.ts` | |
| Webhooks (+ retry/DLQ) | ✅ done | `webhooks.tsx`, `webhooks.functions.ts`, `api/public/cron/*` | Now cron-secret protected |
| Audit log + archive | ✅ done | `audit.tsx`, `audit_log` + `audit_log_archive` | |
| AI suggestions | ✅ done | `ai.functions.ts`, `ai-suggestions-panel.tsx` | Lovable AI gateway |
| Push (PWA, VAPID) | ✅ done | `push.functions.ts`, `push.server.ts`, `pwa-install.tsx` | Hardcoded key fallback flagged |
| Stripe billing (BYOK) | ✅ done | `stripe.functions.ts`, `webhooks/stripe.ts`, `-SettingsStripe.tsx` | Per-branch pricing |
| Twilio SMS/WhatsApp | 🟡 wired, not connected to OTP | `twilio.functions.ts`, `-SettingsTwilio.tsx` | OFF by default |
| Backup / restore (CSV) | ✅ done | `export-tenant.functions.ts`, `restore.functions.ts`, `-SettingsData.tsx` | |
| Recurring bookings | 🟡 backend only | `recurring.functions.ts` | UI route missing |
| Per-employee shifts | ❌ missing | — | P3 backlog |
| Realtime sync | ❌ missing | — | P2 backlog |
| Drag-and-drop calendar | ❌ missing | `calendar.tsx` | P2 backlog |