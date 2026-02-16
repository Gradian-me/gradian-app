'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/main-layout';
import { LayoutPropsProvider } from '@/gradian-ui/layout/contexts/LayoutPropsContext';

interface AppShellLayoutProps {
  children: React.ReactNode;
}

/**
 * Persistent app shell used by (app) route group layout.
 * Provides LayoutPropsContext so pages can set title/icon via useSetLayoutProps.
 * Renders MainLayout once; only children (page content) change on navigation.
 */
export function AppShellLayout({ children }: AppShellLayoutProps) {
  const pathname = usePathname();

  return (
    <LayoutPropsProvider>
      <MainLayout>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname ?? 'root'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full min-h-0"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </MainLayout>
    </LayoutPropsProvider>
  );
}
