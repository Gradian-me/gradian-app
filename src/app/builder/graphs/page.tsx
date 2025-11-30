import { Metadata } from 'next';

import { GraphDesignerWrapper } from '@/domains/graph-designer';

export const metadata: Metadata = {
  title: 'Graph Designer | Gradian',
  description: 'Design and manage data relationship graphs.',
};

export default function GraphDesignerPage() {
  return <GraphDesignerWrapper />;
}



