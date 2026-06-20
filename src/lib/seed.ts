import type {
  Booking,
  Branch,
  Customer,
  Employee,
  QueueItem,
  Service,
} from "@/types/domain";

const rid = () => Math.random().toString(36).slice(2, 10);

export const seedBranches: Branch[] = [
  {
    id: "br-downtown",
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
    id: "br-mall",
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
    id: "br-vip",
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
  { id: "sv1", branchId: "br-downtown", nameEn: "Signature Beard Sculpt", nameAr: "نحت لحية", category: "Beard", durationMin: 30, price: 90, gender: "male", active: true },
  { id: "sv2", branchId: "br-downtown", nameEn: "Classic Fade", nameAr: "تدرج كلاسيكي", category: "Hair", durationMin: 45, price: 110, gender: "male", active: true },
  { id: "sv3", branchId: "br-downtown", nameEn: "Royal Shave", nameAr: "حلاقة ملكية", category: "Shave", durationMin: 40, price: 130, gender: "male", active: true },
  { id: "sv4", branchId: "br-downtown", nameEn: "Keratin Treatment", nameAr: "علاج الكيراتين", category: "Treatment", durationMin: 120, price: 480, gender: "female", active: true },
  { id: "sv5", branchId: "br-downtown", nameEn: "Highlights & Blowout", nameAr: "صبغة وتمليس", category: "Color", durationMin: 90, price: 320, gender: "female", active: true },
  { id: "sv6", branchId: "br-mall", nameEn: "Kids Cut", nameAr: "قص أطفال", category: "Hair", durationMin: 25, price: 60, gender: "both", active: true },
  { id: "sv7", branchId: "br-mall", nameEn: "Skin Fade", nameAr: "تدرج جلد", category: "Hair", durationMin: 40, price: 100, gender: "male", active: true },
  { id: "sv8", branchId: "br-vip", nameEn: "Hot Towel Ritual", nameAr: "طقوس المنشفة الساخنة", category: "Premium", durationMin: 60, price: 220, gender: "male", active: true },
];

export const seedEmployees: Employee[] = [
  { id: "em1", branchId: "br-downtown", nameEn: "Alex Rivera", nameAr: "أليكس ريفيرا", phone: "+971 50 111 2233", role: "barber", commissionPct: 35, rating: 4.9, active: true },
  { id: "em2", branchId: "br-downtown", nameEn: "Elena Sokolova", nameAr: "إيلينا سوكولوفا", phone: "+971 50 222 3344", role: "stylist", commissionPct: 40, rating: 4.8, active: true },
  { id: "em3", branchId: "br-downtown", nameEn: "Marcus King", nameAr: "ماركوس كينج", phone: "+971 50 333 4455", role: "barber", commissionPct: 30, rating: 4.7, active: true },
  { id: "em4", branchId: "br-mall", nameEn: "Yusra Haddad", nameAr: "يسرى حداد", phone: "+971 50 444 5566", role: "stylist", commissionPct: 35, rating: 4.6, active: true },
  { id: "em5", branchId: "br-vip", nameEn: "Omar Farouk", nameAr: "عمر فاروق", phone: "+971 50 555 6677", role: "barber", commissionPct: 45, rating: 5.0, active: true },
];

export const seedCustomers: Customer[] = [
  { id: "cu1", branchId: "br-downtown", name: "Julian O'Connor", phone: "+971 55 100 0001", email: "julian@example.com", gender: "male", visits: 12, totalSpend: 1320, points: 240, lastVisit: at(-1), createdAt: at(-200) },
  { id: "cu2", branchId: "br-downtown", name: "Layla Hassan / ليلى حسن", phone: "+971 55 100 0002", gender: "female", visits: 6, totalSpend: 2200, points: 180, lastVisit: at(-3), createdAt: at(-160) },
  { id: "cu3", branchId: "br-downtown", name: "Michael Thorne", phone: "+971 55 100 0003", gender: "male", visits: 18, totalSpend: 1980, points: 360, lastVisit: at(0), createdAt: at(-340) },
  { id: "cu4", branchId: "br-downtown", name: "Sarah Jenkins", phone: "+971 55 100 0004", gender: "female", visits: 4, totalSpend: 1640, points: 95, lastVisit: at(-5), createdAt: at(-90) },
  { id: "cu5", branchId: "br-downtown", name: "Omar Mansour / عمر منصور", phone: "+971 55 100 0005", gender: "male", visits: 9, totalSpend: 990, points: 200, lastVisit: at(-2), createdAt: at(-180) },
  { id: "cu6", branchId: "br-mall", name: "Aisha Karim / عائشة كريم", phone: "+971 55 100 0006", gender: "female", visits: 3, totalSpend: 420, points: 60, lastVisit: at(-7), createdAt: at(-40) },
  { id: "cu7", branchId: "br-vip", name: "Khalid Al-Sayed", phone: "+971 55 100 0007", gender: "male", visits: 24, totalSpend: 5280, points: 720, lastVisit: at(-1), createdAt: at(-500) },
];

export const seedBookings: Booking[] = [
  { id: "bk1", branchId: "br-downtown", customerId: "cu1", employeeId: "em1", serviceId: "sv1", start: at(10), end: at(10, 30), status: "completed", price: 90 },
  { id: "bk2", branchId: "br-downtown", customerId: "cu2", employeeId: "em2", serviceId: "sv5", start: at(10, 45), end: at(12, 15), status: "completed", price: 320 },
  { id: "bk3", branchId: "br-downtown", customerId: "cu3", employeeId: "em1", serviceId: "sv2", start: at(11, 30), end: at(12, 15), status: "inProgress", price: 110 },
  { id: "bk4", branchId: "br-downtown", customerId: "cu4", employeeId: "em2", serviceId: "sv4", start: at(13), end: at(15), status: "confirmed", price: 480 },
  { id: "bk5", branchId: "br-downtown", customerId: "cu5", employeeId: "em3", serviceId: "sv3", start: at(14, 30), end: at(15, 10), status: "confirmed", price: 130 },
  { id: "bk6", branchId: "br-downtown", customerId: "cu1", employeeId: "em1", serviceId: "sv1", start: at(16), end: at(16, 30), status: "pending", price: 90 },
  { id: "bk7", branchId: "br-mall", customerId: "cu6", employeeId: "em4", serviceId: "sv6", start: at(11), end: at(11, 25), status: "confirmed", price: 60 },
  { id: "bk8", branchId: "br-vip", customerId: "cu7", employeeId: "em5", serviceId: "sv8", start: at(12), end: at(13), status: "confirmed", price: 220 },
];

export const seedQueue: QueueItem[] = [
  { id: rid(), branchId: "br-downtown", customerId: "cu3", employeeId: "em1", serviceId: "sv2", status: "inProgress", createdAt: at(11, 20), position: 0 },
  { id: rid(), branchId: "br-downtown", customerId: "cu5", status: "waiting", createdAt: at(11, 35), position: 1 },
  { id: rid(), branchId: "br-downtown", customerId: "cu1", status: "waiting", createdAt: at(11, 48), position: 2 },
  { id: rid(), branchId: "br-downtown", customerId: "cu4", status: "waiting", createdAt: at(11, 55), position: 3 },
];
