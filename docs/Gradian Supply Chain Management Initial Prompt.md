# Gradian Supply Chain Management – Cursor AI Super‑Prompt (v3, Full Lifecycle + Modern Micro‑Animations)

> **Goal:** Generate a full‑stack, production‑ready Next.js 14 (App Router) application named **Gradian Supply Chain Management** — a visually modern, micro‑animated, domain‑driven system covering Vendor → Tender → Quotation → Purchase Order → Shipment → Invoice.

---


## 0) Vision & Design

A next‑generation **Procure‑to‑Pay** platform combining functional depth with elegant UX. Built with **Next.js**, **ShadCN/UI**, and **Framer Motion** for micro‑interactions and transitions. Designed for scalability, modularity, and mobile performance.

### 🎨 Design Language & Interaction

* **UI Framework:** ShadCN + Tailwind CSS + Radix UI + Lucide Icons.
* **Animation Layer:** Framer Motion for micro animations — hover, transitions, list reorders, modals, progress bars, and timeline reveals.
* **Visual System:** Gradian‑accented theme (blue‑violet tones, subtle glassmorphism, rounded cards).
* **Dark Mode:** Persisted toggle with animated switch.
* **Micro Animations:**

  * KPI cards pulse slightly on update.
  * Countdown odometers slide digits.
  * Sidebar icons glide in.
  * Timeline stages fade sequentially.
  * Table rows animate on add/update.

---

## 1) Domain Overview (DDD Bounded Contexts)

**Contexts:**

* Vendors
* Tenders
* Quotations
* Purchase Orders
* Shipments
* Invoices
* Notifications

Each context includes **models, zod schemas, repositories, services, and controllers** under `/domain/{context}`.

---

## 2) Core Relationships & Flow

```
Vendor ─┬─> Tender ─┬─> Quotation ─┬─> PurchaseOrder ─┬─> ShipmentNotice ─┬─> Invoice
        │            │              │                  │                   │
        ▼            ▼              ▼                  ▼                   ▼
     Compliance   Criteria     AwardedVendor       Open POItems       Delivery Trace
```

### Entity Highlights

#### Vendor

Manages vendor registry, contacts, ratings, compliance.

#### Tender

Defines publish/close cycle, evaluation criteria, checklist requirements, and invited vendors.

#### Quotation

Vendor response with per‑item pricing, delivery terms, charges.

#### Purchase Order

Auto‑generated for awarded quotations, tracking item fulfillment and balance quantities.

#### Shipment Notice

Vendor logs shipment of open PO items, includes shipment tracking (ship, estimated, actual dates).

#### Invoice

Linked to ShipmentNotice; mirrors quotation structure; adds payment tracking and delivery trace.

---

## 3) Entities & Key Fields

### TenderItem

```ts
TenderItem {
  id: Id;
  tenderId: Id;
  name: string;
  requiredQty: number;
  unitId: Id;
  specifications: string;
  checklist: ChecklistRequirement[]; // e.g., ISO9001, CoA
}
```

### QuotationItem

```ts
QuotationItem {
  id: Id;
  tenderItemId: Id;
  unitPrice: number;
  discountPct?: number;
  totalPrice: number;
  deliveryDate: ISODate;
}
```

### PurchaseOrderItem

```ts
PurchaseOrderItem {
  id: Id;
  quotationItemId: Id;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  balanceQty: number;
}
```

### ShipmentNoticeItem

```ts
ShipmentNoticeItem {
  id: Id;
  purchaseOrderItemId: Id;
  shippedQty: number;
  unitPrice: number;
  subtotal: number;
  shipDate: ISODate;
  estimatedDeliveryDate: ISODate;
  actualDeliveryDate?: ISODate;
  status: 'CREATED'|'IN_TRANSIT'|'DELIVERED'|'RECEIVED';
}
```

### InvoiceItem

```ts
InvoiceItem {
  id: Id;
  shipmentNoticeItemId: Id;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryTrace: {
    shipDate: ISODate;
    estimatedDelivery: ISODate;
    actualDelivery?: ISODate;
    status: 'PENDING'|'IN_TRANSIT'|'DELIVERED'|'RECEIVED';
  };
}
```

---

## 4) Process Rules

* Vendor can ship **only approved PO items** (balanceQty > 0).
* Each shipment reduces PO balance; all zero → PO = COMPLETED.
* Invoices allowed only when shipment status ≥ DELIVERED.
* Actual Delivery Date updates automatically when status transitions.

---

## 5) API Surface (All Contexts)

### Vendors

`GET /api/vendors` → List vendors.
`POST /api/vendors` → Create.
`PATCH /api/vendors/:id` → Update.

### Tenders

`POST /api/tenders` → Create tender (draft).
`POST /api/tenders/:id/publish` → Publish.
`POST /api/tenders/:id/award` → Select awarded vendor.
`POST /api/tenders/:id/close` → Close automatically or manually.

### Quotations

`POST /api/tenders/:id/quotations` → Vendor submission.
`GET /api/tenders/:id/quotations` → Admin list.

### Purchase Orders

`POST /api/purchase-orders` → Create from quotation.
`GET /api/purchase-orders/:id` → View with items & shipments.
`PATCH /api/purchase-orders/:id` → Update status.

### Shipment Notices

`POST /api/shipment-notices` → Create notice (vendor).
`PATCH /api/shipment-notices/:id` → Update delivery status.
`GET /api/shipment-notices?vendorId=` → Vendor view.

### Invoices

`POST /api/invoices` → Create from shipment notice.
`GET /api/invoices?vendorId=` → Vendor list.
`PATCH /api/invoices/:id` → Update approval/payment status.

---

## 6) UI Architecture & Pages

* **Global:** Sidebar (Dashboard, Vendors, Tenders, POs, Shipments, Invoices, Notifications), dark mode toggle, animated bell notifications.
* **Vendor Management:** KPI cards (Total, Active, Avg Rating, Compliance), searchable table, editable modal with slide animation.
* **Tender Management:** KPI cards (Active, Value, Quotations, Response Time), animated tender cards with countdown.
* **Quotation Form:** Inline price calculator, per‑item transitions.
* **PO Page:** Animated progress bar showing % shipped.
* **Shipment Form:** Animated item selector with balance indicator; timeline progress with Framer Motion.
* **Invoice Page:** Micro animated total calculation, item trace cards.

---

## 7) Dashboards & KPIs

**Vendor:** totals, actives, avg rating, compliance.
**Tender:** active tenders, total value, quotations, avg response time.
**PO/Shipment/Invoice:** open POs, in‑transit shipments, pending invoices, average delivery delay.

---

## 8) Data & Persistence

* Start with TypeScript/JSON data under `/data`.
* Repositories abstracted for data access using JSON-based storage.

---

## 9) Animations & Interactions

Use **Framer Motion** to apply:

* FadeIn, SlideUp transitions for components.
* `AnimatePresence` for modals, alerts, and page transitions.
* `motion.div` wrappers for KPI cards and tables.
* Smooth staggered animations on list/table render.
* Micro “pulse” when values update.

---

## 10) Notifications

* Toasts for PO issue, shipment update, invoice approval.
* Bell dropdown with scrollable list and mark‑as‑read animation.

---

## 11) Acceptance Criteria

* Fully functioning flow: Tender → Quotation → Award → PO → Shipment → Invoice.
* Animated, responsive, mobile‑friendly ShadCN + Framer Motion UI.
* RBAC: Admin/Procurement/Vendor.
* Countdown + live status transitions.
* KPI metrics computed correctly.

---

## 12) Deliverables for Cursor AI

1. Scaffold full project structure and dependencies.
2. Implement all domain models, services, and APIs.
3. Integrate Framer Motion animations.
4. Build all key pages with ShadCN components and animation hooks.
5. Provide seed data and live dashboards using echarts.
6. Ensure everything runs with `pnpm dev`.
7. create roles for user definition and profile for both supply chain department and vendor profile with RBAC
8. I want to have Tender Calendar showing tenders with their status by badge and colors
9. 
> Result: a stunning, reactive, micro‑animated Gradian Supply Chain Management system — DDD‑clean, visually fluid, and enterprise‑grade.
