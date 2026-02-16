'use client';

import dynamic from 'next/dynamic';

const BusinessRuleWrapper = dynamic(
  () =>
    import('@/domains/business-rule-engine/components/BusinessRuleWrapper').then(
      (mod) => mod.BusinessRuleWrapper
    ),
  { ssr: false }
);

export default function BusinessRulesClient() {
  return <BusinessRuleWrapper title="Business Rules Builder" />;
}

