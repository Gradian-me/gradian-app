import { BusinessRuleWrapper } from '@/domains/business-rule-engine/components/BusinessRuleWrapper';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Rules Builder | Gradian App',
  description: 'Create and manage business rules for your application',
};

export default function BusinessRulesBuilderPage() {
  return <BusinessRuleWrapper title="Business Rules Builder" />;
}

