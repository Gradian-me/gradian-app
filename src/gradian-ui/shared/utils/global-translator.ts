/**
 * Global translator for use in non-React code (e.g. validateField).
 * Set by LayoutDirLang (or root layout) so validation messages use the current language.
 */

let globalT: ((key: string) => string) | null = null;

export function setGlobalTranslator(t: ((key: string) => string) | null): void {
  globalT = t;
}

export function getGlobalTranslator(): ((key: string) => string) | null {
  return globalT;
}
