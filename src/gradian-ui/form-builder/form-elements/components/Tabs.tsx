'use client';

import React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/utils';
import {
  Tabs as BaseTabs,
  TabsList as BaseTabsList,
  TabsTrigger as BaseTabsTrigger,
  TabsContent as BaseTabsContent,
} from '@/components/ui/tabs';

export type FormTabsProps = React.ComponentPropsWithoutRef<typeof BaseTabs>;

export interface FormTabsListProps extends React.ComponentPropsWithoutRef<typeof BaseTabsList> {
  /**
   * Optional class name applied to the outer scroll area root.
   */
  scrollAreaClassName?: string;
  /**
   * When true (default) shows the horizontal scrollbar.
   */
  showScrollBar?: boolean;
}

interface HorizontalScrollAreaProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  children: React.ReactNode;
  showScrollBar?: boolean;
}

const HorizontalScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Viewport>,
  HorizontalScrollAreaProps
>(({ className, children, showScrollBar = true, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    type="auto"
    className={cn('relative w-full overflow-hidden', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport ref={ref} className="w-full rounded-[inherit] pb-2">
      {children}
    </ScrollAreaPrimitive.Viewport>
    {showScrollBar ? (
      <ScrollAreaPrimitive.Scrollbar
        orientation="horizontal"
        className="flex h-1 select-none touch-none flex-col border-t border-transparent bg-transparent px-1"
      >
        <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-gray-400/50 transition-colors hover:bg-gray-500/80" />
      </ScrollAreaPrimitive.Scrollbar>
    ) : null}
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
HorizontalScrollArea.displayName = 'HorizontalScrollArea';

const FormTabsList = React.forwardRef<React.ElementRef<typeof BaseTabsList>, FormTabsListProps>(
  ({ className, scrollAreaClassName, showScrollBar = true, ...props }, ref) => (
    <HorizontalScrollArea
      className={cn(
        'w-full [&_[data-orientation=vertical]]:hidden',
        !showScrollBar && '[&_[data-orientation=horizontal]]:hidden',
        scrollAreaClassName
      )}
      showScrollBar={showScrollBar}
    >
      <BaseTabsList
        ref={ref}
        className={cn(
          'inline-flex gap-2 bg-gray-100 p-1.5 justify-start',
          'rounded-xl md:gap-3',
          '[&>*]:shrink-0',
          className
        )}
        {...props}
      />
    </HorizontalScrollArea>
  )
);
FormTabsList.displayName = 'FormTabsList';

const FormTabsTrigger = BaseTabsTrigger;

const FormTabsContent = React.forwardRef<
  React.ElementRef<typeof BaseTabsContent>,
  React.ComponentPropsWithoutRef<typeof BaseTabsContent>
>(({ className, ...props }, ref) => (
  <BaseTabsContent
    ref={ref}
    className={cn('mt-4 focus-visible:outline-none', className)}
    {...props}
  />
));
FormTabsContent.displayName = 'FormTabsContent';

const FormTabs = BaseTabs;

export { FormTabs, FormTabsList, FormTabsTrigger, FormTabsContent };


