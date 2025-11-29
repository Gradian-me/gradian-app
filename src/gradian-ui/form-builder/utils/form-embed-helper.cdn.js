/**
 * Gradian Form Embed Helper - CDN Version
 * 
 * This is a browser-compatible, standalone script that can be loaded from a CDN.
 * It exposes a global `GradianFormEmbed` object with helper functions.
 * 
 * Usage:
 * <script src="https://cdn.yourapp.com/form-embed-helper.js"></script>
 * <script>
 *   GradianFormEmbed.createData('tags', { initialValues: { name: 'New Tag' } });
 * </script>
 */

(function (global) {
  'use strict';

  /**
   * Validate message origin (security check)
   */
  function validateMessageOrigin(event, allowedOrigins) {
    if (!allowedOrigins || allowedOrigins.length === 0) {
      return true; // Allow all for development
    }

    const origin = event.origin;
    return allowedOrigins.some(function (allowed) {
      if (allowed === '*') return true;
      if (allowed.indexOf('*') !== -1) {
        const pattern = allowed.replace(/\*/g, '.*');
        const regex = new RegExp('^' + pattern + '$');
        return regex.test(origin);
      }
      return origin === allowed;
    });
  }

  /**
   * Check if message is a valid form embed message
   */
  function isFormEmbedMessage(message) {
    return (
      message &&
      typeof message === 'object' &&
      'type' in message &&
      'timestamp' in message &&
      typeof message.type === 'string' &&
      typeof message.timestamp === 'number'
    );
  }

  /**
   * Open a form in a popup window and return a promise
   */
  function openFormEmbed(options) {
    var baseUrl = options.baseUrl;
    var schemaId = options.schemaId;
    var mode = options.mode || 'create';
    var entityId = options.entityId;
    var initialValues = options.initialValues;
    var popupFeatures = options.popupFeatures || {};
    var allowedOrigins = options.allowedOrigins;
    var timeout = options.timeout || 300000;

    // Determine base URL
    if (!baseUrl) {
      baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    }
    if (!baseUrl) {
      throw new Error('baseUrl is required when not running in a browser environment');
    }

    // Build URL with query parameters
    var url = new URL('/forms/embed', baseUrl);
    url.searchParams.set('schemaId', schemaId);
    url.searchParams.set('mode', mode);

    if (entityId) {
      url.searchParams.set('entityId', entityId);
    }

    if (initialValues) {
      try {
        var encoded = encodeURIComponent(JSON.stringify(initialValues));
        url.searchParams.set('initialValues', encoded);
      } catch (error) {
        console.error('Failed to encode initialValues:', error);
      }
    }

    // Set return origin for postMessage
    if (typeof window !== 'undefined') {
      url.searchParams.set('returnOrigin', window.location.origin);
    }

    // Determine allowed origins for message validation
    var messageOrigins = allowedOrigins || [baseUrl];

    // Configure popup window
    var width = popupFeatures.width || 900;
    var height = popupFeatures.height || 700;
    var left = popupFeatures.left || (typeof window !== 'undefined' ? (window.screen.width - width) / 2 : 0);
    var top = popupFeatures.top || (typeof window !== 'undefined' ? (window.screen.height - height) / 2 : 0);

    var popupWindow = window.open(
      url.toString(),
      'formEmbed',
      'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',resizable=yes,scrollbars=yes'
    );

    if (!popupWindow) {
      throw new Error('Failed to open popup window. Please check your popup blocker settings.');
    }

    // Create promise that resolves when form is submitted or closed
    var resolvePromise;
    var rejectPromise;
    var timeoutId = null;

    var promise = new Promise(function (resolve, reject) {
      resolvePromise = resolve;
      rejectPromise = reject;

      // Set timeout
      if (timeout > 0) {
        timeoutId = setTimeout(function () {
          popupWindow.close();
          reject(new Error('Form embed timeout after ' + timeout + 'ms'));
        }, timeout);
      }

      // Listen for messages from the popup
      var handleMessage = function (event) {
        // Validate origin
        if (!validateMessageOrigin(event, messageOrigins)) {
          console.warn('[FormEmbedHelper] Message from unauthorized origin:', event.origin);
          return;
        }

        // Validate message structure
        if (!isFormEmbedMessage(event.data)) {
          return;
        }

        var message = event.data;

        switch (message.type) {
          case 'form-submitted':
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            window.removeEventListener('message', handleMessage);

            if (message.payload && message.payload.success) {
              resolvePromise({
                success: true,
                data: message.payload.data,
                entityId: message.payload.entityId,
              });
            } else {
              resolvePromise({
                success: false,
                error: message.payload && message.payload.error ? message.payload.error : 'Form submission failed',
              });
            }
            break;

          case 'form-closed':
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            window.removeEventListener('message', handleMessage);

            if (message.payload && message.payload.reason === 'success') {
              resolvePromise({
                success: true,
              });
            } else {
              resolvePromise({
                success: false,
                error: 'Form was closed without submission',
              });
            }
            break;

          case 'form-error':
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            window.removeEventListener('message', handleMessage);

            rejectPromise(new Error(message.payload && message.payload.error ? message.payload.error : 'Unknown error occurred'));
            break;

          default:
            // Ignore other message types
            break;
        }
      };

      window.addEventListener('message', handleMessage);

      // Also listen for popup close (in case user closes without sending message)
      var checkClosed = setInterval(function () {
        if (popupWindow.closed) {
          clearInterval(checkClosed);
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          window.removeEventListener('message', handleMessage);
          resolvePromise({
            success: false,
            error: 'Form window was closed',
          });
        }
      }, 500);
    });

    // Add close method to promise
    promise.close = function () {
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    return promise;
  }

  /**
   * Create data for any schema
   */
  function createData(schemaId, options) {
    options = options || {};
    return openFormEmbed({
      baseUrl: options.baseUrl,
      schemaId: schemaId,
      mode: 'create',
      initialValues: options.initialValues,
      popupFeatures: options.popupFeatures,
      timeout: options.timeout,
      allowedOrigins: options.allowedOrigins,
    });
  }

  /**
   * Edit data for any schema
   */
  function editData(schemaId, entityId, options) {
    options = options || {};
    return openFormEmbed({
      baseUrl: options.baseUrl,
      schemaId: schemaId,
      mode: 'edit',
      entityId: entityId,
      popupFeatures: options.popupFeatures,
      timeout: options.timeout,
      allowedOrigins: options.allowedOrigins,
    });
  }

  /**
   * Expose API globally
   */
  var GradianFormEmbed = {
    openFormEmbed: openFormEmbed,
    createData: createData,
    editData: editData,
    version: '1.0.0',
  };

  // Export for different module systems
  if (typeof module !== 'undefined' && module.exports) {
    // CommonJS
    module.exports = GradianFormEmbed;
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(function () {
      return GradianFormEmbed;
    });
  } else {
    // Browser global
    global.GradianFormEmbed = GradianFormEmbed;
  }

  // Also support window.GradianFormEmbed for explicit access
  if (typeof window !== 'undefined') {
    window.GradianFormEmbed = GradianFormEmbed;
  }
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

