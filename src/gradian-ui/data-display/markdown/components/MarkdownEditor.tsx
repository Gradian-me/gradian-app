'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/nord-dark.css';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

export interface MarkdownEditorProps {
  content: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
  className?: string;
  rootId?: string;
  showHeader?: boolean;
  headerTitle?: string;
  onSave?: (content: string) => Promise<void> | void;
}

export function MarkdownEditor({
  content,
  onChange,
  readOnly = false,
  className = '',
  rootId = 'milkdown-editor-root',
  showHeader = true,
  headerTitle = 'Markdown Editor',
  onSave,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const editorInstanceRef = useRef<any>(null);
  const contentRef = useRef<string>(content);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const isEditorInitializedRef = useRef<boolean>(false);
  const getContentFnRef = useRef<(() => string) | null>(null); // Store function to get current content
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSavedContentRef = useRef<string>(content);
  
  // Calculate dark mode state
  const isDark = useMemo(() => {
    if (typeof window === 'undefined' || !resolvedTheme) return false;
    return resolvedTheme === 'dark' || (resolvedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, [resolvedTheme]);
  
  // Update dark mode class when theme changes
  // Use a stable resolvedTheme value to ensure dependency array size stays constant
  const stableResolvedTheme = resolvedTheme || 'light';
  
  useEffect(() => {
    if (typeof window === 'undefined' || !editorRef.current || !mounted) return;
    
    // Wait for resolvedTheme to be available
    if (!resolvedTheme) return;
    
    const rootElement = editorRef.current;
    
    // Remove any existing theme classes first
    rootElement.classList.remove('crepe-dark');
    
    // Apply dark mode class only if actually dark
    if (isDark) {
      rootElement.classList.add('crepe-dark');
      rootElement.setAttribute('data-theme', 'dark');
    } else {
      rootElement.classList.remove('crepe-dark');
      rootElement.setAttribute('data-theme', 'light');
    }
    
    // Listen for system theme changes if using system theme
    if (resolvedTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = () => {
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (rootElement) {
          if (dark) {
            rootElement.classList.add('crepe-dark');
            rootElement.setAttribute('data-theme', 'dark');
          } else {
            rootElement.classList.remove('crepe-dark');
            rootElement.setAttribute('data-theme', 'light');
          }
        }
      };
      
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, [isDark, stableResolvedTheme, mounted]);

  // Update refs when props change
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    contentRef.current = content;
    // Update last saved content when content prop changes from outside
    if (content === lastSavedContentRef.current) {
      setSaveStatus('idle');
    }
  }, [content]);

  // Handle SSR - avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize editor
  useEffect(() => {
    if (!mounted || !editorRef.current) return;
    
    // If editor is already initialized, don't reinitialize
    if (isEditorInitializedRef.current) return;

    let isDestroyed = false;
    isEditorInitializedRef.current = true;

    // Create new editor instance with current content
    const crepe = new Crepe({
      root: editorRef.current,
      defaultValue: contentRef.current || content || '',
    });

    crepeRef.current = crepe;

    crepe
      .create()
      .then((editor) => {
        if (isDestroyed || !editor) return;

        // Store editor instance for later use
        editorInstanceRef.current = editor;

        // Set up change listener if onChange is provided
        if (onChangeRef.current) {
          // Use editor's action method to access editor context
          try {
            editor.action((ctx: any) => {
              if (isDestroyed) return;

              try {
                const view = ctx.get('editorViewCtx');
                const serializer = ctx.get('serializerCtx');
                const root = ctx.get('rootCtx');

                // Debounce content updates (reduced from 300ms to 100ms for better responsiveness)
                let updateTimeout: NodeJS.Timeout | null = null;

                // Create function to get current content (for save button)
                const getCurrentContent = () => {
                  try {
                    const markdown = serializer(root)(view.state.doc);
                    return markdown;
                  } catch (error) {
                    console.error('Error serializing content:', error);
                    return '';
                  }
                };

                // Store the function for save button to use
                getContentFnRef.current = getCurrentContent;

                const updateContent = () => {
                  if (updateTimeout) {
                    clearTimeout(updateTimeout);
                  }
                  updateTimeout = setTimeout(() => {
                    try {
                      const markdown = getCurrentContent();
                      
                      // Only call onChange if content actually changed to avoid infinite loops
                      if (onChangeRef.current && markdown !== contentRef.current) {
                        console.log('Auto-save: Content changed, length:', markdown.length);
                        // Update contentRef before calling onChange
                        contentRef.current = markdown;
                        // Immediately notify parent/store of changes
                        onChangeRef.current(markdown);
                        // Note: We don't update lastSavedContentRef here because
                        // auto-save is different from explicit save
                        // User must click Save button for explicit save confirmation
                      }
                    } catch (error) {
                      console.error('Error serializing content:', error);
                    }
                  }, 100); // Reduced debounce to 100ms for faster store updates
                };

                // Listen for document updates
                // Use multiple event types to catch all changes
                view.dom.addEventListener('input', updateContent);
                view.dom.addEventListener('keyup', updateContent);
                view.dom.addEventListener('paste', updateContent);
                
                // Also use a MutationObserver as fallback for any DOM changes
                const observer = new MutationObserver(() => {
                  updateContent();
                });
                
                if (view.dom) {
                  observer.observe(view.dom, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                  });
                }
                
                // Store observer for cleanup
                (crepe as any)._mutationObserver = observer;

                // Store cleanup function on crepe instance
                (crepe as any)._updateHandler = () => {
                  view.dom.removeEventListener('input', updateContent);
                  view.dom.removeEventListener('keyup', updateContent);
                  view.dom.removeEventListener('paste', updateContent);
                  if ((crepe as any)._mutationObserver) {
                    (crepe as any)._mutationObserver.disconnect();
                  }
                };
              } catch (error) {
                // Context not available yet, will retry on next user interaction
                console.warn('Editor context not ready for change listener:', error);
              }
            });
          } catch (error) {
            console.warn('Failed to set up editor change listener:', error);
          }
        }
      })
      .catch((error) => {
        if (!isDestroyed) {
          console.error('Error creating Milkdown editor:', error);
        }
      });

    // Cleanup function
    return () => {
      isDestroyed = true;
      if (crepeRef.current) {
        // Clean up event listeners
        if ((crepeRef.current as any)._updateHandler) {
          (crepeRef.current as any)._updateHandler();
        }
        crepeRef.current.destroy().catch(() => {});
        crepeRef.current = null;
        editorInstanceRef.current = null;
        isEditorInitializedRef.current = false;
        getContentFnRef.current = null; // Clear the content getter function
      }
    };
  }, [mounted]);

  // Update content when it changes externally (only if different)
  // Skip update if the content matches what we last sent via onChange to avoid loops
  useEffect(() => {
    if (!mounted || !editorInstanceRef.current) return;
    
    // Don't update if content hasn't actually changed (prevents unnecessary updates)
    // This prevents the editor from resetting when switching tabs or when parent updates
    if (content === contentRef.current) return;

    // Use stored editor instance
    const editor = editorInstanceRef.current;
    
    // Check if editor is still valid and ready
    if (!editor || !crepeRef.current) return;

    // Small delay to ensure editor is fully ready
    const timeoutId = setTimeout(() => {
      try {
        editor.action((ctx: any) => {
          try {
            const view = ctx.get('editorViewCtx');
            const parser = ctx.get('parserCtx');
            const serializer = ctx.get('serializerCtx');
            const root = ctx.get('rootCtx');

            const currentMarkdown = serializer(root)(view.state.doc);
            // Only update if content is actually different
            if (currentMarkdown !== content) {
              // Parse and set new content
              const doc = parser(content || '');
              if (doc) {
                const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content);
                view.dispatch(tr);
                contentRef.current = content;
                // Update last saved content when content prop changes externally
                lastSavedContentRef.current = content;
              }
            }
          } catch (error) {
            // Context not available or editor not ready
            console.warn('Editor context not ready for content update:', error);
          }
        });
      } catch (error) {
        // Editor might be destroyed or not ready
        console.warn('Editor not ready for content update:', error);
      }
    }, 50); // Small delay to ensure editor is ready

    return () => clearTimeout(timeoutId);
  }, [content, mounted]);

  // Force save function - gets current content and saves immediately
  const handleForceSave = useCallback(async () => {
    if (!onChangeRef.current) {
      toast.error('No onChange handler provided');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      let currentContent = '';
      
      // Try to get content using the stored function first
      if (getContentFnRef.current) {
        try {
          currentContent = getContentFnRef.current();
        } catch (error) {
          console.warn('Could not get content from stored function, trying alternative method:', error);
        }
      }

      // Fallback: Try to get content from stored editor instance
      if (!currentContent && editorInstanceRef.current) {
        try {
          const editor = editorInstanceRef.current;
          currentContent = await new Promise<string>((resolve, reject) => {
            try {
              editor.action((ctx: any) => {
                try {
                  const view = ctx.get('editorViewCtx');
                  const serializer = ctx.get('serializerCtx');
                  const root = ctx.get('rootCtx');
                  const markdown = serializer(root)(view.state.doc);
                  resolve(markdown);
                } catch (error) {
                  reject(error);
                }
              });
            } catch (error) {
              reject(error);
            }
          });
        } catch (error) {
          console.warn('Could not get content from editor instance:', error);
        }
      }

      // Last fallback: Use contentRef if all else fails
      if (currentContent === undefined || currentContent === null) {
        currentContent = contentRef.current || content || '';
      }

      console.log('Save: Retrieved content length:', currentContent?.length || 0);

      // Update content ref
      contentRef.current = currentContent;
      lastSavedContentRef.current = currentContent;

      console.log('Save: Calling onChange with content length:', currentContent.length);
      
      // Call onChange to update store immediately
      if (onChangeRef.current) {
        onChangeRef.current(currentContent);
      } else {
        console.error('Save: onChangeRef.current is null!');
      }

      // Call onSave if provided (for async operations like API calls)
      if (onSaveRef.current) {
        await onSaveRef.current(currentContent);
      }

      setSaveStatus('saved');
      toast.success('Changes saved successfully');

      // Reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving content:', error);
      setSaveStatus('error');
      toast.error('Failed to save changes');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  }, [content]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!editorInstanceRef.current) return false;
    // This will be checked dynamically when needed
    return contentRef.current !== lastSavedContentRef.current;
  }, [content, saveStatus]);

  if (!mounted) {
    return (
      <div
        className={`min-h-[400px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 ${className}`}
        ref={editorRef}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500 dark:text-gray-400">Loading editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`markdown-editor-wrapper flex flex-col ${className}`}>
      {showHeader && !readOnly && (
        <div className="flex items-center justify-between mb-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {headerTitle}
            </h3>
            {saveStatus === 'saved' && (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-red-600 dark:text-red-400">
                Save failed
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Auto-save enabled
              </span>
            )}
          </div>
          <Button
            onClick={handleForceSave}
            disabled={isSaving || readOnly}
            size="sm"
            className="gap-2"
            variant={saveStatus === 'saved' ? 'default' : 'default'}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Check className="h-4 w-4" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      )}
      <div
        id={rootId}
        ref={editorRef}
        className={`min-h-[400px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${
          isDark ? 'crepe-dark' : ''
        }`}
        data-theme={isDark ? 'dark' : 'light'}
      />
    </div>
  );
}

MarkdownEditor.displayName = 'MarkdownEditor';

