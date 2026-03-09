/**
 * GS1 Application Identifiers dictionary for i18n labels and display hints.
 * Reference: https://ref.gs1.org/ai/
 * Used by GS1Badge dialog to show human-readable Title and Unit per locale.
 */

export type GS1AIDictionaryEntry = {
  id: string;
  name: string;
  label: Record<string, string>;
  unitLabel?: Record<string, string>;
  format?: "date" | "numeric" | "string";
};

export const GS1_AI_DICTIONARY: GS1AIDictionaryEntry[] = [
  { id: "00", name: "SSCC", label: { en: "Serial Shipping Container Code (SSCC)", fa: "کد واحد حمل سریال" }, format: "string" },
  { id: "01", name: "GTIN", label: { en: "Global Trade Item Number (GTIN)", fa: "شماره کالای جهانی" }, format: "string" },
  { id: "02", name: "CONTENT", label: { en: "GTIN of contained trade items", fa: "GTIN اقلام محتوا" }, format: "string" },
  { id: "10", name: "BATCH_LOT", label: { en: "Batch/Lot Number", fa: "شماره بچ/لات" }, format: "string" },
  { id: "11", name: "PROD_DATE", label: { en: "Production Date", fa: "تاریخ تولید" }, format: "date" },
  { id: "12", name: "DUE_DATE", label: { en: "Due Date", fa: "تاریخ سررسید" }, format: "date" },
  { id: "13", name: "PACK_DATE", label: { en: "Packaging Date", fa: "تاریخ بسته‌بندی" }, format: "date" },
  { id: "15", name: "BEST_BEFORE", label: { en: "Best Before Date", fa: "تاریخ بهترین مصرف" }, format: "date" },
  { id: "16", name: "SELL_BY", label: { en: "Sell By Date", fa: "تاریخ فروش تا" }, format: "date" },
  { id: "17", name: "EXPIRY", label: { en: "Expiration Date", fa: "تاریخ انقضا" }, format: "date" },
  { id: "20", name: "VARIANT", label: { en: "Variant", fa: "گونه" }, format: "string" },
  { id: "21", name: "SERIAL", label: { en: "Serial Number", fa: "شماره سریال" }, format: "string" },
  { id: "30", name: "VAR_COUNT", label: { en: "Variable Count", fa: "تعداد متغیر" }, format: "numeric" },
  { id: "37", name: "COUNT", label: { en: "Count of Trade Items", fa: "تعداد اقلام" }, format: "numeric" },
  { id: "400", name: "ORDER_NUMBER", label: { en: "Customer order number", fa: "شماره سفارش" }, format: "string" },
  { id: "401", name: "GINC", label: { en: "Global Identification Number for Consignment (GINC)", fa: "شناسه محموله جهانی" }, format: "string" },
  { id: "402", name: "GSIN", label: { en: "Global Shipment Identification Number (GSIN)", fa: "شناسه ارسال جهانی" }, format: "string" },
  { id: "403", name: "ROUTE", label: { en: "Transport routing code", fa: "کد مسیریابی" }, format: "string" },
  { id: "410", name: "SHIP_TO_LOC", label: { en: "Ship to Location", fa: "مکان تحویل" }, format: "string" },
  { id: "411", name: "BILL_TO", label: { en: "Bill to", fa: "صورتحساب به" }, format: "string" },
  { id: "412", name: "PURCHASE_FROM", label: { en: "Purchase From", fa: "خرید از" }, format: "string" },
  { id: "413", name: "SHIP_FOR_LOC", label: { en: "Ship for Location", fa: "ارسال برای مکان" }, format: "string" },
  { id: "420", name: "SHIP_TO_POST", label: { en: "Ship to Postal Code", fa: "کد پستی تحویل" }, format: "string" },
  { id: "421", name: "SHIP_TO_POST", label: { en: "Ship to Postal Code (with country)", fa: "کد پستی تحویل (با کشور)" }, format: "string" },
  { id: "422", name: "ORIGIN", label: { en: "Country of Origin", fa: "کشور مبدا" }, format: "string" },
  { id: "423", name: "COUNTRY_INITIAL", label: { en: "Country of Initial Processing", fa: "کشور فرآوری اولیه" }, format: "string" },
  { id: "424", name: "COUNTRY_PROCESS", label: { en: "Country of Processing", fa: "کشور فرآوری" }, format: "string" },
  { id: "425", name: "COUNTRY_DISASSEMBLY", label: { en: "Country of Disassembly", fa: "کشور جداسازی" }, format: "string" },
  { id: "426", name: "COUNTRY_FULL_PROCESS", label: { en: "Country Full Process", fa: "کشور فرآیند کامل" }, format: "string" },
  { id: "427", name: "ORIGIN_SUBDIVISION", label: { en: "Origin Subdivision", fa: "زیرمجموعه مبدا" }, format: "string" },
  { id: "240", name: "ADDITIONAL_ID", label: { en: "Additional item identification", fa: "شناسه اضافی" }, format: "string" },
  { id: "241", name: "CUST_PART_NO", label: { en: "Customer part number", fa: "شماره قطعه مشتری" }, format: "string" },
  { id: "242", name: "MTO_VARIANT", label: { en: "Made‑to‑order variant", fa: "گونه سفارشی" }, format: "string" },
  { id: "243", name: "PCN", label: { en: "Packaging component number (PCN)", fa: "شماره جزء بسته‌بندی" }, format: "string" },
  { id: "250", name: "SECONDARY_SERIAL", label: { en: "Secondary Serial", fa: "سریال ثانویه" }, format: "string" },
  { id: "251", name: "REF_TO_SOURCE", label: { en: "Reference to Source", fa: "ارجاع به منبع" }, format: "string" },
  { id: "253", name: "GDTI", label: { en: "GDTI", fa: "شناسه نوع سند جهانی" }, format: "string" },
  { id: "254", name: "GLN_EXTENSION", label: { en: "GLN Extension", fa: "توسعه GLN" }, format: "string" },
  { id: "255", name: "GCN", label: { en: "GCN", fa: "شماره کوپن جهانی" }, format: "string" },
  { id: "3100", name: "NET_WEIGHT_KG", label: { en: "Net Weight (kg)", fa: "وزن خالص (کیلوگرم)" }, unitLabel: { en: "kg", fa: "کیلوگرم" }, format: "numeric" },
  { id: "3101", name: "NET_WEIGHT_KG", label: { en: "Net Weight (kg)", fa: "وزن خالص (کیلوگرم)" }, unitLabel: { en: "kg", fa: "کیلوگرم" }, format: "numeric" },
  { id: "3102", name: "NET_WEIGHT_KG", label: { en: "Net Weight (kg)", fa: "وزن خالص (کیلوگرم)" }, unitLabel: { en: "kg", fa: "کیلوگرم" }, format: "numeric" },
  { id: "3103", name: "NET_WEIGHT_KG", label: { en: "Net Weight (kg)", fa: "وزن خالص (کیلوگرم)" }, unitLabel: { en: "kg", fa: "کیلوگرم" }, format: "numeric" },
  { id: "3104", name: "NET_WEIGHT_KG", label: { en: "Net Weight (kg)", fa: "وزن خالص (کیلوگرم)" }, unitLabel: { en: "kg", fa: "کیلوگرم" }, format: "numeric" },
  { id: "3105", name: "NET_WEIGHT_KG", label: { en: "Net Weight (kg)", fa: "وزن خالص (کیلوگرم)" }, unitLabel: { en: "kg", fa: "کیلوگرم" }, format: "numeric" },
  { id: "3110", name: "LENGTH_M", label: { en: "Length (m)", fa: "طول (متر)" }, unitLabel: { en: "m", fa: "متر" }, format: "numeric" },
  { id: "3120", name: "WIDTH_M", label: { en: "Width (m)", fa: "عرض (متر)" }, unitLabel: { en: "m", fa: "متر" }, format: "numeric" },
  { id: "3130", name: "HEIGHT_M", label: { en: "Height (m)", fa: "ارتفاع (متر)" }, unitLabel: { en: "m", fa: "متر" }, format: "numeric" },
  { id: "3150", name: "NET_VOLUME_L", label: { en: "Net Volume (l)", fa: "حجم خالص (لیتر)" }, unitLabel: { en: "l", fa: "لیتر" }, format: "numeric" },
  { id: "3160", name: "NET_VOLUME_M3", label: { en: "Net Volume (m³)", fa: "حجم خالص (متر مکعب)" }, unitLabel: { en: "m³", fa: "م³" }, format: "numeric" },
  { id: "3200", name: "NET_WEIGHT_LB", label: { en: "Net Weight (lb)", fa: "وزن خالص (پوند)" }, unitLabel: { en: "lb", fa: "پوند" }, format: "numeric" },
  { id: "3300", name: "GROSS_WEIGHT_KG", label: { en: "Gross Weight (kg)", fa: "وزن ناخالص (کیلوگرم)" }, unitLabel: { en: "kg", fa: "کیلوگرم" }, format: "numeric" },
  { id: "3400", name: "GROSS_WEIGHT_LB", label: { en: "Gross Weight (lb)", fa: "وزن ناخالص (پوند)" }, unitLabel: { en: "lb", fa: "پوند" }, format: "numeric" },
  { id: "3900", name: "AMOUNT", label: { en: "Monetary amount", fa: "مبلغ" }, format: "numeric" },
  { id: "3901", name: "AMOUNT", label: { en: "Monetary amount", fa: "مبلغ" }, format: "numeric" },
  { id: "3902", name: "AMOUNT", label: { en: "Monetary amount", fa: "مبلغ" }, format: "numeric" },
  { id: "3903", name: "AMOUNT", label: { en: "Monetary amount", fa: "مبلغ" }, format: "numeric" },
  { id: "3910", name: "AMOUNT", label: { en: "Monetary amount with currency", fa: "مبلغ (با واحد پول)" }, format: "numeric" },
  { id: "3911", name: "AMOUNT", label: { en: "Monetary amount with currency", fa: "مبلغ (با واحد پول)" }, format: "numeric" },
  { id: "3912", name: "AMOUNT", label: { en: "Monetary amount with currency", fa: "مبلغ (با واحد پول)" }, format: "numeric" },
  { id: "3913", name: "AMOUNT", label: { en: "Monetary amount with currency", fa: "مبلغ (با واحد پول)" }, format: "numeric" },
  { id: "3920", name: "PRICE", label: { en: "Item price", fa: "قیمت" }, format: "numeric" },
  { id: "3921", name: "PRICE", label: { en: "Item price", fa: "قیمت" }, format: "numeric" },
  { id: "3922", name: "PRICE", label: { en: "Item price", fa: "قیمت" }, format: "numeric" },
  { id: "3923", name: "PRICE", label: { en: "Item price", fa: "قیمت" }, format: "numeric" },
  { id: "3930", name: "PRICE", label: { en: "Item price with currency", fa: "قیمت (با واحد پول)" }, format: "numeric" },
  { id: "3931", name: "PRICE", label: { en: "Item price with currency", fa: "قیمت (با واحد پول)" }, format: "numeric" },
  { id: "3932", name: "PRICE", label: { en: "Item price with currency", fa: "قیمت (با واحد پول)" }, format: "numeric" },
  { id: "3933", name: "PRICE", label: { en: "Item price with currency", fa: "قیمت (با واحد پول)" }, format: "numeric" },
  { id: "7001", name: "NSN", label: { en: "NATO Stock Number (NSN)", fa: "شماره ذخیره ناتو" }, format: "string" },
  { id: "7002", name: "MEAT_CUT", label: { en: "Meat Cut", fa: "برش گوشت" }, format: "string" },
  { id: "7003", name: "EXPIRY_TIME", label: { en: "Expiry date and time", fa: "تاریخ و زمان انقضا" }, format: "string" },
  { id: "7004", name: "ACTIVE_POTENCY", label: { en: "Active ingredient potency", fa: "قدرت فعال" }, format: "string" },
  { id: "710", name: "NHRN_PZN", label: { en: "National Healthcare Reimbursement Number – PZN (Germany)", fa: "شماره بازپرداخت بهداشتی (آلمان)" }, format: "string" },
  { id: "711", name: "NHRN_CIP", label: { en: "National Healthcare Reimbursement Number – CIP (France)", fa: "شماره بازپرداخت بهداشتی (فرانسه)" }, format: "string" },
  { id: "712", name: "NHRN_CN", label: { en: "National Healthcare Reimbursement Number – CN (Spain)", fa: "شماره بازپرداخت بهداشتی (اسپانیا)" }, format: "string" },
  { id: "713", name: "NHRN_DRN", label: { en: "National Healthcare Reimbursement Number – DRN (Brazil)", fa: "شماره بازپرداخت بهداشتی (برزیل)" }, format: "string" },
  { id: "8001", name: "DIMENSIONS", label: { en: "Logistic dimensions", fa: "ابعاد" }, format: "string" },
  { id: "8002", name: "CMT_NO", label: { en: "Customer mobile telephone number (CMT)", fa: "شماره تلفن همراه" }, format: "string" },
  { id: "8003", name: "GRAI", label: { en: "Global Returnable Asset Identifier (GRAI)", fa: "شناسه دارایی برگشت‌پذیر" }, format: "string" },
  { id: "8004", name: "GIAI", label: { en: "Global Individual Asset Identifier (GIAI)", fa: "شناسه دارایی منفرد" }, format: "string" },
  { id: "8005", name: "PRICE_PER_UNIT", label: { en: "Price Per Unit", fa: "قیمت هر واحد" }, format: "numeric" },
  { id: "8006", name: "GCTIN", label: { en: "Global Coupon Number (GCTIN)", fa: "اجزای کالا" }, format: "string" },
  { id: "8007", name: "IBAN", label: { en: "International Bank Account Number (IBAN)", fa: "شماره حساب بانکی بین‌المللی" }, format: "string" },
  { id: "8008", name: "PROD_TIME", label: { en: "Production Date and Time", fa: "تاریخ و زمان تولید" }, format: "string" },
  { id: "8010", name: "CPID", label: { en: "Customer product ID (CPID)", fa: "شناسه قطعه/جزء" }, format: "string" },
  { id: "8011", name: "CPID_SERIAL", label: { en: "Customer product ID serial number (CPID serial)", fa: "سریال CPID" }, format: "string" },
  { id: "8017", name: "GSRN_PROVIDER", label: { en: "Global Service Relation Number – provider (GSRN)", fa: "ارائه‌دهنده GSRN" }, format: "string" },
  { id: "8018", name: "GSRN_RECIPIENT", label: { en: "Global Service Relation Number – recipient (GSRN)", fa: "دریافت‌کننده GSRN" }, format: "string" },
  { id: "8019", name: "SRIN", label: { en: "Service Relation Instance Number (SRIN)", fa: "شماره نمونه رابطه خدمات" }, format: "string" },
  { id: "8020", name: "REF_NO", label: { en: "Reference Number", fa: "شماره مرجع" }, format: "string" },
  { id: "8200", name: "PRODUCT_URL", label: { en: "Product information URL", fa: "آدرس محصول" }, format: "string" },
  { id: "90", name: "INTERNAL", label: { en: "Internal company code", fa: "داخلی" }, format: "string" },
  { id: "91", name: "INTERNAL", label: { en: "Internal company code", fa: "داخلی" }, format: "string" },
  { id: "92", name: "INTERNAL", label: { en: "Internal company code", fa: "داخلی" }, format: "string" },
  { id: "93", name: "INTERNAL", label: { en: "Internal company code", fa: "داخلی" }, format: "string" },
  { id: "94", name: "INTERNAL", label: { en: "Internal company code", fa: "داخلی" }, format: "string" },
  { id: "95", name: "INTERNAL", label: { en: "Internal company code", fa: "داخلی" }, format: "string" },
  { id: "96", name: "INTERNAL", label: { en: "Internal company code", fa: "داخلی" }, format: "string" },
  { id: "97", name: "INTERNAL", label: { en: "Internal company code", fa: "داخلی" }, format: "string" },
  { id: "98", name: "INTERNAL", label: { en: "Internal company code", fa: "داخلی" }, format: "string" },
  { id: "99", name: "INTERNAL", label: { en: "Internal company code", fa: "داخلی" }, format: "string" },
];

let aiMetaMap: Map<string, GS1AIDictionaryEntry> | null = null;

function buildAIMetaMap(): Map<string, GS1AIDictionaryEntry> {
  if (aiMetaMap) return aiMetaMap;
  aiMetaMap = new Map();
  for (const entry of GS1_AI_DICTIONARY) {
    aiMetaMap.set(entry.id, entry);
  }
  return aiMetaMap;
}

/**
 * Returns metadata for a GS1 Application Identifier for use in UI (labels, unit, format).
 * When the AI is not in the dictionary, returns undefined; caller should fall back to parser dataTitle/unit.
 */
export function getGS1AIMeta(ai: string): GS1AIDictionaryEntry | undefined {
  return buildAIMetaMap().get(ai);
}

