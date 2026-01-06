'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface DialogState {
  id: string;
  type: 'dialog' | 'dropdown' | 'modal' | 'sidebar';
  onClose: () => void;
}

interface DialogContextType {
  registerDialog: (id: string, type: DialogState['type'], onClose: () => void) => void;
  unregisterDialog: (id: string) => void;
  closeAllDialogs: () => boolean; // Returns true if any dialogs were closed
  hasOpenDialogs: () => boolean;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  // Use ref to store dialogs to avoid re-renders and infinite loops
  const dialogsRef = useRef<Map<string, DialogState>>(new Map());
  const historyStatePushedRef = useRef(false);

  const registerDialog = useCallback((id: string, type: DialogState['type'], onClose: () => void) => {
    const wasEmpty = dialogsRef.current.size === 0;
    dialogsRef.current.set(id, { id, type, onClose });
    
    // Push history state when first dialog opens (on mobile)
    if (wasEmpty && typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        window.history.pushState({ dialogOpen: true }, '', window.location.href);
        historyStatePushedRef.current = true;
      }
    }
  }, []);

  const unregisterDialog = useCallback((id: string) => {
    dialogsRef.current.delete(id);
    
    // If all dialogs are closed and we pushed a history state, go back
    if (dialogsRef.current.size === 0 && historyStatePushedRef.current && typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (isMobile && window.history.state?.dialogOpen) {
        // Don't actually navigate, just remove the state we added
        historyStatePushedRef.current = false;
      }
    }
  }, []);

  const closeAllDialogs = useCallback(() => {
    if (dialogsRef.current.size === 0) {
      return false;
    }

    // Close all dialogs in reverse order (most recent first)
    const dialogsArray = Array.from(dialogsRef.current.values()).reverse();
    dialogsArray.forEach((dialog) => {
      try {
        dialog.onClose();
      } catch (error) {
        console.warn(`Error closing dialog ${dialog.id}:`, error);
      }
    });

    // Reset history state flag
    historyStatePushedRef.current = false;

    return true;
  }, []);

  const hasOpenDialogs = useCallback(() => {
    return dialogsRef.current.size > 0;
  }, []);

  return (
    <DialogContext.Provider
      value={{
        registerDialog,
        unregisterDialog,
        closeAllDialogs,
        hasOpenDialogs,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

export function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    // During SSR, provide a fallback context to prevent errors
    // This will be replaced with the real context on the client
    if (typeof window === 'undefined') {
      return {
        registerDialog: () => {},
        unregisterDialog: () => {},
        closeAllDialogs: () => false,
        hasOpenDialogs: () => false,
      };
    }
    throw new Error('useDialogContext must be used within DialogProvider');
  }
  return context;
}

/**
 * Hook to register a dialog/dropdown for back button handling
 */
export function useDialogBackHandler(
  isOpen: boolean,
  onClose: () => void,
  type: DialogState['type'] = 'dialog',
  id?: string
) {
  const { registerDialog, unregisterDialog } = useDialogContext();
  const dialogIdRef = useRef<string | null>(id || null);
  const idGeneratedRef = useRef<boolean>(!!id);

  useEffect(() => {
    // Generate ID lazily in effect to avoid calling Math.random during render
    if (!idGeneratedRef.current && !dialogIdRef.current) {
      dialogIdRef.current = `dialog-${Math.random().toString(36).substring(7)}`;
      idGeneratedRef.current = true;
    }

    if (isOpen && dialogIdRef.current) {
      registerDialog(dialogIdRef.current, type, onClose);
      return () => {
        if (dialogIdRef.current) {
          unregisterDialog(dialogIdRef.current);
        }
      };
    } else if (dialogIdRef.current) {
      unregisterDialog(dialogIdRef.current);
    }
  }, [isOpen, onClose, type, registerDialog, unregisterDialog]);
}

