import { FormSchema } from './form-schema';
import { Message } from '@/gradian-ui/layout/message-box';

export type SchemaTab = 'system' | 'business';

export interface DeleteDialogState {
  open: boolean;
  schema: FormSchema | null;
}

export interface CreateSchemaPayload {
  singularName: string;
  pluralName: string;
  schemaId: string;
  description: string;
  showInNavigation: boolean;
  isSystemSchema: boolean;
  isNotCompanyBased: boolean;
  allowDataInactive?: boolean;
  allowDataForce?: boolean;
  allowDataHardDelete?: boolean;
   allowDataAssignedTo?: boolean;
   allowDataDueDate?: boolean;
}

export interface SchemaCreateResult {
  success: boolean;
  error?: string;
  messages?: Message[];
  message?: string | Record<string, string>;
}
