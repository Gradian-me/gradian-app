// User and Authentication Types
export type LocalizedField = string | Record<string, string>;

export interface User {
  id: string;
  email: string;
  name: LocalizedField;
  username?: string;
  lastname?: LocalizedField; // Last name field
  role: 'admin' | 'procurement' | 'vendor';
  department?: string;
  avatar?: string;
  status?: Array<{ id: string; icon?: string; color?: string; label?: string }>;
  entityType?: Array<{ id: string; icon?: string; color?: string; label?: string }>;
  relatedCompanies?: Array<{ id: string; label: string; logo?: string }>;
  profile_id?: string;
  isAdmin?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

// Vendor Types
export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  registrationNumber: string;
  taxId: string;
  status: 'active' | 'inactive' | 'pending';
  categories: string[];
  rating: number;
  joinedDate: Date;
  primaryContact: Contact;
  performanceMetrics: PerformanceMetrics;
  certifications: Certification[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  isPrimary: boolean;
}

export interface PerformanceMetrics {
  onTimeDelivery: number;
  qualityScore: number;
  priceCompetitiveness: number;
  responsiveness: number;
  complianceScore: number;
  totalOrders: number;
  totalValue: number;
  averageOrderValue: number;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate: Date;
  status: 'active' | 'expired' | 'pending';
  documentUrl?: string;
}

// Tender Types
export interface Tender {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedValue: number;
  currency: string;
  status: 'draft' | 'published' | 'closed' | 'awarded' | 'cancelled';
  publishedDate?: Date;
  closingDate: Date;
  awardDate?: Date;
  createdBy: string;
  awardedTo?: string;
  evaluationCriteria: EvaluationCriteria;
  items: TenderItem[];
  quotations: Quotation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TenderItem {
  id: string;
  productName: string;
  description: string;
  quantity: number;
  unit: string;
  specifications: string;
  estimatedUnitPrice: number;
  totalEstimatedPrice: number;
}

export interface EvaluationCriteria {
  price: number; // percentage weight
  quality: number;
  delivery: number;
  experience: number;
}

// Quotation Types
export interface Quotation {
  id: string;
  tenderId: string;
  vendorId: string;
  vendor: Vendor;
  submittedDate: Date;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected';
  totalAmount: number;
  currency: string;
  validityDays: number;
  paymentTerms: string;
  deliveryTerms: string;
  deliveryTime: number; // in days
  notes?: string;
  items: QuotationItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotationItem {
  id: string;
  tenderItemId: string;
  unitPrice: number;
  totalPrice: number;
  specifications: string;
  notes?: string;
}

// Purchase Order Types
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendor: Vendor;
  tenderId?: string;
  quotationId?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled';
  totalAmount: number;
  currency: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  paymentTerms: string;
  deliveryTerms: string;
  expectedDeliveryDate: Date;
  items: PurchaseOrderItem[];
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItem {
  id: string;
  productName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  specifications?: string;
}

// Shipment Types
export interface Shipment {
  id: string;
  shipmentNumber: string;
  purchaseOrderId: string;
  purchaseOrder: PurchaseOrder;
  vendorId: string;
  vendor: Vendor;
  status: 'pending' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled';
  trackingNumber?: string;
  carrier?: string;
  estimatedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  shippingAddress: Address;
  items: ShipmentItem[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShipmentItem {
  id: string;
  purchaseOrderItemId: string;
  quantity: number;
  receivedQuantity?: number;
  condition: 'good' | 'damaged' | 'missing';
  notes?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// Invoice Types
export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  vendor: Vendor;
  purchaseOrderId: string;
  purchaseOrder: PurchaseOrder;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid' | 'overdue' | 'cancelled';
  totalAmount: number;
  currency: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  dueDate: Date;
  paidDate?: Date;
  paymentMethod?: string;
  reference?: string;
  items: InvoiceItem[];
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxAmount: number;
}

// Analytics Types
export interface DashboardMetrics {
  totalSpend: number;
  costSavings: number;
  averageVendorRating: number;
  onTimeDelivery: number;
  activeVendors: number;
  openTenders: number;
  purchaseOrders: number;
  pendingInvoices: number;
}

export interface SpendAnalysis {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MonthlyTrend {
  month: string;
  spend: number;
  orders: number;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  actionUrl?: string;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form Types
export interface CreateTenderForm {
  title: string;
  description: string;
  category: string;
  estimatedValue: number;
  currency: string;
  closingDate: Date;
  evaluationCriteria: EvaluationCriteria;
  items: Omit<TenderItem, 'id' | 'totalEstimatedPrice'>[];
}

export interface CreateVendorForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  registrationNumber: string;
  taxId: string;
  categories: string[];
  primaryContact: Omit<Contact, 'id'>;
}

export interface CreateQuotationForm {
  tenderId: string;
  totalAmount: number;
  currency: string;
  validityDays: number;
  paymentTerms: string;
  deliveryTerms: string;
  deliveryTime: number;
  notes?: string;
  items: Omit<QuotationItem, 'id'>[];
}

export interface CreatePurchaseOrderForm {
  vendorId: string;
  tenderId?: string;
  quotationId?: string;
  paymentTerms: string;
  deliveryTerms: string;
  expectedDeliveryDate: Date;
  items: Omit<PurchaseOrderItem, 'id' | 'totalPrice'>[];
}
