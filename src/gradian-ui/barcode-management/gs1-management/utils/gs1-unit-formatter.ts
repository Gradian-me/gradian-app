/**
 * Formats GS1 "Unit" values using shared currency and country utils.
 * Resolves ISO currency codes (e.g. 978 → EUR) and country codes (e.g. 276 → Germany)
 * based on the Application Identifier context.
 */

import { formatCurrencyDisplay } from "@/gradian-ui/shared/utils/currency-utils";
import { formatCountryDisplay } from "@/gradian-ui/shared/utils/country-utils";

/** AIs whose unit field contains an ISO 4217 currency code (3-digit or 3-letter). */
const CURRENCY_AI_PREFIXES = ["391", "393"];

/** AIs whose unit field contains an ISO 3166 country code (2/3-letter or numeric). */
const COUNTRY_AI_PREFIXES = ["421", "422", "423", "424", "425", "426", "427"];
const COUNTRY_AI_703 = "703"; // 7030-7039 processor with country

function aiMatchesPrefix(ai: string, prefixes: string[]): boolean {
  return prefixes.some((p) => ai === p || ai.startsWith(p));
}

/**
 * Format a GS1 unit string for display using currency and country lookups when applicable.
 * @param unit - Raw unit from parser (e.g. "978", "276", "EUR", "GB")
 * @param ai - Application Identifier (e.g. "3932", "421")
 * @returns Human-readable unit/currency or country, or original unit if no match
 */
export function formatGS1Unit(unit: string, ai: string): string {
  if (!unit || typeof unit !== "string") return "—";
  const trimmed = unit.trim();
  if (!trimmed) return "—";

  // Currency: 391x, 393x (amount/price with ISO currency)
  if (aiMatchesPrefix(ai, CURRENCY_AI_PREFIXES)) {
    const formatted = formatCurrencyDisplay(trimmed, { includeName: true });
    if (formatted !== trimmed) return formatted;
  }

  // Country: 421 (ship to postal with country), 422-427, 703x (processor with country)
  if (aiMatchesPrefix(ai, COUNTRY_AI_PREFIXES) || ai.startsWith(COUNTRY_AI_703)) {
    const formatted = formatCountryDisplay(trimmed, { includeCode: true });
    if (formatted !== trimmed) return formatted;
  }

  return trimmed;
}

