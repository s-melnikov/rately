# Ratify — Product Reviews System

A full-stack product review platform where users can browse products, read reviews, and post their own reviews after a simple JWT-based sign-in.

---

## Overview

- Browse products with category filtering and pagination
- View individual products with aggregated star ratings (cached in Redis)
- Sign in with just a username + email (no password, no registration)
- Write, edit, and delete your own reviews
- Star rating picker with 1–5 scale

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Backend** | NestJS | Modular architecture, decorator-based DI, first-class TypeScript, built-in validation and Swagger support |
| **Database** | PostgreSQL | Relational model fits structured product/review data perfectly; ACID guarantees for write operations |
| **Cache** | Redis | Cache aggregated ratings (`AVG`, `COUNT`) per product — avoids recalculating on every product page load |
| **ORM** | Prisma | Type-safe queries, auto-generated types, clean migration workflow, excellent DX |
| **Frontend** | Angular 17+ | Standalone components, signals-based reactivity, strong typing out of the box |
| **Auth** | JWT (stateless) | No session storage needed; payload carries `username` + `email` — enough for ownership checks |
| **Infrastructure** | Docker Compose | One-command local setup with all dependencies wired and health-checked |

---

## Quick Start

```bash
git clone <repo-url>
cd ratify

cp backend/.env.example backend/.env

docker compose up --build
```

Then open:
- **Frontend**: http://localhost:4200
- **Swagger API Docs**: http://localhost:3000/api/docs

Sign in with any username and email address — no registration required.

---

## Architecture Decisions & Trade-offs

### Simplified Auth
The login endpoint accepts `{ username, email }` and returns a signed JWT — no user table, no password hashing. The JWT payload (`username`, `email`) is all that's needed to:
- Display the reviewer's name on reviews
- Enforce ownership (only the email that created a review can edit/delete it)

**In production** you would add: password hashing (bcrypt), a `users` table with unique email constraint, refresh tokens with rotation, and rate limiting on the login endpoint.

### Redis Caching Strategy
The product detail endpoint (`GET /products/:id`) calculates `AVG(rating)` and `COUNT(reviews)` and caches the result in Redis for 5 minutes (key: `product:{id}:rating`). The cache is invalidated immediately when:
- A new review is created for that product
- An existing review's rating is updated
- A review is deleted

This means the cache hit ratio is high for popular products while staying consistent after writes.

### Deployment: Docker Compose vs. Production
The `docker-compose.yml` is designed for **local development only**. In production:

- **Frontend** → built as static assets and deployed to a CDN (e.g., S3 + CloudFront). No Node.js server needed.
- **Backend** → containerized and deployed to a managed container platform (ECS, Railway, Render, Fly.io).
- **Database** → managed PostgreSQL (RDS, Neon, Supabase).
- **Cache** → managed Redis (ElastiCache, Upstash).

This separation enables independent deployments — a frontend change doesn't require rebuilding or redeploying the backend, and vice versa.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | — | Sign in with username + email, returns JWT |
| `GET` | `/products` | — | List products (pagination + category filter) |
| `GET` | `/products/:id` | — | Get product with aggregated rating (Redis cached) |
| `POST` | `/products` | JWT | Create a product |
| `GET` | `/products/:productId/reviews` | — | List reviews (pagination + sort) |
| `POST` | `/products/:productId/reviews` | JWT | Create a review |
| `PATCH` | `/reviews/:id` | JWT | Update own review |
| `DELETE` | `/reviews/:id` | JWT | Delete own review |

Full interactive documentation: **http://localhost:3000/api/docs**

---

## Project Structure

```
backend/
├── src/
│   ├── auth/           # JWT login endpoint + Passport strategy
│   ├── products/       # Products CRUD + Redis-cached ratings
│   ├── reviews/        # Reviews CRUD with ownership enforcement
│   ├── common/         # Shared guards, decorators, exception filter
│   ├── prisma/         # PrismaService (global)
│   └── redis/          # Redis provider (global, injection token)
├── prisma/
│   ├── schema.prisma   # Product + Review models
│   └── seed.ts         # 10 products + 6 sample reviews
└── Dockerfile

frontend/
├── src/app/
│   ├── core/           # Services (auth, products, reviews), interceptor, guard
│   ├── features/
│   │   ├── auth/       # Login page
│   │   └── products/   # Product list + product detail (with inline review form)
│   └── shared/         # StarRating, StarPicker, Pagination, Spinner, Alert
└── Dockerfile
```
