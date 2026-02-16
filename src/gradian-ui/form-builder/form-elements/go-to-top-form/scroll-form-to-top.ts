/**
 * Finds the form's scroll container (dialog viewport or form scroll area)
 * and scrolls it to top. Same logic as GoToTopForm - scrolls within the
 * form container, not the window, to avoid moving modal layout.
 */
export function scrollFormToTop(selector?: string): void {
  if (typeof document === 'undefined') return;

  const findContainer = (): HTMLElement | null => {
    if (selector) {
      const container = document.querySelector(selector) as HTMLElement;
      if (container) return container;
    }

    const formDialogForm = document.getElementById('form-dialog-form');
    if (formDialogForm) {
      const scrollArea =
        formDialogForm.closest('[data-scroll-container="form-dialog-scroll"]') ||
        formDialogForm.closest('[data-radix-scroll-area-root]');
      if (scrollArea) {
        const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (viewport) return viewport;
      }
    }

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    if (dialog) {
      const dialogViewport = dialog.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (dialogViewport) return dialogViewport;
      const dialogContent = dialog.querySelector('[class*="DialogContent"]') as HTMLElement;
      if (dialogContent && dialogContent.scrollHeight > dialogContent.clientHeight) {
        return dialogContent;
      }
    }

    const formElement = document.getElementById('form-dialog-form') || document.querySelector('form');
    if (formElement) {
      let parent = formElement.parentElement;
      let depth = 0;
      while (parent && depth < 5) {
        if (parent.scrollHeight > parent.clientHeight) return parent;
        parent = parent.parentElement;
        depth++;
      }
    }

    return null;
  };

  const container = findContainer();
  if (container) {
    container.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
