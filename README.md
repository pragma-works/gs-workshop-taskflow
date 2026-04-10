# TaskFlow — Kanban Board API

A fully-featured Kanban board REST API built with **Express**, **Prisma**, and **SQLite**, implementing **clean architecture** with a repository + service layer and a React/Tailwind frontend.

---

## What was built

### Activity Feed (PM-5214)
The core workshop deliverable: every card move is persisted as an `ActivityEvent` in the same database transaction as the card update (no partial-write risk). The feed endpoint returns events in reverse-chronological order, with related data (actor name, card title, list names) loaded in a single Prisma `include` — no N+1 queries.

### Architecture
The backend follows a strict layered architecture:

```
src/
  repositories/   ← all Prisma calls live here (interfaces + implementations)
  services/       ← business logic; depends on repository interfaces
  middleware/     ← shared auth (JWT verification)
  routes/         ← thin HTTP controllers; depend on services via constructor injection
```

Dependencies flow inward: routes → services → repositories → Prisma. Nothing leaks across boundaries.

### Frontend (React + Tailwind CSS)
A Kanban board UI (`client/`) built with Vite + React + Tailwind CSS v4:
- **Login page** — JWT-based auth
- **Boards page** — list and create boards
- **Board view** — kanban columns with card move buttons
- **Activity feed sidebar** — live event log per board

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/users/register` | Register a new user |
| POST | `/users/login` | Authenticate and receive a JWT |
| GET | `/users/:id` | Get user profile |
| GET | `/boards` | List boards for authenticated user |
| GET | `/boards/:id` | Full board with lists, cards, comments, labels |
| POST | `/boards` | Create a board (requester becomes owner) |
| POST | `/boards/:id/members` | Add a member to a board |
| GET | `/boards/:id/activity` | Activity feed (authenticated board members) |
| GET | `/boards/:id/activity/preview` | Activity feed (no auth, for testing) |
| GET | `/cards/:id` | Get a card with comments and labels |
| POST | `/cards` | Create a card in a list |
| PATCH | `/cards/:id/move` | Move card atomically (updates card + creates ActivityEvent in one transaction) |
| POST | `/cards/:id/comments` | Add a comment to a card |
| DELETE | `/cards/:id` | Delete a card |

---

## Setup

```bash
npm install
cp .env.example .env
npm run db:push      # sync Prisma schema → SQLite
npm run db:seed      # seed with Alice, Bob, Carol + sample board
npm run dev          # API on http://localhost:3001
npm run dev:all      # API + React UI (http://localhost:5173)
npm test             # run Vitest test suite
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| HTTP | Express 4 |
| ORM | Prisma 5 (SQLite) |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Tests | Vitest + Supertest |
| Frontend | React 18 + Vite + Tailwind CSS v4 |

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./dev.db` | Prisma database path |
| `JWT_SECRET` | *(set in .env)* | JWT signing secret — **never hardcode** |
| `PORT` | `3001` | API server port |
