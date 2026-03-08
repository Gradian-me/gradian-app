/**
 * Currency lookup utilities based on ISO 4217.
 * Uses the currency-codes package for code/number/currency name resolution.
 */

const currencyCodes = require("currency-codes") as {
  code: (code: string) => { code: string; number: string | number; digits: number; currency: string; countries: string[] } | undefined;
  number: (num: number) => { code: string; number: string | number; digits: number; currency: string; countries: string[] } | undefined;
  country: (name: string) => { code: string; number: string | number; digits: number; currency: string; countries: string[] }[] | undefined;
  codes: () => string[];
  numbers: () => string[];
};

export interface CurrencyInfo {
  code: string;
  number: number;
  digits: number;
  currency: string;
  countries: string[];
}

/**
 * Lookup currency by ISO 4217 numeric code (e.g. 967 for ZMW).
 * @param number - ISO 4217 numeric code (number or string like "967")
 * @returns Currency info or undefined if not found
 */
export function getCurrencyByNumber(number: number | string): CurrencyInfo | undefined {
  const num = typeof number === "string" ? parseInt(number, 10) : number;
  if (Number.isNaN(num)) return undefined;
  const raw = currencyCodes.number(num);
  if (!raw) return undefined;
  return {
    code: raw.code,
    number: typeof raw.number === "string" ? parseInt(raw.number, 10) : raw.number,
    digits: raw.digits,
    currency: raw.currency,
    countries: raw.countries ?? [],
  };
}

/**
 * Lookup currency by ISO 4217 alpha code (e.g. "EUR", "ZMW").
 * @param code - Three-letter currency code (case-insensitive)
 * @returns Currency info or undefined if not found
 */
export function getCurrencyByCode(code: string): CurrencyInfo | undefined {
  if (!code || typeof code !== "string") return undefined;
  const raw = currencyCodes.code(code.toUpperCase());
  if (!raw) return undefined;
  return {
    code: raw.code,
    number: typeof raw.number === "string" ? parseInt(raw.number, 10) : raw.number,
    digits: raw.digits,
    currency: raw.currency,
    countries: raw.countries ?? [],
  };
}

/**
 * Get all known ISO 4217 currency codes.
 */
export function getCurrencyCodes(): string[] {
  return currencyCodes.codes() ?? [];
}

/**
 * Get all known ISO 4217 numeric codes (as strings).
 */
export function getCurrencyNumbers(): string[] {
  return currencyCodes.numbers() ?? [];
}

/**
 * Lookup currencies by country name (e.g. "colombia").
 * @param country - Country name (case-insensitive)
 * @returns Array of currency info for that country
 */
export function getCurrenciesByCountry(country: string): CurrencyInfo[] {
  if (!country || typeof country !== "string") return [];
  const list = currencyCodes.country(country);
  if (!Array.isArray(list)) return [];
  return list.map((raw) => ({
    code: raw.code,
    number: typeof raw.number === "string" ? parseInt(raw.number, 10) : raw.number,
    digits: raw.digits,
    currency: raw.currency,
    countries: raw.countries ?? [],
  }));
}

/**
 * Format a currency for display: "EUR (Euro)" or "ZMW (Zambian kwacha)".
 * Uses getCurrencyByCode or getCurrencyByNumber; returns the code only if lookup fails.
 */
export function formatCurrencyDisplay(
  codeOrNumber: string | number,
  options?: { includeName?: boolean }
): string {
  const includeName = options?.includeName !== false;
  const info =
    typeof codeOrNumber === "number" || /^\d+$/.test(String(codeOrNumber))
      ? getCurrencyByNumber(codeOrNumber)
      : getCurrencyByCode(String(codeOrNumber));
  if (!info) return String(codeOrNumber);
  return includeName ? `${info.code} (${info.currency})` : info.code;
}
