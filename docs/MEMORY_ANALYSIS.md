# Memory Consumption & Leak Analysis

Analysis date: 2025-02-15. Focus: dev server memory usage, API memory spikes, and client-side leaks.

---

## 1. High-impact: API route memory (server)

### 1.1 GET `/api/schemas` with `includeStatistics=true`

**Issue:** For each schema returned, `buildSchemaSummary(schema, true)` calls `calculateSchemaStatistics(schemaId)`, which calls:

- `calculateSchemaRecords(schemaId)` → `readSchemaData(schemaId)` → **`readAllData()`**
- `calculateSchemaSize(schemaId)` → `readSchemaData(schemaId)` → **`readAllData()`**
- `calculateMaxUpdatedAt(schemaId)` → `readSchemaData(schemaId)` → **`readAllData()`**

`readSchemaData` does **not** accept a pre-loaded object; it always calls `readAllData()`, which:

- Reads the entire `data/all-data.json` with `fs.readFileSync`
- Parses the full JSON into a new object

So for **N** schemas, the server does **3×N** full file reads and 3×N full JSON parses in a single request. With 50 schemas that’s 150 reads/parses of the whole data file → high memory and CPU per request.

**Files:**

- `src/app/api/schemas/route.ts` (buildSchemaSummary per schema)
- `src/gradian-ui/schema-manager/utils/schema-statistics-utils.ts` (each stat calls readSchemaData)
- `src/gradian-ui/shared/domain/utils/data-storage.util.ts` (readSchemaData → readAllData)

**Recommendation:** Read `all-data.json` once per request (or once per batch) and pass the parsed object into statistics calculation so each schema’s stats are derived from that single in-memory copy. A helper that takes `allData: Record<string, any[]>` and returns stats for one or many schema IDs avoids repeated file I/O and parsing.

---

### 1.2 Full-file reads with no streaming

**Issue:** Several API routes and utilities load entire JSON files into memory:

| Location | File(s) | Note |
|----------|--------|------|
| `src/app/api/schemas/route.ts` | `all-schemas.json` | Full read per request (no cache in main GET path). |
| `src/app/api/schemas/[schema-id]/route.ts` | `all-schemas.json` | Full read to serve one schema (module-level cache still loads full file on miss). |
| `src/gradian-ui/schema-manager/utils/schema-loader.ts` | `all-schemas.json` | `readSchemasFromFile()` reads and parses full file. |
| `src/gradian-ui/shared/domain/utils/data-storage.util.ts` | `all-data.json` | `readAllData()` used everywhere; `readSchemaData(schemaId)` uses it and only then picks one key. |
| `src/gradian-ui/shared/domain/utils/relations-storage.util.ts` | relations file | Full read. |
| `src/app/api/ai-agents/route.ts` | `ai-agents.json` | Full read. |
| `src/domains/chat/utils/chat-storage.util.ts` | chat data | Full read. |

`data/all-schemas.json` is very large (~35k lines). Every full read/parse duplicates that structure in memory.

**Recommendations:**

- For `/api/schemas/[schema-id]`: when cache misses, consider reading once and indexing by schema ID (or use a backend that supports single-schema read) so you don’t repeatedly parse the whole file.
- Where possible, read once per request and reuse the parsed object (as for statistics above).
- Keep existing size caps (e.g. `MAX_SCHEMA_FILE_BYTES`, `MAX_DATA_FILE_BYTES`) and consider lowering for dev if needed.

---

## 2. Caches and stores (bounded vs unbounded)

### 2.1 Server: `data-loader.ts` cache registry

- **Structure:** `cacheRegistry = new Map<string, { cache, fetchPromise, instanceId }>()`.
- **Keys:** One per `routeKey` (e.g. `'schemas'`). Number of keys is bounded by how many routes use `loadData` / `loadDataById`.
- **Values:** One cache entry per key (TTL 24h). No eviction by count; memory is bounded by number of route keys and size of each cached response.

**Verdict:** Bounded in practice. No change required for leak prevention; optional: add a max total size or LRU if you add many new route keys.

---

### 2.2 Client: `useAiAgents` (e.g. form-filler)

- In-memory `Map` keyed by `agentId_summary`; TTL 5 minutes. Very few keys.
- **Verdict:** Bounded. Already fixed so the form-filler agent is only fetched when the AI form filler dialog is open (`enabled: isOpen`).

---

### 2.3 Client: `ai-response.store.ts` (Zustand + sessionStorage)

- **Bounds:** `MAX_RESPONSES_PER_AGENT = 5`, `MAX_CONTENT_LENGTH = 500_000` (≈500KB). Quota handling and cleanup on save.
- **Verdict:** Bounded; no leak.

---

### 2.4 Client: `menu-items.store.ts` (Zustand + persist)

- Single array of menu items; no unbounded growth.
- **Verdict:** Bounded.

---

## 3. useEffect cleanup (potential leaks)

Spot-checked components that use `setTimeout`, `setInterval`, or `addEventListener`:

| File | Usage | Cleanup |
|------|--------|--------|
| `FormModal.tsx` | `beforeunload` | Yes – removeEventListener in return |
| `Select.tsx` | `resize`, `visualViewport.resize` | Yes – removeEventListener in return |
| `DynamicAiAgentResponseContainer.tsx` | `setTimeout` (autoExecute) | Yes – clearTimeout in return |
| `useNotificationCount.ts` | `setInterval` | Yes – clearInterval in return |
| `use-count-from-url.ts` | `setInterval`, `visibilitychange` | Yes |
| `GoToTopForm.tsx` | scroll listeners, MutationObserver, retry `setTimeout` | Yes – clearTimeout, disconnect, removeEventListener |
| `main-layout.tsx` | `popstate`, `resize` | Yes |
| `SidebarNavigationMenu.tsx` | `menu-items-cleared` | Yes |
| `FormulaField.tsx` | `fetchTimeoutRef`, `form-reset` | Yes – clearTimeout, removeEventListener |
| `ChatMessage.tsx` | Multiple `setTimeout`s | Yes – clearTimeout in return |
| `GraphCanvas.tsx` | `resize` + debounce timeout | Yes – clearTimeout + removeEventListener |
| `AiBuilderForm.tsx` | textarea `input` + timeout | Yes – clearTimeout, removeEventListener |

No clear memory leaks from missing cleanups in the files reviewed. Remaining risk: one-off `setTimeout`s that close over refs (e.g. GraphCanvas 100ms layout delay); they may run after unmount but only touch refs; impact is minimal.

---

## 4. Summary table

| Category | Severity | Description |
|----------|----------|-------------|
| **GET /api/schemas + includeStatistics** | **High** | 3×N full reads/parses of `all-data.json` per request. **Fixed:** read once, pass `allData` into `calculateSchemaStatisticsFromData()`. |
| **Full schema/data file reads** | **Medium** | Many routes read entire JSON files. **Mitigated:** `/api/schemas/[schema-id]` now uses a bounded per-schema cache (max 100 entries) so the full array is not held long-term. |
| **Server cache (data-loader)** | Low | Bounded by route keys + TTL. |
| **Client caches/stores** | Low | Bounded (ai-response, menu-items, useAiAgents). |
| **useEffect cleanups** | Low | Cleanups present where checked; no obvious listener/timer leaks. |

---

## 5. Recommended actions (priority)

1. **High (do first):** In `GET /api/schemas` when `includeStatistics=true`, read `all-data.json` once per request and pass the parsed object into a batch statistics helper so each schema’s stats are computed from that single object (no repeated `readAllData()`).  
   **Done:** Implemented in `route.ts` (read `allData` once) and `calculateSchemaStatisticsFromData()` in schema-statistics-utils.
2. **Medium:** In `/api/schemas/[schema-id]`, on cache miss avoid holding the full `all-schemas.json` array in memory (e.g. cache per-schema with a bounded size).  
   **Done:** Implemented bounded per-schema cache (max 100 entries, LRU) in `[schema-id]/route.ts` via `loadSchemaById()`. GET uses per-schema cache; write paths still use `loadSchemas()` and call `clearSchemaCache()` after write.
3. **Low:** Add `node --max-old-space-size=4096` (or similar) to the dev script if the Next.js dev server still hits the memory threshold after the above.  
   **Done:** `package.json` dev scripts now run Next via `node --max-old-space-size=4096 node_modules/next/dist/bin/next dev --turbopack`.
4. **Low:** Optionally run `next build --experimental-debug-memory-usage` and inspect heap snapshots if issues persist.

---

## 6. Security / NIST note

- No secrets or PII were observed in the memory paths above.
- File read caps (`MAX_SCHEMA_FILE_BYTES`, `MAX_DATA_FILE_BYTES`) help limit impact of large or malicious files; keep them and enforce in all code paths that read these files.
