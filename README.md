# TaskFlow API

> Scalable REST API with JWT Authentication & Role-Based Access Control  
> Backend Developer Intern Assignment — PrimeTrade.ai

---

## Features

| Category | Details |
|---|---|
| **Auth** | JWT access + refresh tokens, bcrypt hashing (cost=12), token rotation & revocation |
| **RBAC** | `user` and `admin` roles with route-level guards |
| **CRUD** | Full Tasks API with filters, pagination, and ownership checks |
| **Validation** | express-validator on every input; sanitized/normalized fields |
| **Security** | Helmet headers, CORS, rate limiting, payload size cap, input sanitization |
| **API Versioning** | All routes under `/api/v1/` |
| **Docs** | Swagger UI at `/api-docs` |
| **Database** | PostgreSQL with connection pooling, triggers, indexes |
| **Error Handling** | Global error handler, typed error responses, Postgres error mapping |
| **Deployment** | Docker + Docker Compose with health checks |

---

## Quick Start

### Option A — Docker Compose (Recommended)

```bash
# Clone and enter the project
git clone https://github.com/yourusername/taskflow-api.git
cd taskflow-api

# Start everything (Postgres + Redis + API)
docker compose up -d

# API is live at http://localhost:5000
# Swagger UI at http://localhost:5000/api-docs
```

### Option B — Local Development

**Prerequisites:** Node.js 18+, PostgreSQL 14+

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Postgres credentials

# 3. Initialize database
psql -U postgres -c "CREATE DATABASE taskflow_db;"
psql -U postgres -d taskflow_db -f schema.sql

# 4. Start dev server
npm run dev

# 5. Open the frontend
# Open frontend/index.html in your browser
# (or serve with: npx serve frontend)
```

---

## API Reference

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication
All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

---

### Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Register new user |
| POST | `/auth/login` | — | Login, get tokens |
| POST | `/auth/refresh` | — | Rotate access token |
| POST | `/auth/logout` | — | Revoke refresh token |
| POST | `/auth/logout-all` | ✓ | Revoke all sessions |
| GET  | `/auth/me` | ✓ | Get current profile |
| PUT  | `/auth/change-password` | ✓ | Change password |

**Register**
```json
POST /api/v1/auth/register
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Secret123"
}
```

**Login**
```json
POST /api/v1/auth/login
{
  "email": "admin@taskflow.dev",
  "password": "Admin@123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "Admin", "role": "admin" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### Task Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET    | `/tasks` | ✓ | any | List tasks (own or all for admin) |
| POST   | `/tasks` | ✓ | any | Create task |
| GET    | `/tasks/:id` | ✓ | owner/admin | Get task |
| PUT    | `/tasks/:id` | ✓ | owner/admin | Update task |
| DELETE | `/tasks/:id` | ✓ | owner/admin | Delete task |
| GET    | `/tasks/stats` | ✓ | admin | Task statistics |

**Query Parameters (GET /tasks)**
```
?page=1&limit=20&status=todo&priority=high
```

**Create Task**
```json
POST /api/v1/tasks
{
  "title": "Implement OAuth",
  "description": "Add Google OAuth support",
  "status": "todo",       // todo | in_progress | done
  "priority": "high",     // low | medium | high
  "due_date": "2025-12-31"
}
```

---

### User Endpoints (Admin Only)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET    | `/users` | admin | List all users |
| GET    | `/users/:id` | admin/self | Get user |
| PUT    | `/users/:id` | admin | Update user |
| DELETE | `/users/:id` | admin | Delete user |

---

## Database Schema

```sql
users
├── id          UUID PK
├── name        VARCHAR(100)
├── email       VARCHAR(255) UNIQUE
├── password    VARCHAR(255)   -- bcrypt hash
├── role        VARCHAR(20)    -- 'user' | 'admin'
├── is_active   BOOLEAN
├── created_at  TIMESTAMPTZ
└── updated_at  TIMESTAMPTZ    -- auto-updated by trigger

tasks
├── id          UUID PK
├── title       VARCHAR(255)
├── description TEXT
├── status      VARCHAR(20)    -- 'todo' | 'in_progress' | 'done'
├── priority    VARCHAR(10)    -- 'low' | 'medium' | 'high'
├── due_date    DATE
├── user_id     UUID FK → users.id
├── created_at  TIMESTAMPTZ
└── updated_at  TIMESTAMPTZ

refresh_tokens
├── id          UUID PK
├── token       TEXT UNIQUE
├── user_id     UUID FK → users.id
└── expires_at  TIMESTAMPTZ
```

---

## Security Practices

- **Password hashing**: bcrypt with cost factor 12
- **JWT**: Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)
- **Token rotation**: Refresh tokens are single-use and stored in DB for revocation
- **Rate limiting**: 10 req/15min on auth; 100 req/15min on API
- **Helmet**: Sets secure HTTP headers (XSS, HSTS, CSP, etc.)
- **Input validation**: express-validator on all inputs; email normalized, strings trimmed
- **Payload limit**: JSON body capped at 10 KB
- **User enumeration**: Generic "Invalid email or password" on login failure
- **RBAC**: Role checked server-side on every protected route
- **Ownership check**: Users can only mutate their own resources

---

## Project Structure

```
taskflow/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js      # Connection pool
│   │   │   └── swagger.js       # OpenAPI 3.0 spec
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── taskController.js
│   │   │   └── userController.js
│   │   ├── middleware/
│   │   │   ├── auth.js          # authenticate + authorize
│   │   │   ├── errorHandler.js  # 404 + global error
│   │   │   ├── rateLimiter.js   # In-memory rate limiter
│   │   │   └── validate.js      # express-validator runner
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   └── Task.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── tasks.js
│   │   │   └── users.js
│   │   ├── utils/
│   │   │   ├── jwt.js           # Token generation + verification
│   │   │   └── response.js      # Standardized responses
│   │   ├── app.js               # Express app (middleware + routes)
│   │   └── server.js            # Entry point
│   ├── schema.sql
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
├── frontend/
│   └── index.html               # Self-contained React SPA
└── docker-compose.yml
```

---

## Scalability Notes

### Current Design Choices for Scalability

**1. Stateless Authentication**  
JWT access tokens are verified without DB lookups (except on route middleware which loads fresh user). This allows horizontal scaling behind a load balancer — any instance can validate any token.

**2. Refresh Token Store (DB-backed)**  
Refresh tokens are persisted to Postgres, enabling centralized revocation. In a multi-instance deployment, all instances share the same token store.

**3. Connection Pooling**  
`pg.Pool` maintains up to 20 DB connections per instance, reducing connection overhead. In production, use PgBouncer as a pooler in front of Postgres.

**4. API Versioning**  
All routes are under `/api/v1/`. Future breaking changes ship as `/api/v2/` without disrupting existing clients.

### Path to Production Scale

| Concern | Solution |
|---|---|
| **Horizontal scaling** | Deploy N instances behind Nginx or an AWS ALB. Sessions are stateless (JWT). |
| **Rate limiting** | Replace in-memory limiter with Redis (e.g., `rate-limiter-flexible`) shared across all instances. |
| **Caching** | Cache read-heavy endpoints (`GET /tasks`, user profiles) in Redis with TTL invalidation on writes. |
| **Database** | Use read replicas for GET queries; primary for writes. Add connection pooler (PgBouncer). |
| **Microservices** | Auth Service, Task Service, Notification Service can split along domain boundaries. Communicate via message queue (RabbitMQ / Kafka) for async operations (e.g., due-date email reminders). |
| **Observability** | Add structured logging (Winston + JSON), distributed tracing (OpenTelemetry), metrics (Prometheus + Grafana). |
| **CI/CD** | GitHub Actions → lint → test → build Docker image → push to ECR → deploy to ECS/K8s. |

---

## Default Admin

```
Email:    admin@taskflow.dev
Password: Admin@123
```

> Change this immediately in any real deployment.

---

## License

MIT
