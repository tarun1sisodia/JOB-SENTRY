# JobSentry Multi-Service Architecture & Shared Contract Synchronization Plan

Architectural blueprint to decouple JobSentry into dedicated `backend/`, `frontend/`, and `ml_service/` directories, with a root `/shared/` directory acting as the single source of truth. An automated synchronization script (`npm run sync:shared`) will mirror contracts into each service directory, providing unified TypeScript Zod schemas, Python Pydantic models, and JSON Schemas.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during Phase 1 clarification:
> - **Synchronization Mechanism**: Node.js script (`scripts/sync-shared.js`) runnable via `npm run sync:shared` and hooked into pre-dev / pre-build scripts.
> - **Contract Formats Provided**:
>   - *TypeScript & Zod*: `contracts.ts` for Node.js backend and React frontend.
>   - *Python & Pydantic*: `models.py` for Python ML microservices.
>   - *JSON Schema*: `schema.json` for universal cross-language validation and testing tools.
> - **Service Directory Structure**: Dedicated `backend/`, `frontend/`, and `ml_service/` directories with a root runner on port 3000 ensuring 100% compatibility with runtime container constraints.

---

## 1. Overview & Core Concept

- **The Problem**: Multi-language, multi-service architectures suffer from model drift, inconsistent casing (`camelCase` vs `snake_case`), conflicting validation rules, and duplicated type definitions.
- **The Solution**: A Single Source of Truth (`/shared/`) at the repository root. Services never invent independent ad-hoc models. Instead, the sync script propagates validated, immutable contract artifacts into `backend/shared/`, `frontend/shared/`, and `ml_service/shared/`.
- **Target Workflow**: Running `npm run sync:shared` distributes contract files across all folders, ensuring zero model drift and invariant type safety.

---

## 2. Directory & Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Root /shared/ (SSOT)                      │
│  - contracts.ts   (Zod & TypeScript definitions)            │
│  - models.py      (Pydantic Python models for ML)           │
│  - schema.json    (Canonical JSON Schema)                   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
     (npm run sync:shared)          (npm run sync:shared)
               ▼                              ▼
┌──────────────────────────────┐┌──────────────────────────────┐
│       /frontend/shared/      ││       /backend/shared/       │
│  - contracts.ts              ││  - contracts.ts              │
│  - schema.json               ││  - schema.json               │
└──────────────┬───────────────┘└──────────────┬───────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐┌──────────────────────────────┐
│          /frontend/          ││          /backend/           │
│  - React 19 SPA              ││  - Express Controllers       │
│  - Strict 3-Color UI         ││  - Risk Engine               │
│  - Animated Grid Background  ││  - Audit Storage Layer       │
└──────────────────────────────┘└──────────────────────────────┘
               ▲                               ▲
               └───────────────┬───────────────┘
                               │
               ┌───────────────┴───────────────┐
               │    /ml_service/shared/        │
               │  - models.py                  │
               │  - schema.json                │
               │    /ml_service/               │
               │  - service.py / main.py       │
               └───────────────────────────────┘
```

---

## 3. Key Product & Engineering Decisions

### 3.1 Single Source of Truth (`/shared/`)
- All contract changes occur **exclusively** within root `/shared/`.
- The synchronization script automatically distributes copies into:
  - `frontend/shared/`
  - `backend/shared/`
  - `ml_service/shared/`
- Generated subfolder files include a prominent auto-generated disclaimer comment warning developers not to edit them directly.

### 3.2 Script Execution & Pre-Flight Hooks
- `npm run sync:shared`: Triggers `node scripts/sync-shared.js`.
- Configured in `package.json`:
  ```json
  "scripts": {
    "sync:shared": "node scripts/sync-shared.js",
    "predev": "npm run sync:shared",
    "prebuild": "npm run sync:shared"
  }
  ```
- Guarantees that neither dev servers nor production builds can ever execute with stale or desynchronized contracts.

### 3.3 Preserving Port 3000 Runtime Invariants
- AI Studio requires port 3000 on `0.0.0.0` for web targets.
- The root runner `server.ts` will route:
  - Backend API requests (`/api/*` and aliases `/analyze`, `/history`) into the controllers in `backend/`.
  - Frontend static assets and Vite SPA middlewares into `frontend/`.
- This provides modular separation of concerns while maintaining single-command dev and build reliability.

---

## 4. Technical Specifications & File Matrix

### 4.1 Root Shared Artifacts (`/shared/`)
1. **`shared/contracts.ts`**:
   - `JobCheckInputSchema` (Zod): Dual-casing validation for `jobText` / `job_text`, RFC 5322 email regex, numeric salary validation.
   - `JobCheckOutputSchema` (Zod): `riskLevel` / `risk_level`, `score`, `redFlags` / `red_flags`, `advice`, `factors`, `stage`, `evaluatedAt`.
   - TypeScript interfaces and normalization helpers.
2. **`shared/models.py`**:
   - Pydantic BaseModel definitions: `JobCheckInput`, `JobCheckOutput`, `RiskLevel` Enum, `RiskFactorDetail`.
   - Supports both `snake_case` fields and `camelCase` aliases.
3. **`shared/schema.json`**:
   - Complete JSON Schema draft-07 representation for integration testing and external API validation.

### 4.2 Synchronization Script (`scripts/sync-shared.js`)
- Recursively inspects `/shared/`.
- Copies appropriate contract files into `backend/shared/`, `frontend/shared/`, and `ml_service/shared/`.
- Emits verification logs confirming checksum or copy status.

### 4.3 Service Folders
- **`backend/`**:
  - `backend/shared/`: Mirrored contracts.
  - `backend/controllers.ts`: Zero-fallback API handlers.
  - `backend/riskEngine.ts`: Deterministic evaluation rules.
  - `backend/storage.ts`: Check audit log database.
- **`frontend/`**:
  - `frontend/shared/`: Mirrored contracts.
  - `frontend/src/`: React 19 components, animated grid canvas, 3-color strict theme, hooks.
  - `frontend/index.html` & `frontend/index.css`.
- **`ml_service/`**:
  - `ml_service/shared/`: Mirrored Python Pydantic models.
  - `ml_service/main.py`: Service entry point and dummy/future ML analyzer.

### 4.4 Documentation Update
- Update `ARCHITECTURE.md` to document the multi-service folder layout, synchronization protocol, and cross-language contract guarantees.
