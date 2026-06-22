import type {
  Booking,
  Branch,
  Customer,
  Employee,
  QueueItem,
  Service,
} from "@/types/domain";

const rid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14).padStart(12, "0");

// Stable UUIDs for seed entities — keeps demo data compatible with `z.string().uuid()`
// server-fn validators (debt #15, cycle #11).
const BR_DOWNTOWN = "11111111-1111-4111-8111-111111111101";
const BR_MALL = "11111111-1111-4111-8111-111111111102";
const BR_VIP = "11111111-1111-4111-8111-111111111103";

const SV = (n: number) => `22222222-2222-4222-8222-2222222222${n.toString().padStart(2, "0")}`;
const EM = (n: number) => `33333333-3333-4333-8333-3333333333${n.toString().padStart(2, "0")}`;
const CU = (n: number) => `44444444-4444-4444-8444-4444444444${n.toString().padStart(2, "0")}`;
const BK = (n: number) => `55555555-5555-4555-8555-5555555555${n.toString().padStart(2, "0")}`;

export const seedBranches: Branch[] = [
  {
    id: BR_DOWNTOWN,
    nameEn: "Downtown Studio",
    nameAr: "استوديو وسط المدينة",
    address: "12 Sheikh Zayed Rd, Dubai",
    phone: "+971 4 555 0101",
    chairs: 6,
    hoursOpen: "09:00",
    hoursClose: "22:00",
    active: true,
  },
  {
    id: BR_MALL,
    nameEn: "Mall Branch",
    nameAr: "فرع المول",
    address: "Mall of the Emirates, L2",
    phone: "+971 4 555 0202",
    chairs: 4,
    hoursOpen: "10:00",
    hoursClose: "23:00",
    active: true,
  },
  {
    id: BR_VIP,
    nameEn: "VIP Lounge",
    nameAr: "صالة كبار الشخصيات",
    address: "Marina Walk, Tower 3",
    phone: "+971 4 555 0303",
    chairs: 3,
    hoursOpen: "11:00",
    hoursClose: "23:00",
    active: true,
  },
];

const today = new Date();
const at = (h: number, m = 0) => {
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const seedServices: Service[] = [
  { id: SV(1), branchId: BR_DOWNTOWN, nameEn: "Signature Beard Sculpt", nameAr: "نحت لحية", category: "Beard", durationMin: 30, price: 90, gender: "male", active: true },
  { id: SV(2), branchId: BR_DOWNTOWN, nameEn: "Classic Fade", nameAr: "تدرج كلاسيكي", category: "Hair", durationMin: 45, price: 110, gender: "male", active: true },
  { id: SV(3), branchId: BR_DOWNTOWN, nameEn: "Royal Shave", nameAr: "حلاقة ملكية", category: "Shave", durationMin: 40, price: 130, gender: "male", active: true },
  { id: SV(4), branchId: BR_DOWNTOWN, nameEn: "Keratin Treatment", nameAr: "علاج الكيراتين", category: "Treatment", durationMin: 120, price: 480, gender: "female", active: true },
  { id: SV(5), branchId: BR_DOWNTOWN, nameEn: "Highlights & Blowout", nameAr: "صبغة وتمليس", category: "Color", durationMin: 90, price: 320, gender: "female", active: true },
  { id: SV(6), branchId: BR_MALL, nameEn: "Kids Cut", nameAr: "قص أطفال", category: "Hair", durationMin: 25, price: 60, gender: "both", active: true },
  { id: SV(7), branchId: BR_MALL, nameEn: "Skin Fade", nameAr: "تدرج جلد", category: "Hair", durationMin: 40, price: 100, gender: "male", active: true },
  { id: SV(8), branchId: BR_VIP, nameEn: "Hot Towel Ritual", nameAr: "طقوس المنشفة الساخنة", category: "Premium", durationMin: 60, price: 220, gender: "male", active: true },
];

export const seedEmployees: Employee[] = [
  { id: EM(1), branchId: BR_DOWNTOWN, nameEn: "Alex Rivera", nameAr: "أليكس ريفيرا", phone: "+971 50 111 2233", role: "barber", commissionPct: 35, rating: 4.9, active: true },
  { id: EM(2), branchId: BR_DOWNTOWN, nameEn: "Elena Sokolova", nameAr: "إيلينا سوكولوفا", phone: "+971 50 222 3344", role: "stylist", commissionPct: 40, rating: 4.8, active: true },
  { id: EM(3), branchId: BR_DOWNTOWN, nameEn: "Marcus King", nameAr: "ماركوس كينج", phone: "+971 50 333 4455", role: "barber", commissionPct: 30, rating: 4.7, active: true },
  { id: EM(4), branchId: BR_MALL, nameEn: "Yusra Haddad", nameAr: "يسرى حداد", phone: "+971 50 444 5566", role: "stylist", commissionPct: 35, rating: 4.6, active: true },
  { id: EM(5), branchId: BR_VIP, nameEn: "Omar Farouk", nameAr: "عمر فاروق", phone: "+971 50 555 6677", role: "barber", commissionPct: 45, rating: 5.0, active: true },
];

export const seedCustomers: Customer[] = [
  { id: CU(1), branchId: BR_DOWNTOWN, name: "Julian O'Connor", phone: "+971 55 100 0001", email: "julian@example.com", gender: "male", visits: 12, totalSpend: 1320, points: 240, lastVisit: at(-1), createdAt: at(-200) },
  { id: CU(2), branchId: BR_DOWNTOWN, name: "Layla Hassan / ليلى حسن", phone: "+971 55 100 0002", gender: "female", visits: 6, totalSpend: 2200, points: 180, lastVisit: at(-3), createdAt: at(-160) },
  { id: CU(3), branchId: BR_DOWNTOWN, name: "Michael Thorne", phone: "+971 55 100 0003", gender: "male", visits: 18, totalSpend: 1980, points: 360, lastVisit: at(0), createdAt: at(-340) },
  { id: CU(4), branchId: BR_DOWNTOWN, name: "Sarah Jenkins", phone: "+971 55 100 0004", gender: "female", visits: 4, totalSpend: 1640, points: 95, lastVisit: at(-5), createdAt: at(-90) },
  { id: CU(5), branchId: BR_DOWNTOWN, name: "Omar Mansour / عمر منصور", phone: "+971 55 100 0005", gender: "male", visits: 9, totalSpend: 990, points: 200, lastVisit: at(-2), createdAt: at(-180) },
  { id: CU(6), branchId: BR_MALL, name: "Aisha Karim / عائشة كريم", phone: "+971 55 100 0006", gender: "female", visits: 3, totalSpend: 420, points: 60, lastVisit: at(-7), createdAt: at(-40) },
  { id: CU(7), branchId: BR_VIP, name: "Khalid Al-Sayed", phone: "+971 55 100 0007", gender: "male", visits: 24, totalSpend: 5280, points: 720, lastVisit: at(-1), createdAt: at(-500) },
];

export const seedBookings: Booking[] = [
  { id: BK(1), branchId: BR_DOWNTOWN, customerId: CU(1), employeeId: EM(1), serviceId: SV(1), start: at(10), end: at(10, 30), status: "completed", price: 90 },
  { id: BK(2), branchId: BR_DOWNTOWN, customerId: CU(2), employeeId: EM(2), serviceId: SV(5), start: at(10, 45), end: at(12, 15), status: "completed", price: 320 },
  { id: BK(3), branchId: BR_DOWNTOWN, customerId: CU(3), employeeId: EM(1), serviceId: SV(2), start: at(11, 30), end: at(12, 15), status: "inProgress", price: 110 },
  { id: BK(4), branchId: BR_DOWNTOWN, customerId: CU(4), employeeId: EM(2), serviceId: SV(4), start: at(13), end: at(15), status: "confirmed", price: 480 },
  { id: BK(5), branchId: BR_DOWNTOWN, customerId: CU(5), employeeId: EM(3), serviceId: SV(3), start: at(14, 30), end: at(15, 10), status: "confirmed", price: 130 },
  { id: BK(6), branchId: BR_DOWNTOWN, customerId: CU(1), employeeId: EM(1), serviceId: SV(1), start: at(16), end: at(16, 30), status: "pending", price: 90 },
  { id: BK(7), branchId: BR_MALL, customerId: CU(6), employeeId: EM(4), serviceId: SV(6), start: at(11), end: at(11, 25), status: "confirmed", price: 60 },
  { id: BK(8), branchId: BR_VIP, customerId: CU(7), employeeId: EM(5), serviceId: SV(8), start: at(12), end: at(13), status: "confirmed", price: 220 },
];

export const seedQueue: QueueItem[] = [
  { id: rid(), branchId: BR_DOWNTOWN, customerId: CU(3), employeeId: EM(1), serviceId: SV(2), status: "inProgress", createdAt: at(11, 20), position: 0 },
  { id: rid(), branchId: BR_DOWNTOWN, customerId: CU(5), status: "waiting", createdAt: at(11, 35), position: 1 },
  { id: rid(), branchId: BR_DOWNTOWN, customerId: CU(1), status: "waiting", createdAt: at(11, 48), position: 2 },
  { id: rid(), branchId: BR_DOWNTOWN, customerId: CU(4), status: "waiting", createdAt: at(11, 55), position: 3 },
];
