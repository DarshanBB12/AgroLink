export type Role = "farmer" | "worker" | "equipment_owner" | "admin";
export type ListingType = "equipment" | "worker" | "seed" | "fertilizer";
export type OrderStatus = "pending" | "approved" | "completed" | "rejected" | "cancelled";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Listing {
  id: string;
  type: ListingType;
  name: string;
  category: string;
  description: string;
  price: number;
  priceUnit: string;
  rating: number;
  location: string;
  available: boolean;
  distanceKm: number | null;
  hasCoordinates: boolean;
  coordinates?: { lat: number; lng: number } | null;
  owner: { id: string; name: string; location: string } | null;
  details: Record<string, unknown> & {
    discount?: number;
    fine?: number;
    specs?: { power?: string; fuel?: string; capacity?: string; year?: number };
    skills?: string[];
    stock?: number;
    season?: string;
    crop?: string;
    variety?: string;
    fertilizerType?: string;
    npkRatio?: string;
    imageEmoji?: string;
    germinationRate?: string;
    maturityDays?: number;
    benefits?: string[];
    suitableCrops?: string[];
    notes?: string;
  };
  createdAt: string;
}

export interface Party {
  id: string;
  name?: string;
  location?: string;
  phone?: string;
  email?: string;
}

export interface Order {
  id: string;
  type: ListingType;
  status: OrderStatus;
  paymentStatus: "unpaid" | "paid" | "refunded";
  paymentMode: "razorpay" | "test" | null;
  itemId: string;
  itemName: string;
  price: number;
  unit?: string;
  discountPercent: number;
  totalPrice: number;
  quantity: number;
  duration: number;
  startDate: string;
  endDate: string | null;
  notes: string;
  cancelReason: string;
  location: string;
  paidAt: string | null;
  canPay: boolean;
  farmer: Party;
  provider: Party;
  createdAt: string;
  updatedAt: string;
  review?: { rating: number; comment: string; createdAt: string } | null;
  payment?: { id: string; transactionRef: string; receiptNo: string; mode: string; status: string; paidAt: string; amount: number } | null;
}

export interface Txn {
  id: string;
  transactionRef: string;
  receiptNo: string | null;
  type: string;
  purpose: "order" | "emi" | "other";
  amount: number;
  currency: string;
  status: "created" | "pending" | "completed" | "failed" | "cancelled" | "refunded";
  mode: "razorpay" | "test" | "offline";
  isTest: boolean;
  description: string;
  relatedId: string | null;
  relatedModel: string | null;
  failureReason: string;
  paidAt: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string } | null;
  payer?: { name: string; email?: string } | null;
  order?: { itemName: string; type: string; quantity: number; duration: number; price: number; totalPrice: number; status: string } | null;
}

export interface NotificationPrefs {
  booking: boolean;
  payment: boolean;
  message: boolean;
  weather: boolean;
  sound?: boolean;
  desktop?: boolean;
}

export interface ListingPrefs {
  defaultPricingUnit: "hour" | "day";
  autoAcceptRequests: boolean;
  showPhoneAfterApproval: boolean;
}

export interface ChatUser {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  location: string;
  isOnline: boolean;
}
