import { Metadata } from 'next';
import SchemaBuilderClient from './SchemaBuilderClient';

export const metadata: Metadata = {
  title: 'Schema Builder | Gradian',
  description: 'Create, edit, and manage form schemas for your application data.',
};

export default function SchemaBuilderPage() {
  return <SchemaBuilderClient />;
}

