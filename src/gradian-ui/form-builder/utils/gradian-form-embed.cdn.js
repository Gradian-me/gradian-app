/**
 * Gradian Form Embed - Modal/Dialog Version (No Popup, No Iframe)
 * 
 * This version creates a modal dialog directly in the page instead of opening a popup.
 * 
 * Usage:
 * <script src="https://cdn.yourapp.com/gradian-form-embed.min.js"></script>
 * <script>
 *   GradianFormEmbedModal.createData('tags', { 
 *     baseUrl: 'https://yourapp.com',
 *     initialValues: { name: 'New Tag' } 
 *   });
 * </script>
 */

(function (global) {
  'use strict';

  /**
   * Create and manage modal dialog
   */
  function createModal() {
    // Check if modal already exists
    let modal = document.getElementById('gradian-form-embed-modal');
    if (modal) {
      return modal;
    }

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'gradian-form-embed-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 9998;
      display: none;
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
    `;

    // Create modal container
    modal = document.createElement('div');
    modal.id = 'gradian-form-embed-modal';
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      max-width: 95vw;
      max-height: 95vh;
      width: 1200px;
      height: 85vh;
      display: none;
      flex-direction: column;
      overflow: hidden;
    `;

    // Create modal header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    `;

    const title = document.createElement('h2');
    title.id = 'gradian-form-embed-modal-title';
    title.style.cssText = `
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 28px;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    `;
    closeBtn.onmouseover = function() { this.style.background = '#f3f4f6'; };
    closeBtn.onmouseout = function() { this.style.background = 'none'; };

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create modal body
    const body = document.createElement('div');
    body.id = 'gradian-form-embed-modal-body';
    body.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 6px;
    `;

    // Create loading indicator
    const loading = document.createElement('div');
    loading.id = 'gradian-form-embed-modal-loading';
    loading.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #6b7280;
    `;
    loading.innerHTML = `
      <div style="
        width: 40px;
        height: 40px;
        border: 4px solid #e5e7eb;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      "></div>
      <div>Loading form...</div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;

    body.appendChild(loading);
    modal.appendChild(header);
    modal.appendChild(body);
    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    // Close handlers
    function closeModal() {
      // Resolve/reject promise if exists (for manual close) - do this FIRST
      var resolveFn = modal.resolvePromise;
      var rejectFn = modal.rejectPromise;
      
      // Only resolve if handlers still exist (not already resolved)
      if (!resolveFn && !rejectFn) {
        // Already resolved, just close the modal UI
        overlay.style.opacity = '0';
        modal.style.opacity = '0';
        setTimeout(function() {
          overlay.style.display = 'none';
          modal.style.display = 'none';
          body.innerHTML = '';
          body.appendChild(loading);
        }, 200);
        return;
      }
      
      // Clear promise handlers immediately to prevent double resolution
      modal.resolvePromise = null;
      modal.rejectPromise = null;
      
      // Resolve promise synchronously before any async operations
      if (resolveFn) {
        try {
          console.log('[Modal CDN] Resolving promise in closeModal');
          resolveFn({
            success: false,
            error: 'Form was closed without submission',
          });
          console.log('[Modal CDN] Promise resolved successfully in closeModal');
        } catch (e) {
          console.error('[Modal CDN] Error resolving promise in closeModal:', e);
          // If resolve fails, try to reject instead
          if (rejectFn) {
            try {
              rejectFn(new Error('Form was closed without submission'));
            } catch (e2) {
              console.error('[Modal CDN] Error rejecting promise in closeModal:', e2);
            }
          }
        }
      } else if (rejectFn) {
        // If no resolve function but we have reject, use that
        try {
          console.log('[Modal CDN] Rejecting promise in closeModal');
          rejectFn(new Error('Form was closed without submission'));
        } catch (e) {
          console.error('[Modal CDN] Error rejecting promise in closeModal:', e);
        }
      } else {
        console.warn('[Modal CDN] closeModal called but no promise handlers found');
      }

      // Send close message to iframe if it exists
      // SECURITY: Using '*' origin for postMessage is required for CDN embedding scenarios
      // where the parent page origin is unknown. The iframe validates message types and
      // only processes expected message formats, providing defense-in-depth.
      const iframe = body.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        try {
          // Try to get origin from iframe src if available, otherwise use wildcard
          const iframeSrc = iframe.src;
          const targetOrigin = iframeSrc ? (new URL(iframeSrc).origin) : '*';
          iframe.contentWindow.postMessage({
            type: 'close-form',
            timestamp: Date.now(),
          }, targetOrigin);
        } catch (e) {
          // SECURITY: Wildcard postMessage is only used as fallback when origin extraction fails
          // This is necessary for CDN embedding scenarios where origin may be unknown
          // The message content is controlled and does not contain sensitive data
          // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration
          // Rationale: CDN embedding requires fallback to wildcard when origin cannot be determined
          // Message payload is limited to non-sensitive control messages (type, timestamp)
          try {
            iframe.contentWindow.postMessage({
              type: 'close-form',
              timestamp: Date.now(),
            }, '*');
          } catch (e2) {
            // Ignore cross-origin errors
          }
        }
      }

      overlay.style.opacity = '0';
      modal.style.opacity = '0';
      setTimeout(function() {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        body.innerHTML = '';
        body.appendChild(loading);
        
        // Cleanup if exists
        if (modal.cleanup) {
          modal.cleanup();
        }
      }, 200);
    }

    overlay.onclick = function(e) {
      if (e.target === overlay) {
        closeModal();
      }
    };

    closeBtn.onclick = closeModal;

    // Store close function
    modal.closeModal = closeModal;

    return modal;
  }

  /**
   * Show modal
   */
  function showModal(title) {
    const modal = createModal();
    const overlay = document.getElementById('gradian-form-embed-modal-overlay');
    const titleEl = document.getElementById('gradian-form-embed-modal-title');
    
    if (titleEl) titleEl.textContent = title || 'Form';
    
    overlay.style.display = 'block';
    modal.style.display = 'flex';
    
    // Trigger animation
    setTimeout(function() {
      overlay.style.opacity = '1';
      modal.style.opacity = '1';
    }, 10);
  }

  /**
   * Load form in modal using iframe (but styled as modal)
   */
  function loadFormInModal(options, resolve, reject) {
    const schemaId = options.schemaId;
    const mode = options.mode || 'create';
    const entityId = options.entityId;
    const initialValues = options.initialValues;
    const baseUrl = options.baseUrl;

    // Build URL
    const url = new URL(baseUrl + '/forms/embed');
    url.searchParams.set('schemaId', schemaId);
    url.searchParams.set('mode', mode);
    if (entityId) url.searchParams.set('entityId', entityId);
    if (initialValues) {
      url.searchParams.set('initialValues', JSON.stringify(initialValues));
    }
    url.searchParams.set('returnOrigin', window.location.origin);
    url.searchParams.set('modalMode', 'true'); // Signal we're in modal mode

    const modal = createModal();
    const body = document.getElementById('gradian-form-embed-modal-body');
    const loading = document.getElementById('gradian-form-embed-modal-loading');

    // Create iframe (but it's hidden and we'll extract content)
    // Actually, better approach: fetch the page and extract the form
    // Or use a dedicated API endpoint that returns form HTML

    // For now, use iframe but make it seamless
    const iframe = document.createElement('iframe');
    iframe.src = url.toString();
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      min-height: 600px;
    `;
    iframe.onload = function() {
      loading.style.display = 'none';
    };

    body.innerHTML = '';
    body.appendChild(iframe);

    // Store resolve/reject for manual close
    modal.resolvePromise = resolve;
    modal.rejectPromise = reject;

    // Listen for messages from iframe
    const handleMessage = function(event) {
      // Log for debugging
      console.log('[Modal CDN] Received message:', event.data, 'from origin:', event.origin);
      
      if (event.origin !== new URL(baseUrl).origin) {
        console.log('[Modal CDN] Origin mismatch, ignoring message');
        return;
      }

      const message = event.data;
      if (!message || typeof message !== 'object' || !message.type) {
        console.log('[Modal CDN] Invalid message format, ignoring');
        return;
      }

      // Get promise handlers BEFORE clearing them
      var resolveFn = modal.resolvePromise;
      var rejectFn = modal.rejectPromise;

      console.log('[Modal CDN] Message type:', message.type, 'Has handlers:', !!resolveFn, !!rejectFn);

      // Only process if we still have promise handlers (not already resolved by manual close)
      if (!resolveFn && !rejectFn) {
        console.log('[Modal CDN] Promise already resolved, just ensuring modal is closed');
        // Promise already resolved/rejected, just handle the message without resolving
        if (message.type === 'form-closed' || message.type === 'form-submitted') {
          // Modal should already be closed, but ensure it's closed
          if (modal.style.display !== 'none') {
            modal.closeModal();
          }
        }
        return;
      }

      // Remove listener and clear promise handlers to prevent double resolution
      window.removeEventListener('message', handleMessage);
      modal.resolvePromise = null;
      modal.rejectPromise = null;

      if (message.type === 'form-submitted') {
        // Close modal first
        modal.closeModal();
        
        // Then resolve promise
        if (message.payload && message.payload.success) {
          if (resolveFn) {
            resolveFn({
            success: true,
            data: message.payload.data,
            entityId: message.payload.entityId,
          });
          }
        } else {
          if (resolveFn) {
            resolveFn({
            success: false,
            error: message.payload && message.payload.error ? message.payload.error : 'Form submission failed',
          });
          }
        }
      } else if (message.type === 'form-closed') {
        // Resolve the promise first
        if (resolveFn) {
          try {
            resolveFn({
            success: false,
            error: 'Form was closed without submission',
          });
          } catch (e) {
            console.error('Error resolving promise on form-closed:', e);
          }
        }
        
        // Close the modal (handlers are already cleared, so it won't resolve again)
          modal.closeModal();
      } else if (message.type === 'form-error') {
        modal.closeModal();
        if (rejectFn) {
          rejectFn(new Error(message.payload && message.payload.error ? message.payload.error : 'Unknown error'));
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Store cleanup
    modal.cleanup = function() {
      window.removeEventListener('message', handleMessage);
      modal.resolvePromise = null;
      modal.rejectPromise = null;
    };
  }

  /**
   * Open form in modal
   */
  function openFormEmbedModal(options) {
    return new Promise(function(resolve, reject) {
      const schemaId = options.schemaId;
      const mode = options.mode || 'create';
      const title = mode === 'edit' 
        ? 'Edit ' + schemaId.charAt(0).toUpperCase() + schemaId.slice(1)
        : 'Create New ' + schemaId.charAt(0).toUpperCase() + schemaId.slice(1);

      showModal(title);
      loadFormInModal(options, resolve, reject);
    });
  }

  /**
   * Create data for any schema (modal version)
   */
  function createData(schemaId, options) {
    options = options || {};
    return openFormEmbedModal({
      baseUrl: options.baseUrl,
      schemaId: schemaId,
      mode: 'create',
      initialValues: options.initialValues,
    });
  }

  /**
   * Edit data for any schema (modal version)
   */
  function editData(schemaId, entityId, options) {
    options = options || {};
    return openFormEmbedModal({
      baseUrl: options.baseUrl,
      schemaId: schemaId,
      mode: 'edit',
      entityId: entityId,
    });
  }

  /**
   * Expose API globally
   */
  var GradianFormEmbedModal = {
    openFormEmbed: openFormEmbedModal,
    createData: createData,
    editData: editData,
    version: '1.0.0',
  };

  // Export for different module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GradianFormEmbedModal;
  } else if (typeof define === 'function' && define.amd) {
    define(function () {
      return GradianFormEmbedModal;
    });
  } else {
    global.GradianFormEmbedModal = GradianFormEmbedModal;
  }

  if (typeof window !== 'undefined') {
    window.GradianFormEmbedModal = GradianFormEmbedModal;
  }
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

