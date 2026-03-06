/**
 * Minimal type declaration for receiptline (no @types/receiptline).
 * Covers only what we use: transform() and printer config.
 */
declare module "receiptline" {
  export interface PrinterConfig {
    cpl?: number;
    encoding?: string;
    command?: string;
    spacing?: boolean;
    gradient?: boolean;
    gamma?: number;
    threshold?: number;
    cutting?: boolean;
    margin?: number;
    marginRight?: number;
    upsideDown?: boolean;
  }

  export function transform(doc: string, printer?: PrinterConfig): string;

  const receiptline: {
    transform: typeof transform;
  };
  export default receiptline;
}
