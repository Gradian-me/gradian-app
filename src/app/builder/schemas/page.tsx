import { Metadata } from 'next';
import { SchemaManagerWrapper } from '@/gradian-ui/schema-manager/components';

export const metadata: Metadata = {
  title: 'Schema Builder | Gradian',
  description: 'Create, edit, and manage form schemas for your application data.',
};

export default function SchemaBuilderPage() {
  return <SchemaManagerWrapper />;
}

