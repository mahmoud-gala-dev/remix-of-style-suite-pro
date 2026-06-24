import {
  CalendarDays,
  LayoutDashboard,
  ListOrdered,
  Scissors,
  Settings,
  Store,
  Users,
  UserCog,
  ClipboardList,
  BarChart3,
  Crown,
  Ticket,
  Receipt,
  Sparkles,
  BookOpen,
  Hourglass,
  Package,
  Wallet,
  Clock,
  Megaphone,
  Gift,
  Share2,
  Activity,
  Camera,
  Truck,
  Coins,
  DollarSign,
  Wand2,
  TrendingUp,
  Calculator,
  ShieldCheck,
  PieChart,
  KeyRound,
} from "lucide-react";
import type { DictKey } from "@/lib/i18n";

export type ModuleItem = {
  id: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: DictKey;
  group: DictKey;
};

export const MODULES: ModuleItem[] = [
  { id: "dashboard", to: "/", icon: LayoutDashboard, label: "dashboard", group: "operations" },
  { id: "calendar", to: "/calendar", icon: CalendarDays, label: "calendar", group: "operations" },
  { id: "bookings", to: "/bookings", icon: ClipboardList, label: "bookings", group: "operations" },
  { id: "queue", to: "/queue", icon: ListOrdered, label: "queue", group: "operations" },
  { id: "waitlist", to: "/waitlist", icon: Hourglass, label: "waitlist", group: "operations" },
  { id: "customers", to: "/customers", icon: Users, label: "customers", group: "operations" },
  { id: "crm", to: "/crm", icon: Activity, label: "crm_timeline", group: "operations" },
  { id: "services", to: "/services", icon: Scissors, label: "services", group: "management" },
  { id: "employees", to: "/employees", icon: UserCog, label: "employees", group: "management" },
  { id: "shifts", to: "/shifts", icon: Clock, label: "shifts", group: "management" },
  { id: "branches", to: "/branches", icon: Store, label: "branches", group: "management" },
  { id: "reports", to: "/reports", icon: BarChart3, label: "reports", group: "management" },
  { id: "bi", to: "/bi", icon: TrendingUp, label: "bi", group: "management" },
  { id: "accounting", to: "/accounting", icon: Calculator, label: "accounting", group: "finance" },
  { id: "approvals", to: "/approvals", icon: ShieldCheck, label: "approvals_title", group: "management" },
  { id: "cost-allocation", to: "/cost-allocation", icon: PieChart, label: "cost_alloc_title", group: "management" },
  { id: "docs", to: "/docs", icon: BookOpen, label: "docs", group: "management" },
  { id: "settings", to: "/settings", icon: Settings, label: "settings", group: "management" },
  { id: "invoices", to: "/invoices", icon: Receipt, label: "invoices", group: "finance" },
  { id: "memberships", to: "/memberships", icon: Crown, label: "memberships", group: "finance" },
  { id: "coupons", to: "/coupons", icon: Ticket, label: "coupons", group: "finance" },
  { id: "loyalty", to: "/loyalty", icon: Sparkles, label: "loyalty", group: "finance" },
  { id: "inventory", to: "/inventory", icon: Package, label: "inventory", group: "management" },
  { id: "commissions", to: "/commissions", icon: Wallet, label: "commissions", group: "finance" },
  { id: "campaigns", to: "/campaigns", icon: Megaphone, label: "campaigns", group: "management" },
  { id: "gift_cards", to: "/gift-cards", icon: Gift, label: "gift_cards", group: "finance" },
  { id: "packages", to: "/packages", icon: Package, label: "packages", group: "finance" },
  { id: "referrals", to: "/referrals", icon: Share2, label: "referrals", group: "finance" },
  { id: "gallery", to: "/gallery", icon: Camera, label: "gallery", group: "management" },
  { id: "purchasing", to: "/purchasing", icon: Truck, label: "purchasing", group: "management" },
  { id: "expenses", to: "/expenses", icon: Coins, label: "expenses", group: "finance" },
  { id: "currency", to: "/currency", icon: DollarSign, label: "currency", group: "finance" },
  { id: "onboarding", to: "/onboarding", icon: Wand2, label: "setup_wizard", group: "management" },
  { id: "api-keys", to: "/api-keys", icon: KeyRound, label: "api_keys_title", group: "management" },
];

export const MODULE_GROUPS: DictKey[] = ["operations", "management", "finance"];