export type ID = string;

export type Branch = {
  id: ID;
  nameEn: string;
  nameAr: string;
  address: string;
  phone: string;
  chairs: number;
  hoursOpen: string; // "09:00"
  hoursClose: string; // "22:00"
  active: boolean;
};

export type Gender = "male" | "female" | "both";

export type Service = {
  id: ID;
  branchId: ID;
  nameEn: string;
  nameAr: string;
  category: string;
  durationMin: number;
  price: number;
  gender: Gender;
  active: boolean;
};

export type Employee = {
  id: ID;
  branchId: ID;
  nameEn: string;
  nameAr: string;
  phone: string;
  email?: string;
  role: "barber" | "stylist" | "reception" | "admin";
  commissionPct: number;
  rating: number;
  active: boolean;
};

export type Customer = {
  id: ID;
  branchId: ID;
  name: string;
  phone: string;
  email?: string;
  gender?: Gender;
  birthday?: string;
  notes?: string;
  visits: number;
  totalSpend: number;
  points: number;
  lastVisit?: string;
  createdAt: string;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "arrived"
  | "waiting"
  | "inProgress"
  | "completed"
  | "cancelled"
  | "noShow";

export type Booking = {
  id: ID;
  branchId: ID;
  customerId: ID;
  employeeId: ID;
  serviceId: ID;
  start: string; // ISO
  end: string;
  status: BookingStatus;
  price: number;
  notes?: string;
};

export type QueueItem = {
  id: ID;
  branchId: ID;
  customerId: ID;
  employeeId?: ID;
  serviceId?: ID;
  status: "waiting" | "called" | "inProgress" | "completed" | "cancelled";
  createdAt: string;
  position: number;
};
