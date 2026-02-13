import { BusinessRuleWrapper } from '@/domains/business-rule-engine/components/BusinessRuleWrapper';

// Avoid prerender: bundle has a "Cannot access before initialization" in server chunk during static generation
export const dynamic = 'force-dynamic';

export default function BusinessRulesTestPage() {
  return <BusinessRuleWrapper title="Business Rules Test" />;
}

