# CodeAlpha Social Media Platform — Task 2

[![CI](https://github.com/GlennHuckett82/CodeAlpha_Social-Media/actions/workflows/ci.yml/badge.svg)](https://github.com/GlennHuckett82/CodeAlpha_Social-Media/actions/workflows/ci.yml)

A full-stack social media platform built with **Express.js**, **MongoDB**, and **vanilla JavaScript** — no frontend frameworks, no bundlers. Features JWT authentication, a Twitter/X-style feed, post likes & comments, user profiles, a follow system, and a full CI pipeline.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JS ES modules · CSS3 custom properties · HTML5 |
| **Backend** | Node.js 20 · Express 4 · Mongoose 8 · express-validator |
| **Database** | MongoDB 8 (local dev) · mongodb-memory-server (tests) |
| **Security** | Helmet · CORS · express-rate-limit · bcryptjs · JWT (jsonwebtoken) |
| **Testing** | Jest 29 · Supertest · mongodb-memory-server |
| **DevOps** | GitHub Actions CI · ESLint (airbnb-base) · Prettier |

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20+ | `node --version` to confirm |
| npm | 9+ | bundled with Node 20 |
| MongoDB | 8+ | must be running locally for dev |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/GlennHuckett82/CodeAlpha_Social-Media.git
cd CodeAlpha_Social-Media

# 2. Install backend dependencies
cd backend && npm ci

# 3. Create your environment file
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET

# 4a. Start with seed data (5 users, 10 posts, likes, comments, follows)
npm run dev:seed
# → http://localhost:3001   login: alice / password123

# 4b. Or start without seeding
npm start
```

Open `frontend/index.html` via **VS Code Live Server** (port 5500) for hot-reload during development. The API runs on `http://localhost:3001`.

---

## Running Tests

```bash
cd backend
npm test              # run suite (no coverage)
npm run test:coverage # run suite + coverage report (≥ 80% threshold)
```

The test suite uses `mongodb-memory-server` — no real MongoDB required.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3001` | Express server port |
| `NODE_ENV` | No | `development` | `development` / `production` / `test` |
| `MONGO_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Secret for signing JWTs (min 32 chars) |
| `CORS_ORIGIN` | No | — | Comma-separated allowed origins |

---

## API Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register new user |
| `POST` | `/api/auth/login` | — | Login, returns JWT |
| `GET` | `/api/posts` | — | Paginated feed (`?page&limit`) |
| `POST` | `/api/posts` | ✓ | Create a post |
| `DELETE` | `/api/posts/:id` | ✓ | Delete own post |
| `POST` | `/api/posts/:id/like` | ✓ | Toggle like |
| `POST` | `/api/posts/:id/comments` | ✓ | Add comment |
| `DELETE` | `/api/posts/:id/comments/:cid` | ✓ | Delete own comment |
| `GET` | `/api/users/:username` | — | Get public profile |
| `PATCH` | `/api/users/me` | ✓ | Update own profile |
| `GET` | `/api/users/:username/posts` | — | User's posts (paginated) |
| `POST` | `/api/users/:username/follow` | ✓ | Toggle follow |
| `GET` | `/api/users/:username/followers` | — | List followers |
| `GET` | `/api/users/:username/following` | — | List following |
| `GET` | `/api/health` | — | Health check |

---

## Folder Structure

```
CodeAlpha_Social-Media/
├── backend/
│   ├── middleware/
│   │   ├── auth.js          # JWT protect middleware
│   │   └── errorHandler.js  # 404 + 500 handlers
│   ├── models/
│   │   ├── user.model.js    # User schema (followers, following, bio)
│   │   └── post.model.js    # Post schema (likes, embedded comments)
│   ├── routes/
│   │   ├── auth.js          # Register / login
│   │   ├── posts.js         # Feed, CRUD, likes, comments
│   │   └── users.js         # Profiles, follow system
│   ├── tests/               # Jest + Supertest test suite
│   ├── server.js            # Express app entry point
│   ├── server.e2e.js        # Dev seed script
│   └── .env.example
├── frontend/
│   ├── css/styles.css       # Dark design system (CSS custom properties)
│   ├── js/
│   │   ├── api.js           # Fetch wrapper + all API methods
│   │   ├── auth-guard.js    # requireAuth / requireGuest / session helpers
│   │   ├── config.js        # API base URL (dev vs production)
│   │   ├── feed.js          # Feed page logic
│   │   ├── header.js        # Sticky header + logout
│   │   ├── login.js         # Login page logic
│   │   ├── profile.js       # Profile page logic
│   │   └── register.js      # Register page logic
│   ├── index.html           # Feed page
│   ├── login.html           # Login page
│   ├── profile.html         # User profile page
│   └── register.html        # Register page
└── .github/workflows/ci.yml # Lint → test CI pipeline
```

---

## Features

- **Authentication** — JWT-based register/login; tokens stored in `localStorage`; `requireAuth` / `requireGuest` guards on every page
- **Feed** — Paginated post feed with compose form, character counter, optional image URL
- **Likes** — Toggle like/unlike with in-place count update (no page reload)
- **Comments** — Per-post collapsible comment section; add and delete own comments
- **Profiles** — Public profile pages showing bio, stats, and posts; edit own profile inline
- **Follow system** — Follow/unfollow any user; follower/following counts update in-place
- **Security** — Helmet headers, rate-limiting (100 req/15 min), CORS whitelist, input validation, XSS-safe (`textContent` only for user data)
- **Testing** — 51 tests, ≥ 80% branch coverage, in-memory MongoDB (no real DB for CI)
- **CI** — GitHub Actions: lint → test:coverage on every push
