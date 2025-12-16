'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface LayoutContextType {
  isMaximized: boolean;
  toggleMaximize: () => void;
  setIsMaximized: (value: boolean) => void;
  title: string;
  icon?: string;
  setTitle: (title: string) => void;
  setIcon: (icon?: string) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [isMaximized, setIsMaximizedState] = useState(false);
  const [title, setTitleState] = useState('');
  const [icon, setIconState] = useState<string | undefined>(undefined);

  const toggleMaximize = useCallback(() => {
    setIsMaximizedState((prev) => !prev);
  }, []);

  const setIsMaximized = useCallback((value: boolean) => {
    setIsMaximizedState(value);
  }, []);

  const setTitle = useCallback((newTitle: string) => {
    setTitleState(newTitle);
  }, []);

  const setIcon = useCallback((newIcon?: string) => {
    setIconState(newIcon);
  }, []);

  return (
    <LayoutContext.Provider value={{ isMaximized, toggleMaximize, setIsMaximized, title, icon, setTitle, setIcon }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    // Return default values if context is not available (for backwards compatibility)
    return {
      isMaximized: false,
      toggleMaximize: () => {},
      setIsMaximized: () => {},
      title: '',
      icon: undefined,
      setTitle: () => {},
      setIcon: () => {},
    };
  }
  return context;
}

