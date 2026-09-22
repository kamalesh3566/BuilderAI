# ⚡ BuilderAI — Backend API Server

[![Node.js Express 5](https://img.shields.io/badge/Node.js-Express%205.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://mongodb.com/)
[![Security](https://img.shields.io/badge/Security-AES--256--GCM-blueviolet?logo=shield)](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
[![Render Ready](https://img.shields.io/badge/Deployment-Render-46E3B7?logo=render&logoColor=black)](https://render.com/)

> High-throughput, secure backend API and orchestration engine for BuilderAI. Built with Express 5, strict TypeScript, MongoDB Atlas, dual-stage LLM pipelines (Gemini Vision + Cohere North Mini), self-healing Babel AST code validation, compact manifest diffing, and multi-layer cryptographic security.

---

## 🚀 Key Architectural Capabilities

### 1. ⚡ Deterministic Manifest Diff Engine
* Instead of transmitting entire codebases (~50KB–150KB) on every chat revision, the engine constructs a lightweight **JSON Manifest** (~400 bytes).
* The LLM emits targeted **Search & Replace JSON patches**, which the server validates via **SHA-256 checksums** before applying to memory and MongoDB records.
* **Reduces token costs by 70–90%** and cuts revision turnaround time from 20s down to **<4s**.

### 2. 🛡️ Self-Healing Babel AST Code Validator
* Automatically intercepts and parses raw LLM component outputs (`codeValidator.ts`).
* Auto-detects and inserts missing `lucide-react` icon imports.
* Auto-injects required `'./styles.css'` and `React` imports.
* Fixes unclosed JSX tags, normalizes code block fences, and protects against malformed code syntax.

### 3. 🚀 Concurrent Worker Queue (`p-map`)
* Multi-file project blueprints are synthesized in parallel across a worker pool with a concurrency limit of 6.
* Built-in exponential backoff recovery loop handles transient AI provider dropouts.

### 4. 🔒 Multi-Layered Cryptographic & Application Security
* **AES-256-GCM Envelope Encryption with Key Separation**: User BYOK API keys are encrypted at rest with an independent 256-bit key (`ENCRYPTION_KEY`), non-repeating 96-bit CSPRNG initialization vectors (`crypto.randomBytes(12)`), and 128-bit GHASH authentication tags. Strictly decoupled from `JWT_SECRET`.
* **Server-Side JWT Revocation (`tokenVersion`)**: The `User` model maintains a `tokenVersion` counter checked on every authenticated request. Calling `/logout` or `/password` increments this version, instantly and permanently invalidating all previously issued JWT tokens across all devices.
* **Strict Cross-Site Request Forgery (CSRF) & Origin Verification**: Dedicated `csrfProtection` middleware inspects all state-changing operations (`POST`, `PUT`, `PATCH`, `DELETE`), blocking unauthorized cross-origin cookie submissions and enforcing strict Origin/Referer whitelisting.
* **Strict Zod Schema Validation**: Every endpoint enforces strict Zod schema validation across `body`, `query`, and `params` before reaching controller logic.
* **Request Correlation & Structured Audit Logging (`securityLogger`)**: Every request is assigned a unique `X-Request-Id` UUID, and security-critical actions (logins, password updates, BYOK changes, account deletions) emit structured JSON audit logs.
* **Transport Hardening & Security Headers**: Helmet configured with 1-year HSTS (`maxAge: 31536000`, `includeSubDomains`, `preload`), `noSniff`, `xssFilter`, and `referrerPolicy`.
* **Zero-Secret Logging**: Centralized error interceptors redact sensitive keys (`sk-or-...`, `AIzaSy...`, Bearer tokens) from all console streams and client error payloads.
* **NoSQL Injection Sanitization**: Custom recursive sanitization middleware cleans all `$` operator keys from `req.body`, `req.query`, and `req.params`.
* **Path Traversal / Zip Slip Prevention**: Strict whitelist validation (`/^\/[a-zA-Z0-9_\-\.\/]+$/`) blocks directory traversal (`../`), null bytes, and sensitive filenames (`/.env`, `/.git`, `id_rsa`).
* **Graceful Worker Aborts**: Deleting a project triggers `abortGeneration(projectId)` using `AbortController` signals to immediately stop active background workers.

---

## 📂 Directory Structure

```
server/
├── config/
│   └── db.ts                # MongoDB Mongoose connection with retry logic
├── controllers/
│   ├── authController.ts    # Register, login, logout, verify session, password change
│   └── projectController.ts # Create, generate, revise, save, rollback, and delete projects
├── middleware/
│   ├── authMiddleware.ts    # Dual Bearer/cookie auth + tokenVersion revocation verification
│   ├── csrfProtection.ts    # Strict CSRF and Origin verification for state-changing requests
│   ├── mongoSanitize.ts     # Recursive NoSQL operator injection filter
│   ├── rateLimiters.ts      # Tiered rate limiting (Auth, Generation, Modifications, Erasure)
│   ├── sanitizeError.ts     # Secret-redacting global error handler
│   └── validate.ts          # Zod schema validation for all incoming requests
├── models/
│   ├── Project.ts           # Project schema, file tree, version history, and chat messages
│   └── User.ts              # User schema, password hashes, tokenVersion, and AES-256-GCM encrypted keys
├── routes/
│   ├── authRoutes.ts        # /api/auth endpoints with Zod schemas and rate limiters
│   └── projectRoutes.ts     # /api/projects endpoints with Zod schemas and ownership guards
├── services/
│   ├── aiService.ts         # Gemini Vision blueprinting & Cohere multi-file synthesis
│   ├── codeValidator.ts     # Self-healing Babel AST parser and syntax corrector
│   ├── diff.ts              # SHA-256 manifest builder and AST patch applier
│   └── generationManager.ts # Concurrency worker pool and AbortController registry
├── types/
│   └── index.ts             # TypeScript interfaces for projects, files, user, and patches
├── utils/
│   ├── encryption.ts        # AES-256-GCM cipher and decipher with strict key isolation
│   ├── sanitizeError.ts     # Regex error message sanitizer
│   └── securityLogger.ts    # Structured JSON security audit logger with correlation IDs
├── server.ts                # Express 5 application setup, Request IDs, Helmet, dynamic CORS
├── package.json             # Server dependencies & build scripts
└── tsconfig.json            # Node.js TypeScript compiler configuration
```

---

## 📡 API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Protected | Security Enforcements |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Create user account & issue JWT token | **Yes** | `authLimiter` + `Zod Schema` + `mongoSanitize` + BCrypt (12 Rounds) |
| `POST` | `/api/auth/login` | Authenticate credentials & issue session token | **Yes** | `authLimiter` (15 req/15min) + `Zod Schema` + `mongoSanitize` + Timing-Safe Verification |
| `POST` | `/api/auth/logout` | Revoke session & increment `tokenVersion` | **Yes** | Server-Side `tokenVersion` Invalidation + Cookie Clear |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & credit balance | **Yes** | `authMiddleware` (Dual Bearer / Cookie + `tokenVersion` Check) |
| `PUT` | `/api/auth/profile` | Update user display name | **Yes** | `authMiddleware` + `Zod Schema` + Sanitized Input Whitelist |
| `PUT` | `/api/auth/password` | Update password & revoke other active sessions | **Yes** | `authMiddleware` + `passwordLimiter` + `Zod Schema` + `tokenVersion` Bump |
| `GET` | `/api/auth/keys` | Check which BYOK keys are configured (masked) | **Yes** | `authMiddleware` + Secret Redaction |
| `PUT` | `/api/auth/keys` | Save BYOK API keys | **Yes** | `authMiddleware` + `Zod Schema` + **AES-256-GCM Envelope Encryption** |
| `DELETE` | `/api/auth/keys` | Remove saved BYOK keys from database | **Yes** | `authMiddleware` + Audit Log |
| `DELETE` | `/api/auth/account` | Permanently scrub account and associated data | **Yes** | `authMiddleware` + `accountLimiter` + Cascading Worker Abort |
| `GET` | `/api/auth/export-data` | Export GDPR/DPDP compliant JSON user archive | **Yes** | `authMiddleware` + `accountLimiter` (Anti-Scraping Rate Limit) |

### Projects & Generation (`/api/projects`)
| Method | Endpoint | Description | Protected | Security Enforcements |
|---|---|---|---|---|
| `GET` | `/api/projects` | List all projects belonging to user | **Yes** | `authMiddleware` + User-Scoped MongoDB Query |
| `GET` | `/api/projects/:id` | Get project details, current files, and version history | **Yes** | `authMiddleware` + Resource Ownership Verification |
| `POST` | `/api/projects` | Initialize project & run 2-stage AI synthesis | **Yes** | `authMiddleware` + `aiProjectLimiter` + `Zod Schema` + Zip Slip Regex |
| `POST` | `/api/projects/:id/chat` | Run targeted manifest diff revision via chat prompt | **Yes** | `authMiddleware` + `aiChatLimiter` + `Zod Schema` + **SHA-256 Diff Verification** |
| `PUT` | `/api/projects/:id/files` | Save updated project file tree | **Yes** | `authMiddleware` + `fileUpdateLimiter` + `Zod Schema` + Path Whitelist |
| `POST` | `/api/projects/:id/rollback` | Roll back files to a specific version number | **Yes** | `authMiddleware` + `Zod Schema` + Snapshot Integrity Check |
| `DELETE` | `/api/projects/:id` | Cancel active workers and delete project | **Yes** | `authMiddleware` + `abortGeneration` Signal Handler |

---

## ⚙️ Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Allowed CORS Origins (comma-separated)
ORIGINS="http://localhost:5173,http://localhost:3000"

# Database Connection
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/builderai?retryWrites=true&w=majority"

# JWT Signing Secret (Generate with: openssl rand -base64 32)
JWT_SECRET="your_strong_random_jwt_signing_secret"

# Independent AES-256-GCM Encryption Key for BYOK API Keys (Generate with: openssl rand -hex 32)
# Strictly separated from JWT_SECRET to guarantee cryptographic key isolation
ENCRYPTION_KEY="your_64_character_hex_encoded_32_byte_aes_key"

# Default Free-Tier AI Model Configuration (OpenRouter)
OPENROUTER_API_KEY="sk-or-v1-your-openrouter-api-key"
OPENROUTER_MODEL="cohere/north-mini-code:free"
OPENROUTER_VISION_MODEL="openrouter/free"

# Concurrency Worker Limit for Parallel Multi-File Synthesis
AI_MAX_CONCURRENCY=6
```

---

## 🚦 Available Scripts

In the `server/` directory:

```bash
# 1. Run in development mode with auto-reload (tsx)
npm run dev

# 2. Compile TypeScript into JavaScript (dist/)
npm run build

# 3. Start production server
npm start
```

---

## ☁️ Deployment (Render / Railway)

1. Create a **Web Service** on [Render](https://render.com) or [Railway](https://railway.app).
2. Set **Root Directory** to `server`.
3. Set **Environment** to `Node`.
4. Set **Build Command** to `npm install && npm run build`.
5. Set **Start Command** to `npm run start` (executes `node dist/server.js`).
6. Configure environment variables (`MONGODB_URI`, `JWT_SECRET`, `ENCRYPTION_KEY`, `OPENROUTER_API_KEY`, `ORIGINS`, `NODE_ENV=production`).
7. Persistent Node execution ensures continuous LLM generation without execution timeouts.
