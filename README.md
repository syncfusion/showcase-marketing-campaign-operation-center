# Marketing Campaign Operations Center

The Marketing Campaign Operations Center is a Syncfusion-powered React dashboard for managing a modern marketing program from a single workspace. It combines campaign portfolio visibility, deliverable planning, performance analytics, and AI-assisted social campaign ideation into a browser-first experience built for marketing teams.

This showcase uses deterministic local fixtures and a client-side state model, so it can run without a backend service or database. It is intended as a demo and reference pattern for campaign operations workflows rather than a production-ready marketing platform.

> This is a front-end showcase application with sample data. It is not intended to be used as a production marketing operations system without adding authentication, authorization, real data integrations, analytics backends, and audit controls.

## What the application includes

- Campaign portfolio dashboard with KPI summary cards and hierarchical campaign details
- Planning Board using a Kanban workflow for campaign deliverables and status progression
- Performance Analytics with channel filtering, spend and revenue charts, and benchmark tables
- AI-assisted Campaign Studio for planning social campaigns, creative direction, and channel recommendations
- Theme-aware UI with light/dark styling and responsive Syncfusion components
- Local, deterministic dataset for fast evaluation and demos without external services

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| UI components | Syncfusion EJ2 React libraries for grids, charts, kanban, dialogs, navigation, and interactive chat |
| Styling | CSS modules and theme tokens with Syncfusion styling |
| State | Client-side store with deterministic demo data |
| AI experience | Local AI prompt and response patterns for campaign planning concepts |
| Data | In-memory sample campaign, deliverable, and channel data |

## Repository structure

```text
marketing-campaign-ops/
├── react/
│   ├── src/
│   │   ├── ai/
│   │   │   └── provider.ts
│   │   ├── components/
│   │   │   └── KpiCard.tsx
│   │   ├── data/
│   │   │   └── fixtures.ts
│   │   ├── format/
│   │   │   └── format.ts
│   │   ├── pages/
│   │   │   ├── AiStudio.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── pages.css
│   │   │   ├── Planning.tsx
│   │   │   └── Portfolio.tsx
│   │   ├── palette/
│   │   │   └── palette.ts
│   │   ├── shell/
│   │   │   ├── AppShell.tsx
│   │   │   └── shell.css
│   │   ├── store/
│   │   │   └── store.ts
│   │   ├── styles/
│   │   │   └── tokens.css
│   │   ├── types/
│   │   │   └── domain.ts
│   │   ├── App.tsx
│   │   ├── basePath.ts
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── package.json
│   ├── run-evidence.mjs
│   ├── server.mjs
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── ...
├── README1.md
├── README.md
└── ...
```

## Run locally

### Prerequisites

- Node.js LTS
- npm

### 1. Install dependencies

```bash
cd react
npm install
```

### 2. Start the app

```bash
npm run dev
```

The app will run in development mode on `http://localhost:5173` by default.

### 3. Build for production

```bash
npm run build
```

### 4. Preview the production build

```bash
npm run preview
```

## Application pages

| Route | Page | Description |
| --- | --- | --- |
| `/` | Campaign Portfolio | Overview of active campaigns, KPIs, and campaign hierarchy |
| `/planning` | Planning Board | Kanban workflow for campaign deliverables and progress tracking |
| `/analytics` | Performance Analytics | Spend, revenue, ROAS, and conversion dashboards by channel |
| `/social` | Campaign Studio | Social campaign planning and AI assisted content direction |

## Demo data model

The app uses mock campaign, channel, and deliverable data stored locally in the browser. The dataset is intentionally deterministic so the UI remains stable and easy to demo.

| Source | Purpose |
| --- | --- |
| `src/store/store.ts` | Session dataset and state management for campaigns and deliverables |
| `src/types/domain.ts` | Campaign, channel, stage, and priority model definitions |
| `src/data/fixtures.ts` | Seed data for sample campaigns and operational planning items |
| `src/ai/provider.ts` | Local AI response generation for campaign recommendations |

## Build and development notes

- There is no API backend or database dependency for the current demo.
- Theme switching is handled client-side using the document theme attribute and Syncfusion theme assets.
- The app is designed to be easy to explore, extend, and adapt for a marketing operations showcase.

## Intended use

This project is useful for product teams, marketing operations leaders, and developers evaluating how a campaign management workspace can be assembled using React, Syncfusion UI components, and a browser-based data model.
