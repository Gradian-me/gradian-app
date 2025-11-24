# Gradian Integrated Graph Platform

Helping connected enterprises trust every decision through graph-powered, schema-driven applications inspired by the [Gradian.me](https://gradian.me) vision.

## 🌌 Why Gradian

- **Decision Graph DNA** – Model every relationship, signal, and event as a living graph that powers analytics, workflows, and automation.
- **Integrated App Experiences** – Launch analytics, operations, and collaboration suites from one harmonized platform.
- **Confidence by Design** – Blend qualitative judgment with quantitative evidence so teams can act with conviction.
- **Composable by Default** – Shape new modules in minutes using a dynamic schema system—no brittle rewrites, just orchestration.

## 🧭 Vision

Gradian turns complex ecosystems into explainable narratives. By bringing strategy, execution, and telemetry into a single decision graph, organizations can:

- Reveal hidden dependencies across products, partners, and people.
- Continuously test hypotheses with live operational data.
- Share trustworthy insights that align executives, operators, and builders.

Every screen, dashboard, and workflow in Gradian exists to earn trust at the moment of decision.

## 🏛️ Platform Architecture

```
gradian-scm/
├── data/                   # Graph definitions, settings, sync payloads
│   ├── all-schemas.json    # Entity blueprints & layout logic
│   ├── all-data.json       # Seeded records for local development
│   ├── all-data-relations.json
│   ├── all-builders.json
│   └── notifications.json
├── src/
│   ├── app/
│   │   ├── analytics/      # Insight workspaces & decision trails
│   │   ├── builder/        # Low-code schema + relation designers
│   │   ├── erp/            # Operational cockpit (finance, ops, supply)
│   │   ├── calendar/       # Temporal graph & coordination views
│   │   ├── notifications/  # Signal center & command bus
│   │   ├── page/[schema-id]/[data-id]/
│   │   └── api/            # Graph-aware APIs (schemas, data, auth…)
│   ├── domains/            # Domain-driven services, controllers, schemas
│   ├── gradian-ui/         # Gradian design system & graph widgets
│   ├── components/         # App-specific compositions
│   ├── stores/             # Zustand stores for realtime state
│   └── shared/             # Cross-cutting utils, types, constants
├── docs/                   # Vision, prompts, architecture deep dives
```

### Core Layers

- **Graph Data Layer** – JSON-first graph definitions for all data storage.
- **Decision Services** – Domain services transform raw signals into alerts, recommendations, or automation triggers.
- **Experience Kit** – `gradian-ui` delivers interactive graph canvases, analytics lenses, and narrative dashboards.

## 🚀 Capabilities

- **Graph Analytics & Storytelling** – Explore relationships with dynamic metrics, pathfinding, and trend narratives.
- **Schema-Driven Apps** – Add new entities, relations, and layouts using JSON builders and immediately deploy experiences.
- **Operational Suites** – Analytics, ERP, Calendar, Notifications, and Settings modules share a single identity and data graph.
- **Adaptive Automation** – Configure triggers, notifications, and follow-up actions directly from schema metadata.
- **Trusted Collaboration** – Access controls, profiles, and company selectors ensure the right teams see the right facts.

## 🧪 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Launch the Platform

```bash
npm run dev
```

Visit `http://localhost:3000` and sign in to explore analytics, operations, and builder workspaces.

### 3. Shape the Graph

Edit `data/all-schemas.json` and `data/all-data-relations.json` to add entities, attributes, and relationships. The platform instantly renders:

- Workspace routes under `/page/<schema-id>` and `/page/<schema-id>/<data-id>`
- Builder tools in `/builder` for human-friendly editing
- API endpoints at `/api/schemas`, `/api/data/<schema-id>`, `/api/relations`

## 🔍 Explore the Modules

- **Analytics** – `src/app/analytics` surfaces decision trails, KPI cards, and graph-driven dashboards.
- **Builder** – `src/app/builder` provides schema designers, relation mappers, and generative entity templates.
- **ERP** – `src/app/erp` connects finance, supply, and revenue operations to the graph.
- **Calendar** – `src/app/calendar` bridges events, tasks, and dependencies with timeline intelligence.
- **Notifications** – `src/app/notifications` orchestrates signals, alerts, and multi-channel nudges.
- **Profiles & Settings** – `src/app/profiles`, `src/app/settings` manage trust, roles, and personalization.

## 🧱 Gradian UI Design System

`src/gradian-ui` packages our reusable graph components:

- Data display tables, badges, and relation viewers
- Form builder with smart defaults for schema-driven forms
- Analytics charts, path visualizers, and story panels
- Layout primitives, navigation shells, and profile widgets

Embed them across modules or export them to satellite apps to extend the Gradian experience.

## ⚙️ Scripts & Tooling

```bash
npm run dev       # Development server with Turbopack
npm run build     # Production build
npm run start     # Run production build locally
npm run lint      # ESLint + formatting checks
```

Additional scripts live in `scripts/` for data conversion and schema cleanup.

## 📚 Deep Dives

- [Quick Start Guide](./QUICK_START_GUIDE.md)
- [Dynamic CRUD Architecture](./DYNAMIC_CRUD_ARCHITECTURE.md)
- [Schema to Page Flow](./SCHEMA_TO_PAGE_FLOW.md)
- [Schema API Configuration](./SCHEMA_API_CONFIGURATION.md)

## 🤝 Contributing

- Use the Builder module or JSON definitions to propose new graph entities.
- Extend `gradian-ui` with reusable, theme-aligned components.
- Document decisions in `docs/` so the graph remains explainable.
- Share vision-aligned stories that reinforce Gradian's trust mission.

## 🔐 License

Proprietary and confidential. Contact the Gradian team for partnership opportunities.

---

Made with ❤️ by Gradian.me
