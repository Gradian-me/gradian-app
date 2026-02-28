/**
 * Shared annotation types for app builder forms and SignaturePad canvas.
 */

export interface AnnotationItem {
  id: string;
  label: string;
}

export interface SchemaAnnotation {
  schemaId: string;
  schemaLabel: string;
  schemaIcon?: string;
  annotations: AnnotationItem[];
}

/** Element-level annotation for app builder form results: schema + form field + annotation text. */
export interface ElementAnnotation {
  schema: { id: string; label: string; icon?: string };
  formElement: string;
  annotation: { id: string; label: string };
}

/** Canvas annotation for SignaturePad: can be positioned and optionally bound to a shape (Miro-style). */
export interface CanvasAnnotation {
  id: string;
  label: string;
  x?: number;
  y?: number;
  shapeId?: string;
  createdBy?: string;
}
