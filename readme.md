# Orquesta — Panama Fintech Payment Orchestration Platform

**Super-Prompt for Code Generation with Agent-Governed Architecture**

> This document serves as the master super-prompt for generating the Orquesta codebase using Codex, Claude, or any AI coding tool. It is designed to work in tandem with `agents.md`, which defines 28 specialized senior agents that govern every file, decision, and code standard in this repo.
>
> **How to use:** Copy this entire document (or specific phases) into your AI coding tool. Reference `agents.md` for agent-specific knowledge, constraints, and prompt templates.

---

## Project Overview

**Orquesta** is a Panama-based fintech platform that orchestrates payments between sellers, buyers, and financial services providers. It integrates with **Yappy** (Banco General's mobile payment system) and **PayCaddy** (payout/ACH provider) to process payments, manage ledger entries, sweep platform fees, and distribute payouts to sellers.

### Core Capabilities

- **Double-entry ledger** with immutable append-only entries and ITBMS (7% Panama tax) accrual
- **Payment processing** via Yappy QR codes with webhook-driven confirmation
- **Automated fee sweeps** (hourly) and **payout batching** (daily) via background workers
- **ML-powered features**: churn prediction, anomaly/fraud detection, dynamic fee optimization, ITBMS forecasting
- **Sandbox environment** with mock servers for Yappy and PayCaddy
- **Platform dashboard** (admin), **seller portal**, and **embeddable checkout** widget

### Panama-Specific Context

- **Currency:** PAB (Balboa) pegged 1:1 to USD — both are legal tender
- **Tax:** ITBMS at 7% on digital services, monthly filing to DGI by the 15th, 7-year retention
- **Timezone:** UTC-5 (no daylight saving time)
- **Locale:** Bilingual Spanish/English, date format DD/MM/YYYY, currency format B/. 1,234.56
- **Holidays:** Carnaval (variable), Fiestas Patrias (Nov 3-5), and 10+ national holidays affect settlement windows
- **Regulatory:** SBP (banking superintendent) oversight, AML Law 23/2015, KYC for >$10K annual volume

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| API Server | Fastify + TypeScript (strict) | Performance (100K RPS capable), schema-first validation |
| Database | PostgreSQL 16 | ACID compliance for double-entry ledger, partitioning, RLS |
| Background Jobs | Node.js workers with node-cron | Fee sweeps (hourly), payouts (daily), tax reports (monthly) |
| Frontend (Dashboard) | Next.js 14 (App Router) + Tailwind + Radix UI | SSR for performance, accessible components |
| Frontend (Checkout) | React + Vite | Embeddable widget, < 200KB gzipped |
| ML Serving | ONNX Runtime (Node.js) | Low-latency inference without Python dependency |
| Validation | Zod | Runtime type validation, schema-first API design |
| Logging | Pino (JSON) + OpenTelemetry | Structured, correlated, traceable |
| Infrastructure | Railway (API/DB) + Vercel (frontend) + R2 (storage) | Zero-cost free tiers |

---

## Repo Structure

> Every file below has a **primary agent owner** and **secondary consultants** defined in `agents.md`. When generating code for any file, invoke the owning agent's persona and constraints. Make sure you always design for the webased version as well as the mobile/tablet version, and that all the graphs are being displayed in mermeid.js.

```
orquesta/
├── docker-compose.yml              # [SPE] Docker setup: postgres:16, redis:7, api, worker, mocks
├── .env.example                    # [SSE] Environment template (never real credentials)
├── README.md                       # [SDWE] This file — project overview and super-prompt
├── package.json                    # [SBL] Root package: pnpm scripts, shared dev dependencies
├── pnpm-workspace.yaml             # [SBL] Workspace: services/*, apps/*
│
├── infra/
│   └── migrations/                 # [PFA + SDBE] SQL migrations (immutable, append-only)
│       ├── 0001_init.sql           # [PFA] Tables: accounts, ledger_entries (partitioned),
│       │                           #   payment_intents, fee_obligations, sellers, projects
│       │                           #   Constraints: BIGINT cents, UUID PKs, no-update on ledger
│       ├── 0002_views.sql          # [PFA] Views: seller_balance_summary, platform_fee_summary,
│       │                           #   itbms_monthly_summary
│       └── 0003_indices.sql        # [SDBE] Covering indexes, partial indexes for hot paths
│
├── services/
│   ├── api/                        # [SBL] Fastify API server (TypeScript strict mode)
│   │   ├── package.json            # [SBL] Dependencies: fastify, zod, pg, pino, onnxruntime
│   │   ├── tsconfig.json           # [SBL] TypeScript strict, ES2022 target
│   │   └── src/
│   │       ├── config.ts           # [CTA] Environment config: sandbox/prod detection,
│   │       │                       #   DB connection, Yappy/PayCaddy URLs, feature flags
│   │       ├── server.ts           # [SBL] Fastify instance: plugins (cors, helmet, rate-limit),
│   │       │                       #   storage decoration, graceful shutdown, health check
│   │       ├── types/
│   │       │   └── fastify.d.ts    # [SBL] Augment: FastifyRequest.user, .correlationId;
│   │       │                       #   FastifyInstance.store, .config
│   │       ├── auth.ts             # [SSE] API key auth: sk_test_*/sk_live_* format,
│   │       │                       #   Argon2id hash verification, environment scoping,
│   │       │                       #   rate limiting (100 req/min per key)
│   │       │
│   │       ├── storage/            # [SBL + SDBE] Storage abstraction layer
│   │       │   ├── types.ts        # [SBL] Interface: CRUD for all entities, getSellerBalance,
│   │       │   │                   #   getLedgerEntries, getPendingFeeObligations
│   │       │   ├── postgres.ts     # [SDBE] Postgres impl: parameterized queries, connection
│   │       │   │                   #   pooling, transaction support, cursor-based pagination
│   │       │   └── memory.ts       # [SBL] In-memory impl for sandbox/testing
│   │       │
│   │       ├── adapters/           # [PPSA] External service integrations
│   │       │   ├── yappy.ts        # [PPSA] Yappy adapter: OAuth 2.0, QR payment creation,
│   │       │   │                   #   webhook signature verification (HMAC-SHA256),
│   │       │   │                   #   circuit breaker (5 failures/60s, 30s reset)
│   │       │   ├── paycaddyMock.ts # [PPSA] Sandbox PayCaddy: 2-5s delays, 5% failure sim
│   │       │   ├── paycaddyProd.ts # [PPSA] Real PayCaddy: mTLS auth, ACH payouts,
│   │       │   │                   #   RUC/KYC verification, idempotency forwarding
│   │       │   └── analyticsAPI.ts # [PDA] Optional analytics integration
│   │       │
│   │       ├── domain/             # [PLA + CFA] Core business logic
│   │       │   ├── ledger.ts       # [PLA] Double-entry ledger: recordTransaction()
│   │       │   │                   #   validates SUM(debits)==SUM(credits), writes atomically,
│   │       │   │                   #   getAccountBalance() derived from SUM (never cached),
│   │       │   │                   #   ALL values as bigint cents, NEVER float
│   │       │   ├── postPaymentConfirmed.ts  # [PLA] Creates 4-6 ledger entries per payment:
│   │       │   │                   #   debit receivable, credit payable, debit/credit platform fee,
│   │       │   │                   #   debit/credit ITBMS (7%, FLOOR, round down)
│   │       │   ├── feeSweep.ts     # [CFA] Fee sweep: query pending obligations per seller,
│   │       │   │                   #   create ledger entries, mark as swept, idempotent
│   │       │   └── payouts.ts      # [CFA] Payout: validate balance, check risk tier (SFRE),
│   │       │                       #   call PayCaddy, create ledger entries
│   │       │
│   │       ├── routes/             # [PAD + SBL] REST API (Stripe-style conventions)
│   │       │   ├── projects.ts     # [PAD] POST/GET /v1/projects — create project + API key
│   │       │   ├── sellers.ts      # [PAD] POST/GET/PATCH /v1/sellers — CRUD + balance
│   │       │   ├── paymentIntents.ts # [PAD] POST/GET /v1/payment-intents — idempotency required
│   │       │   ├── fees.ts         # [PEWA] POST /v1/fee-sweeps, GET /v1/fee-obligations
│   │       │   ├── metrics.ts      # [STDE] GET /v1/metrics/platform, /v1/metrics/sellers/:id
│   │       │   ├── taxReports.ts   # [STES] GET/POST /v1/tax-reports/:period — ITBMS CSV/PDF
│   │       │   └── webhooks.ts     # [PEWA] POST /webhooks/yappy, /webhooks/paycaddy
│   │       │                       #   Signature verify -> idempotency check -> risk screen (SFRE)
│   │       │                       #   -> ledger write (PLA) -> event emit -> 200 OK
│   │       │
│   │       └── ml/                 # [SMLE] ML feature integration (ONNX Runtime)
│   │           ├── index.ts        # [SMLE] Model loader, health check, version tracking
│   │           ├── churnPrediction.ts  # [SMLE] XGBoost: RFM features, >0.7 triggers retention
│   │           ├── anomalyDetection.ts # [SMLE+SFRE] Isolation Forest: velocity, amount Z-score
│   │           ├── dynamicFees.ts   # [SMLE] Contextual bandits: [2.9%-5.9%], max +/-0.5%/tx
│   │           └── forecasting.ts   # [SMLE+STES] Prophet/ARIMA: ITBMS liability projection
│   │
│   ├── worker/                     # [SWS] Background workers (mission-critical financial ops)
│   │   ├── package.json            # [SWS] Dependencies: node-cron, pg
│   │   └── src/
│   │       ├── worker.ts           # [SWS] Main entry: job registry, graceful shutdown,
│   │       │                       #   dead-letter queue, structured logging with job_id
│   │       ├── payoutScheduler.ts  # [SWS] Daily 06:00 UTC: query eligible sellers,
│   │       │                       #   risk gate (skip RED/BLACK), batch 50, PayCaddy call
│   │       └── feeScheduler.ts     # [SWS] Hourly :00: sweep pending obligations,
│   │                               #   batch 100 sellers, 3x exponential backoff retry
│   │
│   ├── yappy-mock/                 # [PPSA] Standalone Yappy sandbox server
│   │   ├── package.json            # [PPSA] Fastify
│   │   └── src/
│   │       └── server.ts           # [PPSA] POST /v2/payments, GET /v2/payments/:id,
│   │                               #   POST /webhooks/simulate, T+1 settlement sim
│   │
│   └── paycaddy-mock/              # [PPSA] Standalone PayCaddy sandbox server
│       ├── package.json            # [PPSA] Fastify
│       └── src/
│           └── server.ts           # [PPSA] POST /payouts, GET /payouts/:id,
│                                   #   POST /kyc/verify, POST /webhooks/simulate
│
├── apps/
│   ├── platform-dashboard/         # [SFL] Next.js 14: GMV charts, seller list, fee sweeps,
│   │                               #   payouts, ITBMS reports, API key management
│   │                               #   Stack: Tailwind, Radix UI, TanStack Query/Table, Recharts
│   ├── seller-portal/              # [SFL] Next.js 14: balance, transactions, payouts, settings
│   │                               #   Bilingual (Spanish default/English), mobile-responsive
│   │                               #   Currency: B/. format, WCAG 2.1 AA accessibility
│   └── demo-checkout/              # [SMEE] React+Vite: embeddable widget, Yappy QR,
│                                   #   < 200KB gzipped, iframe postMessage API
│
└── ml-models/                      # [SMLE] Trained model artifacts (ONNX format)
    ├── dynamicFeesModel.pkl         # [SMLE] Contextual bandits for fee optimization
    ├── churnModel.pkl               # [SMLE] XGBoost for seller churn prediction
    ├── anomalyModel.pkl             # [SMLE] Isolation Forest for fraud detection
    └── forecastingModel.pkl         # [SMLE] Prophet/ARIMA for ITBMS forecasting
```

---

## Non-Negotiable Code Standards

These constraints apply to ALL generated code. Every agent enforces them within their domain.

### Financial Precision

```
- ALL monetary values as BIGINT (cents) — NEVER use float/number for money
- Currency: 'PAB' | 'USD' (CHAR(3)), always explicit, never just "$"
- ITBMS calculation: FLOOR(amount_cents * 7 / 100) — always round DOWN
- Display format: B/. 1,234.56 (PAB) or US$ 1,234.56 (USD)
```

### Ledger Integrity (PLA Invariants)

```
- SUM(debits) == SUM(credits) for every transaction — zero-sum guarantee
- Ledger entries are IMMUTABLE — no UPDATE, no DELETE, only INSERT
- Balances are DERIVED (SUM of entries), never stored as mutable state
- Every entry has a contra_entry_id (double-entry pair)
- Idempotency enforced via unique idempotency_key per entry
```

### Security (SSE Mandates)

```
- API keys: sk_test_* (sandbox) / sk_live_* (production), Argon2id hashed
- Webhook signatures: HMAC-SHA256 (Yappy), mTLS (PayCaddy)
- Environment isolation: test keys CANNOT access production data
- Audit trail: 7-year retention, WORM storage, field-level change tracking
- TLS 1.3 only, AES-256-GCM at rest
```

### API Design (PAD Standards)

```
- RESTful: plural nouns (/payment-intents), standard HTTP methods
- Idempotency-Key header required on all POST endpoints (24h retention)
- Cursor-based pagination (no OFFSET): { data, has_more, next_cursor }
- Structured errors: { error: { code, message, details } }
- Rate limiting: 100 req/min per API key, 429 with Retry-After header
- Versioning: /v1/ URL path prefix
```

### Infrastructure (PCOE Zero-Cost)

```
- Monthly target: $0-$20 total (Railway + Vercel + R2 free tiers)
- Connection pooling: PgBouncer, max 10 concurrent connections
- Docker multi-stage builds (distroless final images)
- Auto-sleep prevention: cron ping every 4 minutes
- CDN: Cloudflare free tier, 1-hour TTL for static assets
```

---

## Agent-Governed Development Phases

> Each phase lists the **lead agents** (from `agents.md`), the **files to generate**, and the **dependencies** on prior phases. Execute phases in order.

### Phase 0: Project Scaffolding

**Lead:** CTA, SBL, SPE | **Dependencies:** None

```
Generate: package.json, pnpm-workspace.yaml, docker-compose.yml, .env.example,
  services/api/package.json, services/api/tsconfig.json,
  services/worker/package.json, services/yappy-mock/package.json,
  services/paycaddy-mock/package.json
Stack: pnpm monorepo, TypeScript strict, Node.js 20 LTS, ESLint + Prettier
Docker: postgres:16, redis:7, api, worker, yappy-mock, paycaddy-mock
```

### Phase 1: Database Schema & Storage

**Lead:** PFA, SDBE, PLA | **Dependencies:** Phase 0

```
Generate: infra/migrations/0001_init.sql, 0002_views.sql, 0003_indices.sql,
  services/api/src/storage/types.ts, postgres.ts, memory.ts
Schema: accounts, ledger_entries (partitioned monthly, immutable), payment_intents,
  fee_obligations, sellers (with risk_tier, ruc), projects (with api_key_hash)
All monetary columns: BIGINT, all PKs: UUID, RLS for seller isolation
```

### Phase 2: Core Server & Authentication

**Lead:** SBL, SSE | **Dependencies:** Phase 1

```
Generate: services/api/src/config.ts, server.ts, types/fastify.d.ts, auth.ts
Fastify: Zod type provider, cors, helmet, rate-limit, swagger, pino logging
Auth: API key middleware (sk_test_*/sk_live_*), Argon2id, environment scoping
```

### Phase 3: Domain Logic

**Lead:** PLA, CFA | **Dependencies:** Phase 2

```
Generate: services/api/src/domain/ledger.ts, postPaymentConfirmed.ts,
  feeSweep.ts, payouts.ts
Ledger: double-entry with zero-sum validation, bigint arithmetic, ITBMS accrual
All functions: idempotent, transactional, replay-safe
```

### Phase 4: Payment Adapters & Mocks

**Lead:** PPSA, PEWA | **Dependencies:** Phase 3

```
Generate: services/api/src/adapters/yappy.ts, paycaddyMock.ts, paycaddyProd.ts,
  analyticsAPI.ts, services/yappy-mock/src/server.ts,
  services/paycaddy-mock/src/server.ts
Yappy: OAuth 2.0, QR payments, HMAC-SHA256 webhooks, circuit breaker
PayCaddy: mTLS, ACH payouts, RUC/KYC verification
Mocks: realistic delays (2-5s), 5% failure sim, webhook simulation endpoints
```

### Phase 5: API Routes

**Lead:** PAD, SBL, PEWA, STES | **Dependencies:** Phase 4

```
Generate: services/api/src/routes/projects.ts, sellers.ts, paymentIntents.ts,
  fees.ts, metrics.ts, taxReports.ts, webhooks.ts
Style: Stripe-like REST, Zod validation, idempotency headers, cursor pagination
Webhooks: verify signature -> deduplicate -> risk screen (SFRE) -> process -> 200
Tax: ITBMS monthly CSV/PDF, bilingual (Spanish/English), DGI format
```

### Phase 6: Background Workers

**Lead:** SWS, CFA | **Dependencies:** Phase 5

```
Generate: services/worker/src/worker.ts, feeScheduler.ts, payoutScheduler.ts
Fee sweep: hourly, batch 100 sellers, 3x exponential backoff, dead-letter queue
Payouts: daily 06:00 UTC, batch 50, risk gate (skip RED/BLACK sellers),
  verify float balance before batch, Telegram alert on failure
```

### Phase 7: ML Features

**Lead:** SMLE, SFRE, STES | **Dependencies:** Phase 5

```
Generate: services/api/src/ml/index.ts, churnPrediction.ts, anomalyDetection.ts,
  dynamicFees.ts, forecasting.ts
Models: ONNX Runtime loading from ml-models/, health checks, version tracking
Churn: XGBoost, RFM features, >0.7 triggers retention workflow
Anomaly: Isolation Forest, velocity + amount Z-score, risk tiers GREEN/YELLOW/RED/BLACK
Fees: Contextual bandits, [2.9%-5.9%] range, max +/-0.5% per tx
Forecast: ITBMS liability projection with confidence intervals
```

### Phase 8: Frontend Applications

**Lead:** SFL, CPA, SILE, SMEE | **Dependencies:** Phase 5

```
Generate: apps/platform-dashboard/ (Next.js 14, Tailwind, Radix, TanStack, Recharts)
  Pages: /, /sellers, /sellers/:id, /payments, /fees, /payouts, /tax, /settings
Generate: apps/seller-portal/ (Next.js 14, bilingual Spanish/English, mobile-first)
  Pages: /, /transactions, /payouts, /settings
Generate: apps/demo-checkout/ (React+Vite, < 200KB, iframe postMessage API)
Accessibility: WCAG 2.1 AA, currency B/. format, DD/MM/YYYY dates
```

### Phase 9: Testing

**Lead:** SQE | **Dependencies:** Phases 0-8

```
Unit: Jest + fast-check property tests (ledger zero-sum, idempotency, ITBMS rounding)
Integration: Supertest + TestContainers (real Postgres, full payment flow)
Contract: Pact (API <-> Yappy mock, API <-> PayCaddy mock)
E2E: Playwright (dashboard login, seller payout, checkout flow)
Coverage: >80% on domain/ and routes/, mutation testing via Stryker
```

### Phase 10: CI/CD & Deployment

**Lead:** SDRE, SPE, PCOE | **Dependencies:** Phase 9

```
Generate: .github/workflows/ci.yml (lint, typecheck, test, security scan, build)
  .github/workflows/deploy.yml (Docker build, Railway deploy, Vercel deploy, smoke test)
Branch strategy: main (always deployable), feature/* (<3 days), hotfix/*
Deployment: canary 5% for 30min, auto-rollback on error rate >1%
Cost: Stay within free tiers (GitHub Actions 2000 min/month)
```

---

## Key Workflows (Cross-Agent)

### Payment Flow

```
Yappy webhook -> PEWA receives -> PPSA verifies signature -> PEWA deduplicates
  -> SFRE risk scores -> PLA creates ledger entries (double-entry)
  -> STES calculates ITBMS (7%) -> PEWA emits event -> Return 200 OK
```

### Fee Sweep

```
SWS cron (hourly) -> Query pending obligations -> CFA calculates fees
  -> STES adds ITBMS on fees -> PLA records ledger entries
  -> CFA marks as swept -> PEWA emits event -> SOE logs audit trail
```

### Payout

```
SWS cron (daily 06:00 UTC) -> Query eligible sellers -> SFRE risk gate
  -> PPSA calls PayCaddy -> PLA records ledger entries -> Wait for confirmation
  -> SWS marks complete -> CFA reconciles treasury -> PEWA emits event
```

### ITBMS Tax Report

```
SWS cron (monthly) -> STES aggregates ITBMS entries -> PLA reconciles vs ledger
  -> STES generates CSV (DGI format) + PDF (bilingual) -> SSE encrypts for storage
  -> SPE stores to R2 (7-year retention) -> SOE alerts admin of filing deadline
```

---

## Super-Prompt for Complete Generation

> Copy the prompt below into Codex or Claude to generate the full Orquesta codebase. For phase-specific generation, use the phase prompts in `agents.md`.

```
You are an expert development team building Orquesta, a Panama fintech payment
orchestration platform. You have 28 specialized agents (defined in agents.md)
governing every aspect of the system.

Generate a complete Node.js/TypeScript implementation with:

1. FASTIFY API SERVER (services/api/) — TypeScript strict, Zod validation,
   structured logging (pino), rate limiting, API key auth (Argon2id),
   health check, graceful shutdown

2. DOUBLE-ENTRY LEDGER (domain/ledger.ts) — Immutable, append-only,
   BIGINT cents (never float), SUM(debits)==SUM(credits) invariant,
   ITBMS 7% accrual (FLOOR rounding), idempotency via unique keys

3. PAYMENT ADAPTERS (adapters/) — Yappy: OAuth 2.0, HMAC-SHA256 webhooks,
   circuit breaker. PayCaddy: mTLS, ACH payouts, RUC verification.
   Both mock (sandbox) and production implementations.

4. REST API ROUTES (routes/) — Stripe-style: /v1/payment-intents,
   /v1/sellers, /v1/projects, /v1/fee-sweeps, /v1/tax-reports,
   /webhooks/yappy, /webhooks/paycaddy. Cursor pagination, idempotency
   headers, structured error responses.

5. BACKGROUND WORKERS (services/worker/) — Fee sweep: hourly, batch 100,
   3x exponential retry. Payouts: daily 06:00 UTC, batch 50, risk gate,
   dead-letter queue. ITBMS reporting: monthly.

6. ML FEATURES (ml/) — Churn prediction (XGBoost), anomaly detection
   (Isolation Forest), dynamic fees (contextual bandits 2.9%-5.9%),
   ITBMS forecasting (Prophet). ONNX Runtime serving.

7. POSTGRESQL SCHEMA (infra/migrations/) — Partitioned ledger_entries,
   accounts, payment_intents, fee_obligations, sellers, projects.
   RLS policies, covering indexes, materialized views.

8. MOCK SERVERS (services/yappy-mock/, services/paycaddy-mock/) —
   Standalone Fastify servers simulating real provider behavior with
   realistic delays and webhook simulation endpoints.

9. FRONTEND APPS — Platform dashboard (Next.js 14 + Tailwind + Radix UI),
   seller portal (bilingual Spanish/English, mobile-responsive),
   demo checkout (React+Vite, embeddable widget < 200KB).

10. OBSERVABILITY — OpenTelemetry tracing, correlation IDs on every request,
    structured JSON logs, Prometheus metrics, alert rules for ledger
    imbalance, payment failures, and worker dead-letters.

Panama-specific constraints:
- ITBMS: 7% tax, FLOOR rounding, monthly DGI filing, 7-year retention
- Currency: PAB/USD (1:1 peg), display as B/. or US$, BIGINT cents
- Timezone: UTC-5, no DST, holiday calendar affects settlement windows
- Locale: Spanish default, English toggle, DD/MM/YYYY dates
- Regulatory: SBP oversight, AML Law 23/2015, KYC for >$10K annual
- Infrastructure: Zero-cost free tiers (Railway, Vercel, R2, GitHub Actions)

Every function that changes state must be idempotent and operate within
a database transaction. No floating-point arithmetic for money. Ever.
```

---

## Agent Reference

For detailed agent specifications, code standards, conflict resolution procedures, cross-agent workflows, and ready-to-use prompt templates for each development phase, see **`agents.md`** (28 agents, 5 authority tiers, 11 development phases).
