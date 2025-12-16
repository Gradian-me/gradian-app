import { z } from "zod";

// User validation schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'procurement', 'vendor']),
  department: z.string().optional(),
  avatar: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Vendor validation schemas
export const contactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  position: z.string().min(1, "Position is required"),
  isPrimary: z.boolean(),
});

export const performanceMetricsSchema = z.object({
  onTimeDelivery: z.number().min(0).max(100),
  qualityScore: z.number().min(0).max(100),
  priceCompetitiveness: z.number().min(0).max(100),
  responsiveness: z.number().min(0).max(100),
  complianceScore: z.number().min(0).max(100),
  totalOrders: z.number().min(0),
  totalValue: z.number().min(0),
  averageOrderValue: z.number().min(0),
});

export const certificationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Certification name is required"),
  issuer: z.string().min(1, "Issuer is required"),
  issueDate: z.date(),
  expiryDate: z.date(),
  status: z.enum(['active', 'expired', 'pending']),
  documentUrl: z.string().url().optional(),
});

export const vendorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Vendor name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().min(1, "Country is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  status: z.enum(['active', 'inactive', 'pending']),
  categories: z.array(z.string()).min(1, "At least one category is required"),
  rating: z.number().min(0).max(5),
  joinedDate: z.date(),
  primaryContact: contactSchema,
  performanceMetrics: performanceMetricsSchema,
  certifications: z.array(certificationSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().min(1, "Country is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  categories: z.array(z.string()).min(1, "At least one category is required"),
  primaryContact: z.object({
    name: z.string().min(1, "Contact name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone is required"),
    position: z.string().min(1, "Position is required"),
    isPrimary: z.boolean().default(true),
  }),
});

// Tender validation schemas
export const evaluationCriteriaSchema = z.object({
  price: z.number().min(0).max(100),
  quality: z.number().min(0).max(100),
  delivery: z.number().min(0).max(100),
  experience: z.number().min(0).max(100),
}).refine((data) => data.price + data.quality + data.delivery + data.experience === 100, {
  message: "Evaluation criteria weights must sum to 100%",
});

export const tenderItemSchema = z.object({
  id: z.string().uuid(),
  productName: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit: z.string().min(1, "Unit is required"),
  specifications: z.string().min(1, "Specifications are required"),
  estimatedUnitPrice: z.number().min(0, "Price must be non-negative"),
  totalEstimatedPrice: z.number().min(0),
});

export const tenderSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  estimatedValue: z.number().min(0, "Estimated value must be non-negative"),
  currency: z.string().min(1, "Currency is required"),
  status: z.enum(['draft', 'published', 'closed', 'awarded', 'cancelled']),
  publishedDate: z.date().optional(),
  closingDate: z.date(),
  awardDate: z.date().optional(),
  createdBy: z.string().uuid(),
  awardedTo: z.string().uuid().optional(),
  evaluationCriteria: evaluationCriteriaSchema,
  items: z.array(tenderItemSchema).min(1, "At least one item is required"),
  quotations: z.array(z.any()), // Will be defined separately
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createTenderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  estimatedValue: z.number().min(0, "Estimated value must be non-negative"),
  currency: z.string().min(1, "Currency is required"),
  closingDate: z.date().min(new Date(), "Closing date must be in the future"),
  evaluationCriteria: evaluationCriteriaSchema,
  items: z.array(z.object({
    productName: z.string().min(1, "Product name is required"),
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unit: z.string().min(1, "Unit is required"),
    specifications: z.string().min(1, "Specifications are required"),
    estimatedUnitPrice: z.number().min(0, "Price must be non-negative"),
  })).min(1, "At least one item is required"),
});

// Quotation validation schemas
export const quotationItemSchema = z.object({
  id: z.string().uuid(),
  tenderItemId: z.string().uuid(),
  unitPrice: z.number().min(0, "Price must be non-negative"),
  totalPrice: z.number().min(0),
  specifications: z.string().min(1, "Specifications are required"),
  notes: z.string().optional(),
});

export const quotationSchema = z.object({
  id: z.string().uuid(),
  tenderId: z.string().uuid(),
  vendorId: z.string().uuid(),
  submittedDate: z.date(),
  status: z.enum(['submitted', 'under_review', 'accepted', 'rejected']),
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  currency: z.string().min(1, "Currency is required"),
  validityDays: z.number().min(1, "Validity must be at least 1 day"),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  deliveryTerms: z.string().min(1, "Delivery terms are required"),
  deliveryTime: z.number().min(1, "Delivery time must be at least 1 day"),
  notes: z.string().optional(),
  items: z.array(quotationItemSchema).min(1, "At least one item is required"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createQuotationSchema = z.object({
  vendorId: z.string().uuid(),
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  currency: z.string().min(1, "Currency is required"),
  validityDays: z.number().min(1, "Validity must be at least 1 day"),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  deliveryTerms: z.string().min(1, "Delivery terms are required"),
  deliveryTime: z.number().min(1, "Delivery time must be at least 1 day"),
  notes: z.string().optional(),
  items: z.array(z.object({
    tenderItemId: z.string().uuid(),
    unitPrice: z.number().min(0, "Price must be non-negative"),
    specifications: z.string().min(1, "Specifications are required"),
    notes: z.string().optional(),
  })).min(1, "At least one item is required"),
});

// Purchase Order validation schemas
export const purchaseOrderItemSchema = z.object({
  id: z.string().uuid(),
  productName: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit: z.string().min(1, "Unit is required"),
  unitPrice: z.number().min(0, "Price must be non-negative"),
  totalPrice: z.number().min(0),
  specifications: z.string().optional(),
});

export const purchaseOrderSchema = z.object({
  id: z.string().uuid(),
  poNumber: z.string().min(1, "PO number is required"),
  vendorId: z.string().uuid(),
  tenderId: z.string().uuid().optional(),
  quotationId: z.string().uuid().optional(),
  status: z.enum(['draft', 'pending_approval', 'approved', 'acknowledged', 'in_progress', 'completed', 'cancelled']),
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  currency: z.string().min(1, "Currency is required"),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  taxRate: z.number().min(0).max(100),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  deliveryTerms: z.string().min(1, "Delivery terms are required"),
  expectedDeliveryDate: z.date(),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required"),
  createdBy: z.string().uuid(),
  approvedBy: z.string().uuid().optional(),
  approvedAt: z.date().optional(),
  acknowledgedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createPurchaseOrderSchema = z.object({
  vendorId: z.string().uuid(),
  tenderId: z.string().uuid().optional(),
  quotationId: z.string().uuid().optional(),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  deliveryTerms: z.string().min(1, "Delivery terms are required"),
  expectedDeliveryDate: z.date().min(new Date(), "Expected delivery date must be in the future"),
  items: z.array(z.object({
    productName: z.string().min(1, "Product name is required"),
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unit: z.string().min(1, "Unit is required"),
    unitPrice: z.number().min(0, "Price must be non-negative"),
    specifications: z.string().optional(),
  })).min(1, "At least one item is required"),
});

// Shipment validation schemas
export const addressSchema = z.object({
  street: z.string().min(1, "Street is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().min(1, "Country is required"),
});

export const shipmentItemSchema = z.object({
  id: z.string().uuid(),
  purchaseOrderItemId: z.string().uuid(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  receivedQuantity: z.number().min(0).optional(),
  condition: z.enum(['good', 'damaged', 'missing']),
  notes: z.string().optional(),
});

export const shipmentSchema = z.object({
  id: z.string().uuid(),
  shipmentNumber: z.string().min(1, "Shipment number is required"),
  purchaseOrderId: z.string().uuid(),
  vendorId: z.string().uuid(),
  status: z.enum(['pending', 'in_transit', 'delivered', 'delayed', 'cancelled']),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  estimatedDeliveryDate: z.date(),
  actualDeliveryDate: z.date().optional(),
  shippingAddress: addressSchema,
  items: z.array(shipmentItemSchema).min(1, "At least one item is required"),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Invoice validation schemas
export const invoiceItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Price must be non-negative"),
  totalPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100),
  taxAmount: z.number().min(0),
});

export const invoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  vendorId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  status: z.enum(['draft', 'pending_approval', 'approved', 'paid', 'overdue', 'cancelled']),
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  currency: z.string().min(1, "Currency is required"),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  taxRate: z.number().min(0).max(100),
  dueDate: z.date(),
  paidDate: z.date().optional(),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  createdBy: z.string().uuid(),
  approvedBy: z.string().uuid().optional(),
  approvedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Notification validation schemas
export const notificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(['info', 'success', 'warning', 'error']),
  isRead: z.boolean(),
  actionUrl: z.string().url().optional(),
  createdAt: z.date(),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(25),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Filter schemas
export const vendorFilterSchema = z.object({
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  categories: z.array(z.string()).optional(),
  rating: z.number().min(0).max(5).optional(),
});

export const tenderFilterSchema = z.object({
  status: z.enum(['draft', 'published', 'closed', 'awarded', 'cancelled']).optional(),
  category: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

export const purchaseOrderFilterSchema = z.object({
  status: z.enum(['draft', 'pending_approval', 'approved', 'acknowledged', 'in_progress', 'completed', 'cancelled']).optional(),
  vendorId: z.string().uuid().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});
