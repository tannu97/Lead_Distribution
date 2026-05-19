# Prowider — Mini Lead Distribution System

A production-grade lead distribution platform built with **Next.js 14**, **MySQL**, **Prisma**, and **Server-Sent Events**.

## 🚀 Live Demo
[Deploy URL here]

## ⚙️ Tech Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide Icons
- **Backend**: Next.js API Routes (Node.js)
- **Database**: MySQL with Prisma ORM
- **Real-time**: Server-Sent Events (SSE)

---

## 🧠 Architecture Decisions

### Why MySQL over MongoDB?
Lead distribution requires **ACID transactions** and **row-level locking** (`SELECT FOR UPDATE`) to prevent race conditions during concurrent lead assignment. MySQL's transaction model is ideal for this.

### Why Prisma?
Type-safe queries, auto-generated client, excellent MySQL support, and schema migration tooling.

### Why SSE over WebSockets?
- One-directional server → client push is all we need
- Works with Next.js API routes without extra server setup
- Auto-reconnects on disconnect
- Lighter weight than WebSockets for this use case

---

## 🔁 Allocation Algorithm

### Step-by-step:

1. **Lock allocation rows** with `SELECT FOR UPDATE` on `AllocationCounter` table for the service
2. **Apply mandatory rules**:
   - Service 1 → Provider 1 always
   - Service 2 → Provider 5 always  
   - Service 3 → Provider 1 AND Provider 4 always
3. **Check quota**: Skip mandatory providers at monthly quota (graceful)
4. **Fair round-robin from pool**: Sort eligible pool providers by `turnCount ASC, position ASC`
5. **Pick** the lowest-count eligible providers to fill remaining slots (3 total)
6. **Increment** `turnCount` for selected providers
7. **Create** `LeadAssignment` records
8. **Update** `ProviderMonthlyCount` atomically

The `turnCount` persists in the database, so rotation survives server restarts.

---

## 🔒 Concurrency Handling

Uses **MySQL transactions with `SELECT FOR UPDATE`**:

```sql
SELECT id FROM AllocationCounter WHERE serviceId = ? FOR UPDATE
```

This **serializes** concurrent requests at the database level. Two simultaneous leads for the same service will:
1. First request acquires the lock → processes → releases
2. Second request waits → then processes with updated state

This prevents the same provider being picked twice in a race condition.

---

## 🎯 Webhook Idempotency

The `WebhookEvent` table stores processed event IDs:

1. Caller sends `eventId` + `eventType` in webhook payload
2. Check if `eventId` exists in `WebhookEvent` table
3. If exists → return "already processed" with **no action**
4. If new → **atomically** insert event record + process quota reset in same transaction
5. Same `eventId` can be called 100x → quota resets **exactly once**

---

## 📦 Setup Instructions

### Prerequisites
- Node.js 18+
- MySQL 8.0+ (local or PlanetScale/Railway)

### 1. Clone & Install
```bash
git clone <repo-url>
cd prowider-lead-distribution
npm install
```

### 2. Configure Database
```bash
cp .env.example .env.local
# Edit .env.local with your MySQL credentials
```

### 3. Setup Database
```bash
npx prisma db push      # Create tables
node prisma/seed.js     # Seed data
```

### 4. Run Development Server
```bash
npm run dev
```

Visit:
- `http://localhost:3000` — Home
- `http://localhost:3000/request-service` — Customer form
- `http://localhost:3000/dashboard` — Provider dashboard
- `http://localhost:3000/test-tools` — Testing panel

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `Service` | 3 services (code-based) |
| `Provider` | 8 providers with quota |
| `Lead` | Customer enquiries (unique phone+service) |
| `LeadAssignment` | Many-to-many lead ↔ provider |
| `AllocationCounter` | Persistent round-robin state per service pool |
| `ProviderMonthlyCount` | Current month usage tracking |
| `WebhookEvent` | Idempotency event log |

---

## ✅ What We Tested

- [x] Duplicate lead prevention (DB-level unique constraint)
- [x] Exactly 3 providers per lead
- [x] Mandatory assignment rules
- [x] Fair round-robin rotation (persistent across restarts)
- [x] Monthly quota enforcement
- [x] Concurrent lead creation (10 simultaneous)
- [x] Webhook idempotency (same eventId 3x → resets once)
- [x] Real-time SSE dashboard updates
- [x] Graceful handling when mandatory provider at quota

---

## 🏗️ Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── request-service/page.tsx  # Customer form
│   ├── dashboard/page.tsx        # Provider dashboard
│   ├── test-tools/page.tsx       # Testing panel
│   └── api/
│       ├── leads/route.ts        # POST/GET leads
│       ├── providers/route.ts    # GET provider stats
│       ├── sse/route.ts          # SSE stream
│       ├── webhook/route.ts      # Idempotent webhook
│       └── test-tools/route.ts   # Concurrent test helper
├── lib/
│   ├── prisma.ts                 # DB singleton
│   ├── allocation.ts             # Core allocation engine
│   └── sse.ts                    # SSE manager
prisma/
├── schema.prisma                 # DB schema
└── seed.js                       # Seed data
```
