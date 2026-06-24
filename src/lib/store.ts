import { create } from "zustand";
import type {
  Booking,
  Branch,
  Customer,
  Employee,
  QueueItem,
  Service,
} from "@/types/domain";
import {
  seedBookings,
  seedBranches,
  seedCustomers,
  seedEmployees,
  seedQueue,
  seedServices,
} from "./seed";

const rid = () => Math.random().toString(36).slice(2, 10);

type DataState = {
  currentBranchId: string;
  setCurrentBranch: (id: string) => void;

  currentTenantId: string | null;
  setCurrentTenant: (id: string | null) => void;

  branches: Branch[];
  addBranch: (b: Omit<Branch, "id">) => void;
  updateBranch: (id: string, patch: Partial<Branch>) => void;
  removeBranch: (id: string) => void;

  services: Service[];
  addService: (s: Omit<Service, "id">) => void;
  updateService: (id: string, patch: Partial<Service>) => void;
  removeService: (id: string) => void;

  employees: Employee[];
  addEmployee: (e: Omit<Employee, "id">) => void;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;

  customers: Customer[];
  addCustomer: (c: Omit<Customer, "id" | "createdAt" | "visits" | "totalSpend" | "points">) => void;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  removeCustomer: (id: string) => void;

  bookings: Booking[];
  addBooking: (b: Omit<Booking, "id">) => void;
  updateBooking: (id: string, patch: Partial<Booking>) => void;
  removeBooking: (id: string) => void;

  queue: QueueItem[];
  enqueue: (q: Omit<QueueItem, "id" | "createdAt" | "position">) => void;
  updateQueue: (id: string, patch: Partial<QueueItem>) => void;
  removeQueue: (id: string) => void;

  reset: () => void;
};

export const useData = create<DataState>()((set, get) => ({
  currentBranchId: seedBranches[0].id,
  setCurrentBranch: (id) => set({ currentBranchId: id }),

  currentTenantId: null,
  setCurrentTenant: (id) => set({ currentTenantId: id }),

  branches: seedBranches,
  addBranch: (b) => set({ branches: [...get().branches, { ...b, id: rid() }] }),
  updateBranch: (id, patch) =>
    set({ branches: get().branches.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
  removeBranch: (id) => set({ branches: get().branches.filter((x) => x.id !== id) }),

  services: seedServices,
  addService: (s) => set({ services: [...get().services, { ...s, id: rid() }] }),
  updateService: (id, patch) =>
    set({ services: get().services.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
  removeService: (id) => set({ services: get().services.filter((x) => x.id !== id) }),

  employees: seedEmployees,
  addEmployee: (e) => set({ employees: [...get().employees, { ...e, id: rid() }] }),
  updateEmployee: (id, patch) =>
    set({ employees: get().employees.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
  removeEmployee: (id) => set({ employees: get().employees.filter((x) => x.id !== id) }),

  customers: seedCustomers,
  addCustomer: (c) =>
    set({
      customers: [
        ...get().customers,
        {
          ...c,
          id: rid(),
          createdAt: new Date().toISOString(),
          visits: 0,
          totalSpend: 0,
          points: 0,
        },
      ],
    }),
  updateCustomer: (id, patch) =>
    set({ customers: get().customers.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
  removeCustomer: (id) => set({ customers: get().customers.filter((x) => x.id !== id) }),

  bookings: seedBookings,
  addBooking: (b) => set({ bookings: [...get().bookings, { ...b, id: rid() }] }),
  updateBooking: (id, patch) =>
    set({ bookings: get().bookings.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
  removeBooking: (id) => set({ bookings: get().bookings.filter((x) => x.id !== id) }),

  queue: seedQueue,
  enqueue: (q) => {
    const branchQ = get().queue.filter((x) => x.branchId === q.branchId);
    set({
      queue: [
        ...get().queue,
        {
          ...q,
          id: rid(),
          createdAt: new Date().toISOString(),
          position: branchQ.length,
        },
      ],
    });
  },
  updateQueue: (id, patch) =>
    set({ queue: get().queue.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
  removeQueue: (id) => set({ queue: get().queue.filter((x) => x.id !== id) }),

  reset: () =>
    set({
      currentBranchId: seedBranches[0].id,
      branches: seedBranches,
      services: seedServices,
      employees: seedEmployees,
      customers: seedCustomers,
      bookings: seedBookings,
      queue: seedQueue,
    }),
}));

// helpers
// Stable empty-branch sentinel so consumers can safely read `.id`, `.nameAr`,
// `.chairs`, etc. before any branch is configured/hydrated. Filters using
// `branchId === ""` naturally return empty arrays.
const EMPTY_BRANCH: Branch = {
  // Valid zero-UUID so server-fn validators (z.string().uuid()) accept it
  // while still matching zero rows in the database.
  id: "00000000-0000-0000-0000-000000000000",
  tenantId: null,
  nameEn: "—",
  nameAr: "—",
  address: "",
  phone: "",
  chairs: 0,
  hoursOpen: "09:00",
  hoursClose: "22:00",
  active: false,
};

export function useCurrentBranch(): Branch {
  return useData(
    (s) =>
      s.branches.find((b) => b.id === s.currentBranchId) ??
      s.branches[0] ??
      EMPTY_BRANCH,
  );
}
