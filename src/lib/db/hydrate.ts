import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/lib/store";
import type {
  Booking,
  BookingStatus,
  Branch,
  Customer,
  Employee,
  Gender,
  QueueItem,
  Service,
} from "@/types/domain";

const dbToStatus: Record<string, BookingStatus> = {
  pending: "pending",
  confirmed: "confirmed",
  arrived: "arrived",
  waiting: "waiting",
  in_progress: "inProgress",
  completed: "completed",
  cancelled: "cancelled",
  no_show: "noShow",
};
const dbToQueueStatus: Record<string, QueueItem["status"]> = {
  waiting: "waiting",
  called: "called",
  in_progress: "inProgress",
  completed: "completed",
  cancelled: "cancelled",
};

async function fetchAll() {
  const [br, sv, em, cu, bk, q] = await Promise.all([
    supabase.from("branches").select("*"),
    supabase.from("services").select("*"),
    supabase.from("employees").select("*"),
    supabase.from("customers").select("*"),
    supabase.from("bookings").select("*"),
    supabase.from("queue_items").select("*"),
  ]);
  for (const r of [br, sv, em, cu, bk, q]) {
    if (r.error) throw new Error(r.error.message);
  }
  const branches: Branch[] = (br.data ?? []).map((r) => ({
    id: r.id,
    tenantId: (r as { tenant_id?: string | null }).tenant_id ?? null,
    nameEn: r.name_en,
    nameAr: r.name_ar,
    address: r.address ?? "",
    phone: r.phone ?? "",
    chairs: r.chairs,
    hoursOpen: r.hours_open,
    hoursClose: r.hours_close,
    active: r.active,
  }));
  const services: Service[] = (sv.data ?? []).map((r) => ({
    id: r.id,
    branchId: r.branch_id,
    nameEn: r.name_en,
    nameAr: r.name_ar,
    category: r.category ?? "",
    durationMin: r.duration_min,
    price: Number(r.price),
    gender: (r.gender ?? "both") as Gender,
    active: r.active,
  }));
  const employees: Employee[] = (em.data ?? []).map((r) => ({
    id: r.id,
    branchId: r.branch_id,
    nameEn: r.name_en,
    nameAr: r.name_ar,
    phone: r.phone ?? "",
    email: r.email ?? undefined,
    role: (r.role as Employee["role"]) ?? "barber",
    commissionPct: Number(r.commission_pct),
    rating: Number(r.rating),
    active: r.active,
  }));
  const customers: Customer[] = (cu.data ?? []).map((r) => ({
    id: r.id,
    branchId: r.branch_id,
    name: r.name,
    phone: r.phone ?? "",
    email: r.email ?? undefined,
    gender: (r.gender ?? undefined) as Gender | undefined,
    birthday: r.birthday ?? undefined,
    notes: r.notes ?? undefined,
    visits: r.visits,
    totalSpend: Number(r.total_spend),
    points: r.points,
    lastVisit: r.last_visit ?? undefined,
    createdAt: r.created_at,
  }));
  const bookings: Booking[] = (bk.data ?? []).map((r) => ({
    id: r.id,
    branchId: r.branch_id,
    customerId: r.customer_id,
    employeeId: r.employee_id,
    serviceId: r.service_id,
    start: r.start_at,
    end: r.end_at,
    status: dbToStatus[r.status] ?? "pending",
    price: Number(r.price),
    notes: r.notes ?? undefined,
  }));
  const queue: QueueItem[] = (q.data ?? []).map((r) => ({
    id: r.id,
    branchId: r.branch_id,
    customerId: r.customer_id,
    employeeId: r.employee_id ?? undefined,
    serviceId: r.service_id ?? undefined,
    status: dbToQueueStatus[r.status] ?? "waiting",
    createdAt: r.created_at,
    position: r.position,
  }));
  return { branches, services, employees, customers, bookings, queue };
}

export function useHydrate() {
  const query = useQuery({
    queryKey: ["hydrate"],
    queryFn: fetchAll,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!query.data) return;
    const { branches, services, employees, customers, bookings, queue } = query.data;
    useData.setState((s) => ({
      branches,
      services,
      employees,
      customers,
      bookings,
      queue,
      currentBranchId:
        branches.find((b) => b.id === s.currentBranchId)?.id ?? branches[0]?.id ?? s.currentBranchId,
    }));
  }, [query.data]);

  return query;
}