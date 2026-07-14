<div align="center">

<img src="https://res.cloudinary.com/dmkoxabbt/image/upload/v1766757687/linkedinbannerim_1_ghq9pt.png" alt="Unideals banner" />

# Unideals

**A full-stack student marketplace for buying, selling, and discovering products within a campus community.**

<p>
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-0F172A?style=flat-square&logo=tailwind-css&logoColor=38BDF8" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-1F2937?style=flat-square&logo=mongodb&logoColor=4DB33D" alt="MongoDB" />
  <img src="https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" alt="JWT" />
</p>
<p>
  <img src="https://img.shields.io/badge/License-ISC-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/Status-Active-success?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/Node-%3E%3D18.0.0-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node version" />
</p>

</div>

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [System Architecture](#system-architecture)
- [API Reference](#api-reference)
- [Frontend Routes](#frontend-routes)
- [Configuration](#configuration)
- [Getting Started](#getting-started)
- [Security](#security)
- [License](#license)

---

## Overview

Unideals connects students in a campus marketplace. Users can register, verify their email, list products, browse and search listings, save favourites, manage addresses, report listings or users, and boost product visibility based on subscription tier.

**Highlights**

| Area | Description |
|---|---|
| Authentication | JWT access tokens with HttpOnly refresh cookies, email verification, password reset, and Google OAuth2 |
| Product lifecycle | Multi-step listing flow, drafts, search, category/price/condition filters, unlist/relist, soft delete, and boosted listings |
| Wishlist & addresses | Save favourite products and manage delivery/meetup addresses |
| Reporting | Flag inappropriate products or users |
| Media | Signed ImageKit upload tokens on the backend; client-side image upload and compression |
| Admin console | Separate admin authentication and moderation endpoints for users and products |
| Security | Helmet, CORS, XSS filtering, NoSQL injection guards, and rate limiting on product creation |

---

## Tech Stack

**Frontend**

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Dev server and production bundler |
| React Router v7 | Client-side routing with protected layouts |
| Axios | HTTP client with auth interceptors and token refresh |
| Tailwind CSS | Utility-first styling |
| ImageKit JS SDK | Client-side image uploads |
| EmailJS | Contact form email delivery |
| Framer Motion, Swiper, Radix UI | Animations, carousels, and dialogs |

**Backend**

| Technology | Purpose |
|---|---|
| Express.js 5 | REST API server |
| MongoDB + Mongoose | Document database and ODM |
| JWT + refresh tokens | Cookie-based session authentication |
| Zod | Request body validation |
| Resend | Transactional email (verification, password reset) |
| ImageKit | Image storage, delivery, and server-side deletion |
| Google OAuth2 | Social sign-in |
| node-cron | Scheduled jobs (boost expiry, deleted product cleanup) |
| bcrypt | Password hashing |

---

## Project Structure

```
Unideals/
├── frontend/                    React + Vite client
│   ├── src/
│   │   ├── app/                 App entry, routes
│   │   ├── features/            Feature modules
│   │   │   ├── auth/            Login, signup, password reset, Google OAuth
│   │   │   ├── product/         Home, listing, product detail, categories
│   │   │   ├── user/            Profile, settings, wishlist, contact
│   │   │   ├── search/          Search results and dropdown suggestions
│   │   │   ├── chat/            Chat page UI
│   │   │   ├── notification/    Notifications page UI
│   │   │   └── legal/           Privacy policy
│   │   ├── Components/          Shared layout and UI components
│   │   ├── Layouts/             MainLayout, ProtectedLayout
│   │   ├── context/             User, theme, and wishlist state
│   │   ├── services/            Axios instance and auth interceptor
│   │   ├── styles/               Global CSS
│   │   └── utils/                Image upload helpers
│   └── public/
│
├── backend/                     Express + MongoDB API
│   ├── src/
│   │   ├── config/               DB, constants, email, boost plans
│   │   ├── controllers/          Route handlers
│   │   ├── models/                Mongoose schemas
│   │   ├── routes/                API route definitions
│   │   ├── middlewares/           Auth, roles, validation, errors
│   │   ├── services/              Business logic
│   │   ├── validations/           Zod schemas
│   │   ├── jobs/                   Cron jobs
│   │   └── utils/                  Tokens, ImageKit, email templates
│   └── server.js
│
└── README.md
```

---

## System Architecture

```mermaid
flowchart TB
    subgraph Client ["Frontend — React + Vite"]
        UI[Pages & Components]
        Axios[Axios HTTP Client]
        UserCtx[User Context]
    end

    subgraph Server ["Backend — Express API"]
        Router[API Router]
        MW["Middlewares
Helmet · CORS · XSS · NoSQL Guard"]
        Controllers[Controllers]
        Services[Service Layer]
        Jobs["Cron Jobs
Boost Expiry · Product Cleanup"]
    end

    subgraph Data ["Data & Media"]
        MongoDB[(MongoDB
Mongoose ODM)]
        ImageKit[ImageKit
Media Storage & CDN]
    end

    subgraph External ["External Services"]
        JWT[JWT + Refresh Tokens]
        Google[Google OAuth2]
        Resend[Resend
Email Service]
        EmailJS[EmailJS
Contact Form]
    end

    UI --> Axios
    Axios -->|HTTPS + HttpOnly Cookies| Router
    Router --> MW --> Controllers --> Services
    Services --> MongoDB
    Services --> ImageKit
    Services --> Resend
    Jobs --> MongoDB
    UserCtx --> Google
    UserCtx --> JWT
    UI --> ImageKit
    UI --> EmailJS
```

---

## API Reference

All routes are prefixed with the base URL configured via `VITE_API_BASE_URL`.

### Auth — `/api/auth`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/register` | Create new account | Public |
| POST | `/login` | Local login | Public |
| GET | `/logoutUser` | Clear auth cookies and invalidate refresh token | Public |
| POST | `/refresh-token` | Rotate access token using refresh cookie | Public |
| POST | `/verify-email` | Verify email address | Public |
| GET | `/check-verification` | Check email verification status | Public |
| POST | `/resend-verification` | Resend verification email | Public |
| POST | `/forgot-password` | Send password reset email | Public |
| GET | `/reset-password/:token` | Validate reset token before form submit | Public |
| POST | `/reset-password/:token` | Reset user password | Public |
| GET | `/google` | Initiate Google OAuth redirect | Public |
| GET | `/google/callback` | OAuth callback handler | Public |
| POST | `/google/exchange` | Exchange OAuth code for session | Public |

### User — `/api/user` (Protected)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/userProfile` | Get authenticated user profile |
| PUT | `/updateProfile` | Update profile details |
| DELETE | `/deleteAccount` | Delete user account |

### Product — `/api/product`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/` | List products (`page`, `limit`, `search`, `category`, `condition`, `min_price`, `max_price`, `sort`) | Public |
| GET | `/boosted` | List currently boosted products | Public |
| GET | `/search` | Full-text product search (`q`) | Public |
| GET | `/search-suggestions` | Autocomplete suggestions (`q`, min 2 chars) | Public |
| GET | `/:id` | Get product by ID | Public |
| POST | `/` | Create product listing or draft | Protected |
| DELETE | `/:id` | Soft-delete a listing | Protected |
| PATCH | `/:id/unlist` | Unlist a product | Protected |
| PATCH | `/:id/relist` | Relist a product | Protected |
| GET | `/user/my-products` | Get current user's listed products | Protected |
| GET | `/user/drafts` | Get current user's draft products | Protected |

### Wishlist — `/api/wishlist` (Protected)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get user's wishlist |
| POST | `/add` | Add product to wishlist |
| POST | `/remove` | Remove product from wishlist |
| POST | `/toggle` | Toggle wishlist state |
| GET | `/check/:productId` | Check if product is in wishlist |

### Address — `/api/address` (Protected)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Create address |
| GET | `/` | List user addresses |
| GET | `/:addressId` | Get address by ID |
| PUT | `/:addressId` | Update address |
| DELETE | `/:addressId` | Delete address |
| PATCH | `/:addressId/default` | Set default address |

### Report — `/api/report` (Protected)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/product/:productId` | Report a product |
| POST | `/user/:userId` | Report a user |

### Boost — `/api/boost` (Protected)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/me/summary` | Get current user's boost usage summary |
| POST | `/products/:productId` | Boost a product listing |

### ImageKit — `/api/imagekit` (Protected)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/auth` | Get signed upload parameters |

### Admin — `/api/admin`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/auth/login` | Admin login | Public |
| POST | `/auth/refresh-token` | Refresh admin session | Public |
| GET | `/auth/me` | Get current admin user | Admin / Support |
| POST | `/auth/logout` | Admin logout | Admin / Support |
| GET | `/users` | List users | Admin / Support |
| PATCH | `/users/:id/status` | Update user status | Admin / Support |
| GET | `/products` | List products for moderation | Admin / Support |
| PATCH | `/products/:id/status` | Update product status | Admin / Support |
| PATCH | `/products/:id/soft-delete` | Soft-delete a product | Admin / Support |
| DELETE | `/products/:id` | Hard-delete a product | Admin / Support |

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Server health check |

---

## Frontend Routes

**Auth (no header)**

```
/login                     Sign in
/signup                    Create account
/forgot-password           Request password reset
/reset-password/:token     Set new password
/verify-email              Email verification
/checkEmail                Post-signup email confirmation prompt
```

**Public (with header)**

```
/                          Home / product feed
/search                    Search results
/product/:id               Product detail page
/category/:categoryName    Category browser (includes boosted products)
/price                     Price range filter view
/termscondition            Terms & conditions
/privacy-policy            Privacy policy
```

**Protected (with header)**

```
/profile                   User profile overview
/settings                  Account settings
/subscription              Subscription plans
/wishlist                  Saved listings
/myorders                  Order history
/chat                      Messaging
/notification              Activity notifications
/upload                    Create a new listing (multi-step)
/productlisted             Post-listing confirmation
/contact                   Contact support
```

Legacy redirects: `/profileoverview` → `/profile`, `/setting` → `/settings`.

---

## Configuration

Both services are configured via environment variables. Copy `.env.sample` to `.env` in each directory and populate the values before running the app. **Never commit `.env` files.**

**Backend (`backend/.env`)**

| Variable | Description |
|---|---|
| `PORT` | API server port |
| `NODE_ENV` | Runtime environment |
| `FRONTEND_URL` | Allowed origin for the main client |
| `ADMIN_FRONTEND_URL` | Allowed origin for the admin client |
| `MONGO_URL` | MongoDB connection string |
| `SECRET_KEY_ACCESS_TOKEN` | JWT access token signing secret |
| `SECRET_KEY_REFRESH_TOKEN` | JWT refresh token signing secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth2 credentials |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |
| `IMAGEKIT_PUBLIC_KEY` / `IMAGEKIT_PRIVATE_KEY` / `IMAGEKIT_URL_ENDPOINT` | ImageKit credentials |
| `RESEND_API_KEY` | Transactional email provider key |

**Frontend (`frontend/.env`)**

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_IMAGEKIT_PUBLIC_KEY` / `VITE_IMAGEKIT_URL_ENDPOINT` | ImageKit client config |
| `VITE_EMAILJS_SERVICE_ID` / `VITE_EMAILJS_TEMPLATE_ID` / `VITE_EMAILJS_PUBLIC_KEY` | EmailJS contact form config |
| `VITE_SUPPORT_EMAIL` | Support contact address |

---

## Getting Started

**Prerequisites:** Node.js ≥ 18, npm ≥ 9, a MongoDB instance, and accounts for ImageKit, Resend, Google Cloud Console, and EmailJS.

```bash
# 1. Clone
git clone https://github.com/Imaginum-org/Unideals.git
cd Unideals

# 2. Backend
cd backend
cp .env.sample .env        # fill in your values
npm install
npm run dev                # http://localhost:5000

# 3. Frontend
cd ../frontend
cp .env.sample .env        # fill in your values
npm install
npm run dev                # http://localhost:5173
```

Verify the API is running at `http://localhost:5000/health`.

---

## Security

| Layer | Implementation |
|---|---|
| Transport | CORS restricted to configured frontend and admin origins |
| Authentication | Short-lived JWT access tokens in cookies or Bearer header; HttpOnly refresh token cookies |
| Authorization | Auth middleware on protected routes; role middleware for admin endpoints |
| Input validation | Zod schemas on all validated request bodies |
| XSS protection | Sanitization on string body and route params |
| NoSQL injection | Request body/param key sanitization against `$` and `.` operators |
| Rate limiting | Per-IP throttling on product creation (5 requests/minute) |
| HTTP hardening | Helmet secure response headers |
| Media | Signed ImageKit upload tokens; private keys kept server-side only |

---

## License

Distributed under the **ISC License**. See `package.json` in `backend/` and `frontend/`.

<div align="center">

<br/>

Built by **[Team Imaginum](https://imaginumorg.vercel.app/)**

</div>