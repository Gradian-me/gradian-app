'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';

export interface LayoutPropsState {
  title: string;
  subtitle?: string | React.ReactNode;
  icon?: string;
  showActionButtons?: boolean;
  showCreateButton?: boolean;
  createButtonText?: string;
  onCreateClick?: () => void;
  editSchemaPath?: string;
  isAdmin?: boolean;
  navigationSchemas?: FormSchema[];
  customHeaderActions?: React.ReactNode;
  showEndLine?: boolean;
  hidePadding?: boolean;
}

const defaultLayoutProps: LayoutPropsState = {
  title: '',
  subtitle: undefined,
  icon: undefined,
  showActionButtons: true,
  showCreateButton: false,
  createButtonText: 'Create',
  onCreateClick: undefined,
  editSchemaPath: undefined,
  isAdmin: false,
  navigationSchemas: undefined,
  customHeaderActions: undefined,
  showEndLine: true,
  hidePadding: false,
};

interface LayoutPropsContextType {
  layoutProps: LayoutPropsState;
  setLayoutProps: (props: Partial<LayoutPropsState>) => void;
}

const LayoutPropsContext = createContext<LayoutPropsContextType | undefined>(undefined);

export function LayoutPropsProvider({ children }: { children: React.ReactNode }) {
  const [layoutProps, setLayoutPropsState] = useState<LayoutPropsState>(defaultLayoutProps);

  const setLayoutProps = useCallback((props: Partial<LayoutPropsState>) => {
    setLayoutPropsState((prev) => ({ ...prev, ...props }));
  }, []);

  return (
    <LayoutPropsContext.Provider value={{ layoutProps, setLayoutProps }}>
      {children}
    </LayoutPropsContext.Provider>
  );
}

export function useLayoutProps() {
  const context = useContext(LayoutPropsContext);
  if (context === undefined) {
    return {
      layoutProps: defaultLayoutProps,
      setLayoutProps: () => {},
    };
  }
  return context;
}

/**
 * Hook for pages under (app) to set layout props when they mount.
 * Call with the same props you would pass to MainLayout.
 * When the page unmounts, layout props are reset so the next page can set its own.
 * When title/icon (or other key props) change, layout is updated.
 */
export function useSetLayoutProps(props: Partial<LayoutPropsState>) {
  const { setLayoutProps } = useLayoutProps();

  useEffect(() => {
    setLayoutProps(props);
    return () => {
      setLayoutProps(defaultLayoutProps);
    };
  }, [setLayoutProps, props.title, props.icon, props.subtitle, props.showActionButtons, props.showCreateButton, props.createButtonText, props.editSchemaPath, props.isAdmin, props.showEndLine, props.hidePadding]);
}
