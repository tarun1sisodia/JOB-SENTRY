# JobSentry (FakeJobScanner) — Enterprise System Architecture & Shared Contract Specification

> **Status:** Production Specification  
> **Runtime:** Node.js 22 LTS / Express / TypeScript / React 19  
> **Contract Rule:** Zero Fallback Tolerance (Invariant Schemas)  
> **Core Advisory Invariant:** *"This is an advisory risk indicator, not proof of fraud."*

---

## 1. Executive Architecture & Invariant Rules

### 1.1 The "No Legacy" Rule
Legacy codebases decay when obsolete formats and dead fields linger under the guise of backwards compatibility. In this system:
1. **No Silent Defaults**: If a payload is missing a required parameter, it **must fail immediately** with an explicit HTTP 400 and path-indexed error message.
2. **Explicit Deprecation**: Legacy wire parameters (e.g. `job_text`) are normalized at the network boundary into canonical internal representations (`jobText`). Deprecated keys never leak past the ingress controller.
3. **Strict Type Invariance**: Any field not declared in the Zod contract schema is rejected or stripped. Undefined fields will never trigger fallback guessing.

### 1.2 Zero Fallback Tolerance
- If an API receives malformed input, it does **not** attempt heuristic guessing. It fails fast.
- If the internal engine or ML service produces an unexpected structure, the egress interceptor blocks transmission with HTTP 500 rather than serving corrupt data to the client.

```
Incoming Request (Client)
         │
         ▼
┌──────────────────────────────────────────────┐
│  Ingress Validator (Zod JobCheckInputSchema) │ ──[Fail]──> HTTP 400 Bad Request
└──────────────────────┬───────────────────────┘
                       │ [Pass]
                       ▼
┌──────────────────────────────────────────────┐
│  Boundary Transformer (snake_case -> camel)  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Domain Controller & Deterministic Evaluator │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Egress Validator (Zod JobCheckOutputSchema) │ ──[Fail]──> HTTP 500 Contract Error
└──────────────────────┬───────────────────────┘
                       │ [Pass]
                       ▼
Verified JSON Response (Client)
```

---

## 2. Shared Data Contracts & Schemas

### 2.1 Casing Architecture: `camelCase` vs `snake_case`

| Layer | Standard | Example Identifier |
| :--- | :--- | :--- |
| **Internal Domain & Types** | `camelCase` | `jobText`, `riskLevel`, `redFlags`, `evaluatedAt` |
| **External Wire (V1 Legacy)** | `snake_case` | `job_text`, `risk_level`, `red_flags` |
| **Database Storage Columns** | `snake_case` | `created_at`, `risk_level`, `job_text` |
| **Zod Shared Boundary** | Dual-Mapped | Accepts both `jobText` & `job_text`; returns both for zero-breakage |

### 2.2 Zod Hard Schema Contract (`src/shared/contracts.ts`)

```typescript
import { z } from 'zod';

export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const JobCheckInputSchema = z.object({
  jobText: z.string().trim().min(10).optional(),
  job_text: z.string().trim().min(10).optional(),
  email: z.string().trim().regex(emailRegex).optional(),
  company: z.string().trim().max(120).optional(),
  salary: z.string().trim().optional(),
  stage: z.enum(['staging', 'production']).default('production'),
}).refine(data => Boolean(data.jobText || data.job_text), {
  message: 'Job text is required (supply jobText or job_text)',
  path: ['jobText'],
});

export const JobCheckOutputSchema = z.object({
  riskLevel: z.enum(['Low', 'Medium', 'High']),
  risk_level: z.enum(['Low', 'Medium', 'High']),
  score: z.number().min(0).max(1),
  redFlags: z.array(z.string()),
  red_flags: z.array(z.string()),
  advice: z.array(z.string()),
  factors: z.array(z.object({
    id: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    category: z.string(),
    description: z.string(),
  })).optional(),
  stage: z.enum(['staging', 'production']),
  evaluatedAt: z.string(),
});
```

---

## 3. Dual-Stage Environment Matrix

| Parameter | Staging (`stage = 'staging'`) | Production (`stage = 'production'`) |
| :--- | :--- | :--- |
| **Purpose** | Integration verification, test harness, viva demo | End-user browser execution |
| **Factor Breakdown** | Detailed array of triggered rules & category tags | Sanitized high-level bullet points |
| **Latency Simulation** | Configurable via query parameter (`latencyMs`) | Real-time direct calculation |
| **Error Diagnostics** | Detailed Zod path issues returned in payload | User-facing resolution messages |
| **Persistence** | Tagged as `stage: 'staging'` in audit table | Tagged as `stage: 'production'` |

---

## 4. Controller Hierarchy & Routes

### 4.1 Route Map
- `POST /api/analyze` — Primary evaluation endpoint (Node.js/Express)
- `POST /analyze` — Alias endpoint matching frozen specification
- `GET /api/history` — Fetch historical check records
- `DELETE /api/history` — Clear audit database
- `GET /api/health` — Subsystem heartbeat and contract version

### 4.2 Function Signatures & Responsibilities

1. **`analyzeJobController(req: Request, res: Response): Promise<void>`**
   - Validates ingress JSON against `JobCheckInputSchema`.
   - Normalizes payload into `NormalizedJobRequest`.
   - Executes `evaluateJobRisk()` algorithm or Python ML microservice gateway.
   - Validates egress against `JobCheckOutputSchema`.
   - Records transaction into `auditStorage`.
   - Returns HTTP 200 with result payload.

2. **`evaluateJobRisk(req: NormalizedJobRequest): JobCheckOutput`**
   - Deterministic rule engine evaluating:
     - Public free email domains (Gmail, Yahoo, Outlook, etc.).
     - Upfront fees, registration deposits, and equipment payments.
     - Telegram/WhatsApp exclusive recruitment funnels.
     - Rating/task scams with unrealistic compensation.
     - Cryptocurrency settlements or cheque cashing requests.

3. **`getHistoryController(req: Request, res: Response): Promise<void>`**
   - Queries stored records in reverse chronological order.

---

## 5. End-to-End User Simulation Test Scenarios

The following 10 real-world test cases represent actual scam archetypes and valid postings:

### Test Case 1: Telegram Upfront Security Deposit (High Risk)
- **Input:**
  ```json
  {
    "company": "Horizon Logistics",
    "email": "careers.horizon99@gmail.com",
    "salary": "95000",
    "job_text": "Immediate Data Entry: $45/hr. Contact Senior HR on Telegram @HorizonLead. Refundable equipment deposit of $150 required for company laptop."
  }
  ```
- **Expected Status:** `HTTP 200`
- **Expected Outcome:** `risk_level: "High"`, `score >= 0.75`, red flags: free email domain, upfront deposit, Telegram funnel.

### Test Case 2: WhatsApp Task Rating & Daily Crypto Payout (High Risk)
- **Input:**
  ```json
  {
    "company": "Boost Media",
    "email": "recruitment@outlook.com",
    "salary": "120000",
    "job_text": "Earn $300-$500 daily rating hotel listings and liking YouTube videos. Payouts via USDT daily. Message on WhatsApp only."
  }
  ```
- **Expected Outcome:** `risk_level: "High"`, `score >= 0.70`, red flags: task scam pattern, cryptocurrency settlement.

### Test Case 3: Legitimate Enterprise Role (Low Risk)
- **Input:**
  ```json
  {
    "company": "Stripe",
    "email": "recruiting-engineering@stripe.com",
    "salary": "165000",
    "job_text": "Senior Frontend Infrastructure Engineer: 5+ years experience with React, TypeScript, and distributed systems. Apply through our careers portal."
  }
  ```
- **Expected Outcome:** `risk_level: "Low"`, `score <= 0.20`, no critical red flags.

### Test Case 4: Missing Required Job Text (Validation Failure)
- **Input:**
  ```json
  { "email": "hr@google.com", "company": "Google" }
  ```
- **Expected Status:** `HTTP 400 Bad Request`
- **Expected Code:** `VALIDATION_FAILED` (Zero Fallback).

### Test Case 5: Invalid Recruiter Email Format (Validation Failure)
- **Input:**
  ```json
  { "job_text": "Marketing lead for our startup", "email": "not-an-email" }
  ```
- **Expected Status:** `HTTP 400 Bad Request`
- **Expected Error:** Email format validation rejection.

### Test Case 6: Non-Numeric Salary Injection (Validation Failure)
- **Input:**
  ```json
  { "job_text": "Valid job description over 10 characters", "salary": "one hundred thousand dollars" }
  ```
- **Expected Status:** `HTTP 400 Bad Request`

### Test Case 7: Fake Cheque Overpayment Scam (High Risk)
- **Input:**
  ```json
  {
    "job_text": "You will receive an electronic cashier's cheque to purchase office supplies. Wire the remaining balance back to our certified vendor."
  }
  ```
- **Expected Outcome:** `risk_level: "High"`, red flags: cheque cashing/money mule detection.

### Test Case 8: Masked / Confidential Company (Medium Risk)
- **Input:**
  ```json
  {
    "company": "Confidential",
    "job_text": "Urgent position available for remote typist. Send your CV immediately."
  }
  ```
- **Expected Outcome:** `risk_level: "Medium"`, advice includes demanding business entity registration.

### Test Case 9: Audit Persistence Verification
- **Execution:** Submit Test Case 1, then execute `GET /api/history`.
- **Expected:** Latest item in array matches Test Case 1 ID, timestamp, and score.

### Test Case 10: Backend Resilience / Simulated Network Disruption
- **Execution:** Disconnect or toggle offline test flag.
- **Expected:** Client renders non-blocking notification with retry affordance; input remains intact.
