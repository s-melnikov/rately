# Product Reviews System — Claude Code Instructions

## Project Overview

Build a full-stack product review system with:
- **Backend**: NestJS + PostgreSQL + Redis + Prisma ORM
- **Frontend**: Angular 17+ (standalone components)
- **Auth**: Simplified JWT — no registration, no password, no user DB table
- **Infrastructure**: Docker Compose for one-command local setup

---

## Monorepo Structure

```
backend/
├── src/
│   ├── auth/
│   ├── products/
│   ├── reviews/
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   └── interceptors/
│   ├── prisma/
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── test/
├── .env.example
├── Dockerfile
└── package.json
frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── services/
│   │   │   ├── guards/
│   │   │   └── interceptors/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   └── reviews/
│   │   ├── shared/
│   │   │   └── components/
│   │   └── app.routes.ts
│   └── environments/
├── Dockerfile
└── package.json
docker-compose.yml
docker-compose.dev.yml
README.md
```

---

## Phase 1 — Project Scaffolding

### 1.1 Scaffold NestJS backend

```bash
npx @nestjs/cli new backend --package-manager npm --skip-git
cd backend
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @prisma/client ioredis
npm install -D prisma @types/passport-jwt
npx prisma init
```

### 1.2 Scaffold Angular frontend

```bash
cd ..
npx @angular/cli new frontend --routing --style=scss --standalone --skip-git
cd frontend
npm install
```

---

## Phase 2 — Database Schema (Prisma)

File: `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id          String   @id @default(uuid())
  name        String
  description String
  imageUrl    String?
  category    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  reviews     Review[]

  @@map("products")
}

model Review {
  id        String   @id @default(uuid())
  rating    Int      // 1-5
  title     String
  body      String
  username  String
  email     String
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("reviews")
}
```

Run migrations:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## Phase 3 — Backend Implementation

### 3.1 Environment variables

File: `backend/.env.example`
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reviews_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=supersecretkey_change_in_production
JWT_EXPIRES_IN=7d
PORT=3000
```

### 3.2 Auth Module

**Purpose**: Accept `{ username, email }`, return signed JWT. No user stored in DB.

`src/auth/dto/login.dto.ts`:
```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(2)
  username: string;

  @IsEmail()
  email: string;
}
```

`src/auth/auth.service.ts`:
```typescript
@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  login(dto: LoginDto): { accessToken: string } {
    const payload = { username: dto.username, email: dto.email };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
```

`src/auth/auth.controller.ts`:
```typescript
@Controller('auth')
export class AuthController {
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
```

`src/auth/strategies/jwt.strategy.ts`:
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  validate(payload: { username: string; email: string }) {
    return payload; // attached to request.user
  }
}
```

`src/common/guards/jwt-auth.guard.ts`:
```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`src/common/decorators/current-user.decorator.ts`:
```typescript
export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
```

### 3.3 Products Module

**Endpoints**:
- `GET /products` — list with pagination + filter by category
- `GET /products/:id` — single product with aggregated rating (cached in Redis)
- `POST /products` — create (protected, JWT required)

`src/products/dto/create-product.dto.ts`:
```typescript
export class CreateProductDto {
  @IsString() @MinLength(2) name: string;
  @IsString() @MinLength(10) description: string;
  @IsOptional() @IsUrl() imageUrl?: string;
  @IsString() category: string;
}
```

`src/products/dto/product-query.dto.ts`:
```typescript
export class ProductQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number = 10;
}
```

`src/products/products.service.ts` — key methods:
```typescript
async findAll(query: ProductQueryDto) {
  const { category, page, limit } = query;
  const skip = (page - 1) * limit;
  const where = category ? { category } : {};

  const [items, total] = await Promise.all([
    this.prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    this.prisma.product.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async findOne(id: string) {
  const cacheKey = `product:${id}:rating`;
  const cached = await this.redis.get(cacheKey);

  let avgRating: number | null = null;

  if (cached) {
    avgRating = parseFloat(cached);
  } else {
    const result = await this.prisma.review.aggregate({
      where: { productId: id },
      _avg: { rating: true },
      _count: true,
    });
    avgRating = result._avg.rating;
    if (avgRating !== null) {
      await this.redis.set(cacheKey, avgRating.toString(), 'EX', 300); // 5 min TTL
    }
  }

  const product = await this.prisma.product.findUniqueOrThrow({ where: { id } });
  return { ...product, avgRating, reviewCount: ... };
}
```

**Cache invalidation**: after new review created — `del product:{productId}:rating`

### 3.4 Reviews Module

**Endpoints**:
- `GET /products/:productId/reviews` — list with pagination + sort (newest/highest/lowest)
- `POST /products/:productId/reviews` — create review (JWT required)
- `PATCH /reviews/:id` — update own review (JWT, only own email)
- `DELETE /reviews/:id` — delete own review (JWT, only own email)

`src/reviews/dto/create-review.dto.ts`:
```typescript
export class CreateReviewDto {
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsString() @MinLength(3) @MaxLength(100) title: string;
  @IsString() @MinLength(10) @MaxLength(2000) body: string;
}
```

`src/reviews/dto/review-query.dto.ts`:
```typescript
export class ReviewQueryDto {
  @IsOptional() @IsEnum(['newest', 'highest', 'lowest']) sort?: string = 'newest';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number = 10;
}
```

**Ownership check** in service:
```typescript
async remove(id: string, userEmail: string) {
  const review = await this.prisma.review.findUniqueOrThrow({ where: { id } });
  if (review.email !== userEmail) throw new ForbiddenException();
  await this.prisma.review.delete({ where: { id } });
  await this.redis.del(`product:${review.productId}:rating`); // invalidate cache
}
```

### 3.5 Global Setup in main.ts

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: 'http://localhost:4200' });

  const config = new DocumentBuilder()
    .setTitle('Product Reviews API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 3000);
}
```

### 3.6 Global Exception Filter

`src/common/filters/http-exception.filter.ts`:
```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    response.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 3.7 Seed Script

`backend/prisma/seed.ts` — seed 10 products across 3-4 categories with realistic names/descriptions.

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

---

## Phase 4 — Frontend Implementation (Angular)

### 4.1 Core Services

`src/app/core/services/auth.service.ts`:
- `login(username, email)` → POST /auth/login → store JWT in localStorage
- `logout()` → clear storage
- `isLoggedIn()` → check token expiry via `jwt-decode`
- `currentUser()` → decode token, return `{ username, email }`

`src/app/core/interceptors/auth.interceptor.ts`:
- Attach `Authorization: Bearer <token>` to every outgoing request automatically

`src/app/core/guards/auth.guard.ts`:
- Protect routes that require login (write review)

### 4.2 Features

**Auth feature** (`/login`):
- Simple form: username + email fields
- On submit → `authService.login()` → redirect to products list
- If already logged in → redirect away

**Products feature**:
- `/products` — grid of product cards with name, category, avg rating (stars), review count
  - Filter by category (dropdown)
  - Pagination
- `/products/:id` — product detail page
  - Product info + aggregate rating display (stars + number)
  - Reviews list with sort (newest/highest/lowest)
  - Paginated reviews
  - "Write a Review" button (visible only when logged in)

**Reviews feature**:
- Inline review form on product detail page (appears when logged in)
  - Star rating picker (click to set 1-5)
  - Title + body fields
  - Submit → optimistic update or refetch
- Own reviews show Edit/Delete buttons (match by email from JWT)

### 4.3 Shared Components

- `StarRatingComponent` — display-only stars (accepts `rating: number`, `maxStars: 5`)
- `StarPickerComponent` — interactive star input for the review form
- `PaginationComponent` — prev/next + page numbers
- `LoadingSpinnerComponent`
- `AlertComponent` — success/error messages

### 4.4 Angular project structure

Use **standalone components** throughout (Angular 17+ style). No NgModules.

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/login.component') },
  { path: 'products', loadComponent: () => import('./features/products/product-list.component') },
  { path: 'products/:id', loadComponent: () => import('./features/products/product-detail.component') },
];
```

Use `HttpClient` with `inject()` in services (functional style).

---

## Phase 5 — Docker Setup

### docker-compose.yml (production-like)

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: reviews_db
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build: ./backend
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/reviews_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: supersecretkey_change_in_production
      JWT_EXPIRES_IN: 7d
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: sh -c "npx prisma migrate deploy && npx prisma db seed && node dist/main"

  frontend:
    build: ./frontend
    ports:
      - '4200:80'
    depends_on:
      - backend

volumes:
  postgres_data:
```

### backend/Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

### frontend/Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

`frontend/nginx.conf`:
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
  location /api {
    proxy_pass http://backend:3000;
  }
}
```

---

## Phase 6 — README.md

Write a README with these sections:

1. **Overview** — what the system does
2. **Tech Stack** — with brief justification for each choice
3. **Quick Start** (3 commands):
   ```bash
   git clone ...
   cp backend/.env.example backend/.env
   docker compose up --build
   ```
   Then open `http://localhost:4200` and `http://localhost:3000/api/docs`
4. **Architecture Decisions & Trade-offs**:
   - Why NestJS (modular, decorators, built-in DI, first-class TypeScript)
   - Why PostgreSQL (relational data, ACID, perfect for structured reviews)
   - Why Redis (cache hot aggregated ratings, avoid N recalculations per second)
   - Why Prisma (type-safe queries, migrations, great DX)
   - Auth trade-off: simplified JWT without password — explain production alternative
   - Deployment note: Docker Compose is for local dev only. In production, frontend would deploy independently to CDN (S3 + CloudFront), backend as container to ECS/Railway — enabling independent deployments without rebuilding the other service
5. **CI/CD** — explain what the GitHub Actions pipeline does (lint → test → docker build)
6. **API Endpoints** — table with method, path, auth required, description
7. **Project Structure** — brief explanation of folder layout

---

## Coding Standards (ENFORCE THESE)

- **TypeScript strict mode** everywhere — no `any`
- **DTOs with class-validator** for all input — never trust raw request body
- **Prisma** for all DB access — no raw SQL
- **Repository pattern** is handled by Prisma service — keep services thin
- **Services** contain business logic only — no HTTP concerns
- **Controllers** handle HTTP only — no business logic
- **Redis** used only for caching aggregated data — not session storage
- **Environment variables** via `@nestjs/config` — never hardcode secrets
- **Error handling** — use NestJS built-in exceptions (`NotFoundException`, `ForbiddenException`, etc.)
- **Swagger decorators** on all controller methods (`@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`)
- **Commit messages** — conventional commits format: `feat:`, `fix:`, `chore:`, `docs:`

---

## Commit Message Guide

Make commits after each logical unit of work:

```
chore: init monorepo structure
chore: scaffold NestJS backend and Angular frontend
chore: add docker-compose with postgres and redis
feat: add prisma schema and initial migration
feat: implement auth module with JWT login
feat: implement products module with pagination
feat: implement reviews module with ownership check
feat: add redis caching for product ratings
feat: implement Angular auth service and interceptor
feat: implement product list page with filters
feat: implement product detail page with reviews
feat: add star rating components
chore: add dockerfiles for backend and frontend
docs: write README with architecture decisions
```

---

## Quality Checklist Before Submitting

- [ ] `docker compose up --build` works from scratch
- [ ] Swagger UI accessible at `http://localhost:3000/api/docs`
- [ ] All endpoints documented in Swagger
- [ ] Seed data present after startup
- [ ] JWT auth works end-to-end
- [ ] Redis caching verified (check logs or Redis CLI)
- [ ] Edit/Delete only works on own reviews
- [ ] Pagination works on both products and reviews
- [ ] README explains all trade-offs clearly
- [ ] Deployment trade-off (Docker Compose vs independent deploys) explained in README
- [ ] No `any` types in TypeScript
- [ ] Conventional commit messages throughout