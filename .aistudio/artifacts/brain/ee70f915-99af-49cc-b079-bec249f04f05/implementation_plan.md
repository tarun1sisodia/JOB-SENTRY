# JobSentry (FakeJobScanner) — Enterprise Architecture & Redesign Plan

Comprehensive architectural blueprint and engineering plan to transform JobSentry into an enterprise-grade full-stack advisory platform with strict shared schemas, zero-fallback tolerance, dual-stage environment contracts (staging & production), an anti-AI slop 3-color palette (Obsidian, Crisp White, Zinc Gray), subtle grid and text reveal animations, and a complete system architecture document.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during Phase 1 clarification:
> - **Backend Runtime & Framework**: Node.js with Express (`server.ts`) providing native TypeScript API routes (`/api/*`), mounted with Vite middlewares in development.
> - **Visual Palette & Theme**: Strict 3-color discipline in both Dark and Light modes:
>   - *Dark Mode*: Obsidian Black (`#09090b`), Crisp White (`#fafafa`), and Subtle Zinc Gray (`#71717a` / border `#27272a`).
>   - *Light Mode*: Crisp White (`#ffffff`), Obsidian Black (`#09090b`), and Subtle Zinc Gray (`#71717a` / border `#e4e4e7`).
> - **Milestone Scope**: Delivering **both** the fully working full-stack implementation and the exhaustive `ARCHITECTURE.md` specification document (covering shared schemas, zero-fallback tolerance, staging/production configurations, controller patterns, and real-world test cases).

---

## 1. Overview & Core Concept

- **What It Does**: JobSentry enables job seekers to scan job descriptions, recruiter email addresses, company names, and salary disclosures before submitting applications to uncover scam triggers, unverified email domains, and deposit demands.
- **Target Audience / Persona**: Job applicants, early-career engineers, and researchers seeking an uncompromised, professional verification tool without gimmicky gamification or generic AI slop.
- **Key Value**: Deterministic risk analysis, zero dead clicks or mock stubs, unified typed schemas shared across client and server, and a high-performance, distraction-free aesthetic with subtle micro-motion.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Initial View & Canvas Atmosphere**: The user arrives on a minimal obsidian canvas with a subtle animated geometric background grid and an ambient text reveal.
2. **Analysis Input & Validation**:
   - The user pastes a job posting into the primary input area or selects one of the real-world preset examples.
   - Live client-side format checks validate recruiter email addresses and numeric salaries in camelCase/snakeCase normalized schema.
3. **Execution & Feedback**:
   - Triggering the scan initiates a smooth fade/reveal sequence with a clean 200ms latency budget.
   - The analysis response displays a high-contrast risk indicator, clear red flag markers, and exact next steps.
4. **Historical Database & Record Inspection**:
   - Every valid evaluation is logged to the local SQLite/storage layer and displayed in the tabular inspection table.
   - Users can filter records, open deep-inspection modals, or export audit logs.

### Visual Identity & Theme (3-Color System)
- **Palette (Strict 3 Colors Only)**:
  - `Color 1 (Dominant 60%)`: Obsidian (`#09090B`) in Dark Mode / Crisp White (`#FFFFFF`) in Light Mode.
  - `Color 2 (Structural 30%)`: Crisp White (`#FAFAFA`) in Dark Mode / Obsidian (`#09090B`) in Light Mode for primary typography and high-contrast emphasis.
  - `Color 3 (Accent & Border 10%)`: Subtle Zinc (`#71717A` with surface borders `#27272A` / `#E4E4E7`).
- **Typography & Scale**:
  - Display face: `Plus Jakarta Sans` with tight tracking and balanced headlines (`text-wrap: balance`).
  - Monospace numerals & telemetry: `JetBrains Mono` with `tabular-nums` for timestamps, IDs, and risk scores.
- **Anti-AI Slop Enforcement**:
  - No purple/violet gradients, no candy pill capsules, no decorative status dots, no pseudo-code comments (`//`), and no watermark background text.
  - Natural editorial language: short, simple, professional words.
- **Micro-Animations & Grid Motion**:
  - Animated CSS background grid with subtle radial opacity mask.
  - Text reveal animations (`translateY` + `opacity` transitions $\le 200\text{ms}$).
  - Smooth fade-in and fade-out state transitions without layout reflows.

---

## 3. Key Product Decisions & Trade-Offs

- **Node.js Express Full-Stack Runtime (`server.ts`)**:
  - *Chosen Approach*: Single cohesive repository using Express with native TypeScript (`tsx`) mounting Vite dev middlewares in development and serving compiled static assets in production.
  - *Why*: Eliminates dual-process orchestration overhead, prevents cross-origin CORS issues, and enables direct execution on port 3000.
- **Zero-Fallback Tolerance & Hard Shared Contracts**:
  - *Chosen Approach*: Shared Zod schemas in `src/shared/contracts.ts` used by both Express controllers and frontend React hooks.
  - *Why*: Invariants are strictly guaranteed. If an API request or response violates the contract, execution fails fast with an explicit structured validation payload rather than silent fallbacks or undefined fields.
- **Two-Stage Environment Architecture**:
  - *Chosen Approach*: Formal configurations for `staging` and `production` with distinct validation thresholds, rate limits, and audit persistence adapters.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (React 19 SPA)                    │
│  - Animated Grid Canvas & Text Reveal Motion                │
│  - 3-Color Strict Palette (Obsidian / White / Zinc)         │
│  - Strict Shared Contract Client (Zod-validated)            │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON over HTTP
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express Server (Node.js 22)                 │
│  - Request Router & Staging/Production Middleware           │
│  - Shared Contract Controllers (camelCase <-> snake_case)   │
│  - Zero-Fallback Validation Handler                         │
│  - SQLite / In-Memory Audited Persistence Engine            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Deterministic Risk Rules Engine                │
│  - Free email domain verification (Gmail, Yahoo, etc.)      │
│  - Upfront fee & equipment deposit detection                │
│  - Telegram / WhatsApp channel isolation                    │
│  - Compensation outlier & task scam scoring                 │
└─────────────────────────────────────────────────────────────┘
```

### Shared Contract Interfaces (`src/shared/contracts.ts`)
- **JobCheckRequest**:
  - `jobText` / `job_text`: Required non-empty string.
  - `email`: Optional valid RFC 5322 email string.
  - `company`: Optional string.
  - `salary`: Optional numeric string or number.
- **JobCheckResponse**:
  - `riskLevel` / `risk_level`: `'Low' | 'Medium' | 'High'`.
  - `score`: Fixed-precision float between `0.00` and `1.00`.
  - `redFlags` / `red_flags`: Non-empty string array.
  - `advice`: Non-empty string array of actionable steps.
  - `metadata`: Staging/production environment stamps and evaluation timestamps.

### Production Architecture Document (`ARCHITECTURE.md`)
The artifact document will define:
1. Executive System Topology and Invariant Rules.
2. Shared Contract Specifications (Zod + TypeScript).
3. Controller Hierarchy and Route Handlers.
4. Naming Conventions (Internal camelCase vs External snake_case bridge).
5. Dual-Stage Environment Matrix (Staging vs Production).
6. End-to-End User Simulation Test Scenarios (10 real-world attack vectors).
