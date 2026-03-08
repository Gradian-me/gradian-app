/**
 * Country lookup utilities by ISO, FIPS, internet code, or country name.
 * Uses the country-code-lookup package.
 */

const lookup = require("country-code-lookup") as {
  byFips: (fips: string) => CountryInfo | null;
  byIso: (iso: string | number) => CountryInfo | null;
  byInternet: (code: string) => CountryInfo | null;
  byCountry: (name: string) => CountryInfo | null;
  countries: CountryInfo[];
};

export interface CountryInfo {
  continent: string;
  region: string;
  country: string;
  capital: string;
  fips: string;
  iso2: string;
  iso3: string;
  isoNo: string;
  internet: string;
}

/**
 * Lookup country by ISO code: 2-letter (e.g. "GB"), 3-letter (e.g. "GBR"), or numeric (e.g. 826).
 * @param iso - ISO 3166 code (string or number)
 * @returns Country info or undefined if not found
 */
export function getCountryByIso(iso: string | number): CountryInfo | undefined {
  if (iso === "" || iso === null || iso === undefined) return undefined;
  const result = lookup.byIso(iso);
  return result ?? undefined;
}

/**
 * Lookup country by FIPS 10-4 code (e.g. "UK").
 */
export function getCountryByFips(fips: string): CountryInfo | undefined {
  if (!fips || typeof fips !== "string") return undefined;
  const result = lookup.byFips(fips);
  return result ?? undefined;
}

/**
 * Lookup country by internet code (e.g. "UK").
 */
export function getCountryByInternet(code: string): CountryInfo | undefined {
  if (!code || typeof code !== "string") return undefined;
  const result = lookup.byInternet(code);
  return result ?? undefined;
}

/**
 * Lookup country by country name (e.g. "United Kingdom").
 */
export function getCountryByName(name: string): CountryInfo | undefined {
  if (!name || typeof name !== "string") return undefined;
  const result = lookup.byCountry(name);
  return result ?? undefined;
}

/**
 * Get all countries as an array.
 */
export function getAllCountries(): CountryInfo[] {
  return lookup.countries ?? [];
}

/**
 * Format a country for display: "United Kingdom (GB)" or just "United Kingdom".
 */
export function formatCountryDisplay(
  isoOrName: string | number,
  options?: { includeCode?: boolean }
): string {
  const includeCode = options?.includeCode !== false;
  const info =
    typeof isoOrName === "number" || /^\d+$/.test(String(isoOrName)) || /^[A-Za-z]{2,3}$/.test(String(isoOrName))
      ? getCountryByIso(isoOrName)
      : getCountryByName(String(isoOrName));
  if (!info) return String(isoOrName);
  return includeCode ? `${info.country} (${info.iso2})` : info.country;
}
