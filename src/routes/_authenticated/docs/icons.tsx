import type { ReactNode } from "react";

const stroke = "stroke-current";
const svgBase = "w-14 h-14";

export const Icons: Record<string, ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <rect x="8" y="8" width="22" height="22" rx="4" className={stroke} strokeWidth="2" />
      <rect x="34" y="8" width="22" height="14" rx="4" className={stroke} strokeWidth="2" />
      <rect x="8" y="34" width="14" height="22" rx="4" className={stroke} strokeWidth="2" />
      <rect x="26" y="26" width="30" height="30" rx="4" className={stroke} strokeWidth="2" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <rect x="8" y="14" width="48" height="42" rx="4" className={stroke} strokeWidth="2" />
      <path d="M8 26h48" className={stroke} strokeWidth="2" />
      <path d="M20 8v12M44 8v12" className={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="38" r="2" fill="currentColor" />
      <circle cx="32" cy="38" r="2" fill="currentColor" />
      <circle cx="44" cy="38" r="2" fill="currentColor" />
      <circle cx="20" cy="48" r="2" fill="currentColor" />
      <circle cx="32" cy="48" r="2" fill="currentColor" />
    </svg>
  ),
  bookings: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <rect x="10" y="10" width="44" height="48" rx="4" className={stroke} strokeWidth="2" />
      <path d="M20 24h24M20 34h24M20 44h16" className={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="14" r="6" fill="currentColor" />
    </svg>
  ),
  queue: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <circle cx="14" cy="32" r="5" className={stroke} strokeWidth="2" />
      <circle cx="32" cy="32" r="5" className={stroke} strokeWidth="2" />
      <circle cx="50" cy="32" r="5" className={stroke} strokeWidth="2" />
      <path d="M19 32h8M37 32h8" className={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  customers: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <circle cx="24" cy="22" r="8" className={stroke} strokeWidth="2" />
      <path d="M10 52c2-8 8-12 14-12s12 4 14 12" className={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="46" cy="26" r="6" className={stroke} strokeWidth="2" />
      <path d="M40 52c1-6 5-9 10-9s9 3 10 9" className={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  services: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <circle cx="20" cy="20" r="8" className={stroke} strokeWidth="2" />
      <circle cx="20" cy="44" r="8" className={stroke} strokeWidth="2" />
      <path d="M26 26l28 22M26 38l28-22" className={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  employees: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <circle cx="32" cy="20" r="8" className={stroke} strokeWidth="2" />
      <path d="M14 54c2-10 9-16 18-16s16 6 18 16" className={stroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M40 28l4 4 8-8" className={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  branches: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M10 28l22-16 22 16v26H10z" className={stroke} strokeWidth="2" strokeLinejoin="round" />
      <rect x="26" y="36" width="12" height="18" className={stroke} strokeWidth="2" />
      <path d="M10 28h44" className={stroke} strokeWidth="2" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M10 54h44" className={stroke} strokeWidth="2" strokeLinecap="round" />
      <rect x="14" y="34" width="8" height="20" className={stroke} strokeWidth="2" />
      <rect x="28" y="22" width="8" height="32" className={stroke} strokeWidth="2" />
      <rect x="42" y="14" width="8" height="40" className={stroke} strokeWidth="2" />
    </svg>
  ),
  invoices: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M14 8h28l8 8v40l-6-4-6 4-6-4-6 4-6-4-6 4z" className={stroke} strokeWidth="2" strokeLinejoin="round" />
      <path d="M22 24h20M22 34h20M22 44h12" className={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  memberships: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M10 22l8 18 14-22 14 22 8-18-4 28H14z" className={stroke} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="32" cy="46" r="3" fill="currentColor" />
    </svg>
  ),
  coupons: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M6 20a4 4 0 014-4h44a4 4 0 014 4v8a4 4 0 000 8v8a4 4 0 01-4 4H10a4 4 0 01-4-4v-8a4 4 0 000-8z" className={stroke} strokeWidth="2" />
      <path d="M28 22v20" className={stroke} strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  ),
  loyalty: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M32 8l6 14 16 2-12 10 4 16-14-8-14 8 4-16L10 24l16-2z" className={stroke} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <circle cx="32" cy="32" r="8" className={stroke} strokeWidth="2" />
      <path d="M32 4v8M32 52v8M4 32h8M52 32h8M12 12l6 6M46 46l6 6M52 12l-6 6M18 46l-6 6" className={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  setup: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M12 20h40M12 32h40M12 44h40" className={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="20" r="4" fill="currentColor" />
      <circle cx="40" cy="32" r="4" fill="currentColor" />
      <circle cx="28" cy="44" r="4" fill="currentColor" />
    </svg>
  ),
  auth: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <rect x="14" y="28" width="36" height="28" rx="4" className={stroke} strokeWidth="2" />
      <path d="M22 28v-8a10 10 0 0120 0v8" className={stroke} strokeWidth="2" />
      <circle cx="32" cy="42" r="3" fill="currentColor" />
    </svg>
  ),
};