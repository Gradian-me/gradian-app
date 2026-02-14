# Login Modal Embed (Third-Party)

Third-party sites can open the Gradian login page in a **popup** or **iframe**. On successful login, the **parent/opener page** is notified and can refresh itself.

## Requirements

- The third-party origin must be listed in the app allowlist: set `NEXT_PUBLIC_LOGIN_EMBED_ALLOWED_ORIGINS` (comma-separated origins, e.g. `https://partner.com,https://app.partner.com`).
- The login-modal URL must be opened with a `returnOrigin` query parameter set to the third-party page origin (e.g. `https://partner.com`).

---

## CDN helper (recommended)

Third parties can add a single script and call the global API. The script is minified and obfuscated; build it with `npm run build:cdn:login` and serve from your app (e.g. `/cdn/gradian-login-embed.min.js`).

**Add the script:**

```html
<script src="https://your-gradian-app.com/cdn/gradian-login-embed.min.js"></script>
```

**Zero-config (auto-init):** If your page has buttons with ids `nx_btnModal` and `nx_btnPopup`, the script will bind them automatically. All embed IDs and default button ids use the `nx_` prefix to avoid conflicts with host page. It reads `baseUrl` from the `app` query param (or current origin; if origin contains `3001`, uses `http://localhost:3000`) and `tenantDomain` from the `tenantDomain` query param (default `app1.cinnagen.com`). No inline script needed:

```html
<button type="button" id="nx_btnModal">Open login (modal)</button>
<button type="button" id="nx_btnPopup">Open login (popup)</button>
<script src="https://your-gradian-app.com/cdn/gradian-login-embed.min.js"></script>
```

**Custom init:** Call `GradianLoginEmbed.init(options)` to wire different button ids or override params. Options: `baseUrl`, `tenantDomain`, `modalButtonId`, `popupButtonId`, `paramApp`, `paramTenantDomain`, `defaultTenantDomain`.

**Open as in-page modal (iframe):** On login success the modal closes and the page reloads.

```javascript
GradianLoginEmbed.openModal({ baseUrl: 'https://your-gradian-app.com' });
```

**Open as popup:** On login success the opener reloads and the popup closes.

```javascript
GradianLoginEmbed.openPopup({ baseUrl: 'https://your-gradian-app.com' });
```

**Optional:** `returnOrigin` defaults to `window.location.origin`. Override if needed:

```javascript
GradianLoginEmbed.openModal({ baseUrl: 'https://app.example.com', returnOrigin: 'https://partner.com' });
```

**Multi-tenant:** Pass the tenant domain so the login API sends `x-tenant-domain` to the auth backend (required when the embed is used on a tenant subdomain, e.g. `app1.cinnagen.com`):

```javascript
GradianLoginEmbed.openModal({ baseUrl: 'https://gradian-app.com', tenantDomain: 'app1.cinnagen.com' });
GradianLoginEmbed.openPopup({ baseUrl: 'https://gradian-app.com', tenantDomain: 'app1.cinnagen.com' });
```

Ensure the Gradian app allowlists your origin in `NEXT_PUBLIC_LOGIN_EMBED_ALLOWED_ORIGINS`.

---

## URL

```
https://<gradian-app>/authentication/login-modal?returnOrigin=<encoded-origin>[&modalMode=true][&tenantDomain=<hostname>]
```

| Parameter     | Required | Description                                                                 |
|---------------|----------|-----------------------------------------------------------------------------|
| `returnOrigin`| Yes      | Origin of the third-party page (e.g. `https://partner.com`). Must be allowlisted. |
| `modalMode`   | No       | If `true`, the page is treated as embedded in an iframe (message sent to `window.parent`). If omitted and opened as a popup, the opener is reloaded and the popup closes. |
| `tenantDomain`| No       | Tenant hostname (e.g. `app1.cinnagen.com`). Sent as `x-tenant-domain` to the auth API. Use when the embed runs on a tenant subdomain so the backend can resolve the tenant. |

## Popup flow

1. Third party opens the login URL in a popup (without `modalMode`, or `modalMode=false`).
2. User logs in inside the popup.
3. On success, the **opener** window is reloaded and the popup closes.

Example:

```javascript
const returnOrigin = encodeURIComponent(window.location.origin);
const url = `https://gradian-app.example.com/authentication/login-modal?returnOrigin=${returnOrigin}`;
window.open(url, 'gradian-login', 'width=420,height=560');
```

After the popup closes, the opener has already been reloaded; you can optionally run logic when the popup closes (e.g. poll `popup.closed`).

## Iframe flow

1. Third party embeds the login URL in an iframe (e.g. inside a modal overlay), with `modalMode=true` and `returnOrigin` set.
2. User logs in inside the iframe.
3. On success, the iframe sends a **postMessage** to the parent; the parent should listen and then refresh.

Message from login-modal to parent:

```ts
{ type: 'login-success', timestamp: number }
```

Parent listener example:

```javascript
window.addEventListener('message', (event) => {
  // Only accept messages from the Gradian app origin
  if (event.origin !== 'https://gradian-app.example.com') return;
  if (event.data?.type === 'login-success') {
    window.location.reload();
  }
});
```

Iframe embed example:

```html
<iframe
  src="https://gradian-app.example.com/authentication/login-modal?returnOrigin=https%3A%2F%2Fpartner.com&modalMode=true"
  width="420"
  height="560"
  style="border: none;"
></iframe>
```

## Security

- **Allowlist**: Only origins in `NEXT_PUBLIC_LOGIN_EMBED_ALLOWED_ORIGINS` can use the embed flow; others are not sent the success message / reload.
- **postMessage**: The login-success payload contains no secrets or PII (only `type` and `timestamp`). The parent must always validate `event.origin` against the Gradian app origin.
- **Cookies**: In a third-party iframe, some browsers may block or limit cookies. The **popup** flow is more reliable for auth; use iframe when you need in-page UX and accept that cookies may require same-site or allowed third-party configuration.

## Types

The app exports types and helpers for the login-success message:

- `LoginSuccessMessage`, `createLoginSuccessMessage()`, `isLoginSuccessMessage()` from `@/gradian-ui/form-builder/types/embed-messages`.

Use these in your app for type-safe handling of the postMessage event.

---

## Testing as a third party

You need two origins: the Gradian app and a “third-party” page. Use two local ports (e.g. app on `3000`, test page on `3001`).

### 1. Allowlist the test origin

In the Gradian app `.env.local`:

```bash
NEXT_PUBLIC_LOGIN_EMBED_ALLOWED_ORIGINS=http://localhost:3001
```

Restart the dev server after changing env.

### 2. Start the Gradian app

```bash
npm run dev
# App runs at http://localhost:3000
```

### 3. Serve the test page from another port

From the project root, serve the `public` folder on port 3001 so the test page is on a different origin:

```bash
npx serve public -p 3001
```

### 4. Open the test page

In the browser go to:

```
http://localhost:3001/html/third_party_login_embed.html
```

Optional: pass the Gradian app URL if it’s not localhost:3000:

```
http://localhost:3001/html/third_party_login_embed.html?app=http://localhost:3000
```

### 5. Test popup and iframe

- **Popup**: Click “Open login (popup)”. Log in in the popup. On success the opener (the 3001 page) should reload and the popup should close.
- **Iframe**: Click “Open login (iframe)”. Log in in the overlay. On success the page should receive `login-success`, then reload and close the overlay.

The test page shows **This page origin** at the top; that value must be in `NEXT_PUBLIC_LOGIN_EMBED_ALLOWED_ORIGINS`.
