import { Metadata } from 'next';
import BusinessRulesClient from './BusinessRulesClient';

export const metadata: Metadata = {
  title: 'Business Rules Builder | Gradian',
  description: 'Create and manage business rules for your application',
};

export default function BusinessRulesBuilderPage() {
  return <BusinessRulesClient />;
}

