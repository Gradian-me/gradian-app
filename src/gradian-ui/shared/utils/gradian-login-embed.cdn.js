/**
 * Gradian Login Embed - CDN helper for third-party sites
 *
 * Route: http://app1.cinnagen.com/authentication/login-modal
 * returnOrigin is set to the origin of the page where the button was clicked (window.location.origin).
 *
 * Usage:
 * <script src="https://your-app.com/cdn/gradian-login-embed.min.js"></script>
 * <script>
 *   GradianLoginEmbed.openModal();
 *   // or
 *   GradianLoginEmbed.openPopup();
 * </script>
 *
 * On login success: modal closes and page reloads; popup closes and opener reloads.
 */

(function (global) {
  'use strict';

  var LOGIN_BASE_URL = 'http://app1.cinnagen.com';
  var LOGIN_PATH = '/authentication/login-modal';
  var RETURN_ORIGIN_FALLBACK = 'http://localhost:3000';
  var TENANT_DOMAIN = 'app1.cinnagen.com';
  var POPUP_W = 420;
  var POPUP_H = 540;
  var OVERLAY_ID = 'nx_gradian_login_embed_overlay';
  var CONTAINER_ID = 'nx_gradian_login_embed_container';
  var FRAME_ID = 'nx_gradian_login_embed_frame';
  var CLOSE_ID = 'nx_gradian_login_embed_close';

  /** Origin of the page that contains the embed (where the button was clicked). */
  function getEmbedderOrigin() {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      return window.location.origin;
    }
    return RETURN_ORIGIN_FALLBACK;
  }

  /** Build login URL with returnOrigin = embedder origin, modalMode, tenantDomain. */
  function buildLoginUrl(modalMode) {
    var base = (LOGIN_BASE_URL || '').replace(/\/$/, '');
    var returnOrigin = getEmbedderOrigin();
    var url = base + LOGIN_PATH + '?returnOrigin=' + encodeURIComponent(returnOrigin);
    if (modalMode) url += '&modalMode=true';
    if (TENANT_DOMAIN && /^[a-zA-Z0-9.\-]+$/.test(TENANT_DOMAIN.trim())) {
      url += '&tenantDomain=' + encodeURIComponent(TENANT_DOMAIN.trim());
    }
    return url;
  }

  /**
   * Open login in a centered popup. On success the opener reloads and popup closes.
   * returnOrigin = origin of the page where the button was clicked (embedder).
   */
  function openPopup() {
    var url = buildLoginUrl(false);
    var left = (window.screen.width - POPUP_W) / 2;
    var top = (window.screen.height - POPUP_H) / 2;
    var features = 'width=' + POPUP_W + ',height=' + POPUP_H + ',left=' + Math.round(left) + ',top=' + Math.round(top) + ',scrollbars=yes';
    return window.open(url, 'nx_gradian_login', features);
  }

  /**
   * Create overlay and iframe for login modal (if not exists)
   */
  function ensureModalDOM() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) return { overlay: overlay, frame: document.getElementById(FRAME_ID), close: document.getElementById(CLOSE_ID) };

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;padding:16px;';
    overlay.className = 'nx_gradian_login_embed_overlay';

    var container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.style.cssText = 'position:relative;background:white;border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.25);width:100%;max-width:' + POPUP_W + 'px;height:' + POPUP_H + 'px;max-height:85vh;';

    var closeBtn = document.createElement('button');
    closeBtn.id = CLOSE_ID;
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;z-index:10;width:36px;height:36px;border:none;background:rgba(255,255,255,0.95);border-radius:8px;font-size:1.4rem;line-height:1;cursor:pointer;color:#475569;box-shadow:0 1px 3px rgba(0,0,0,0.12);display:flex;align-items:center;justify-content:center;padding:0;';
    closeBtn.onmouseover = function () { this.style.background = '#f1f5f9'; this.style.color = '#1e293b'; };
    closeBtn.onmouseout = function () { this.style.background = 'rgba(255,255,255,0.95)'; this.style.color = '#475569'; };

    var frameWrap = document.createElement('div');
    frameWrap.style.cssText = 'width:100%;height:100%;';

    var frame = document.createElement('iframe');
    frame.id = FRAME_ID;
    frame.title = 'Login';
    frame.style.cssText = 'width:100%;height:100%;border:none;';

    frameWrap.appendChild(frame);
    container.appendChild(closeBtn);
    container.appendChild(frameWrap);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    return { overlay: overlay, frame: frame, close: closeBtn };
  }

  /**
   * Open login in an in-page modal (iframe). On login-success the modal closes and page reloads.
   * returnOrigin = origin of the page where the button was clicked (embedder).
   */
  function openModal() {
    var url = buildLoginUrl(true);

    var dom = ensureModalDOM();
    var overlay = dom.overlay;
    var frame = dom.frame;
    var closeBtn = dom.close;

    function closeAndReload() {
      overlay.style.display = 'none';
      frame.src = 'about:blank';
      window.removeEventListener('message', onMessage);
      window.location.reload();
    }

    function closeOnly() {
      overlay.style.display = 'none';
      frame.src = 'about:blank';
      window.removeEventListener('message', onMessage);
    }

    function onMessage(event) {
      try {
        if (event.origin !== new URL(LOGIN_BASE_URL).origin) return;
      } catch (e) { return; }
      if (event.data && event.data.type === 'login-success') {
        closeAndReload();
      }
    }

    closeBtn.onclick = closeOnly;
    overlay.onclick = function (e) {
      if (e.target === overlay) closeOnly();
    };

    window.addEventListener('message', onMessage);
    frame.src = url;
    overlay.style.display = 'flex';
  }

  var DEFAULT_MODAL_BTN_ID = 'nx_btnModal';
  var DEFAULT_POPUP_BTN_ID = 'nx_btnPopup';

  /**
   * Optional init: bind default button ids (nx_btnModal, nx_btnPopup) to openModal/openPopup.
   * Route and params are fixed in-code (app1.cinnagen.com, returnOrigin, tenantDomain).
   * Options: modalButtonId, popupButtonId.
   */
  function init(options) {
    options = options || {};
    var doc = typeof document !== 'undefined' ? document : null;
    if (!doc) return;

    var modalId = options.modalButtonId != null ? options.modalButtonId : DEFAULT_MODAL_BTN_ID;
    var popupId = options.popupButtonId != null ? options.popupButtonId : DEFAULT_POPUP_BTN_ID;

    var modalBtn = doc.getElementById(modalId);
    var popupBtn = doc.getElementById(popupId);
    if (modalBtn) {
      modalBtn.onclick = function () { openModal(); };
    }
    if (popupBtn) {
      popupBtn.onclick = function () { openPopup(); };
    }
  }

  function runAutoInit() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    function ready() {
      if (document.getElementById(DEFAULT_MODAL_BTN_ID) || document.getElementById(DEFAULT_POPUP_BTN_ID)) {
        init();
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ready);
    } else {
      ready();
    }
  }

  var GradianLoginEmbed = {
    openPopup: openPopup,
    openModal: openModal,
    init: init,
    version: '1.0.0',
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GradianLoginEmbed;
  } else if (typeof define === 'function' && define.amd) {
    define(function () { return GradianLoginEmbed; });
  } else {
    global.GradianLoginEmbed = GradianLoginEmbed;
  }
  if (typeof window !== 'undefined') {
    window.GradianLoginEmbed = GradianLoginEmbed;
    runAutoInit();
  }
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
