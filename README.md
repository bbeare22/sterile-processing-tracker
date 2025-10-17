# 🧼 Sterile Processing Tracker (SPT)

> **Reviewer Note:**  
> This project is fully deployed and ready for live testing.

**Frontend (React/Vite):**  
🔗 https://spt-front.onrender.com

**Backend (Express/MongoDB API):**  
🔗 https://spt-api-w5vi.onrender.com

When logged out, only the **Dashboard** is visible.  
To access **Machines**, **Maintenance**, **Cycles**, and **Detail** views, please register or log in.

---

## 🧭 Overview

A modern full-stack web app for tracking sterile processing equipment, maintenance, and sterilizer cycles (loads).  
Built with **React (Vite)**, **Express**, **MongoDB**, and **JWT authentication**.

---

## 🌐 Live Demo

| Service                          | URL                                                                    |
| -------------------------------- | ---------------------------------------------------------------------- |
| 🖥️ Frontend (React/Vite)         | [https://spt-front.onrender.com](https://spt-front.onrender.com)       |
| ⚙️ Backend (Express/MongoDB API) | [https://spt-api-w5vi.onrender.com](https://spt-api-w5vi.onrender.com) |

---

## 🚀 Features

### Machines

- Add / edit / delete washers, sterilizers, ultrasonics (auth required)
- Machine detail: recent maintenance & cycles (auth required)

### Maintenance

- Washer / Ultrasonic descale with daily & time-based tracking (auth required)
- Sterilizers: **Daily Inspection** and **Quarterly Cleaning** (auth required)
- Maintenance history view & export

### Sterilizer Cycles

- Log sterilizer loads, test types, and results (auth required)
- Track cycles by date, load type, and operator

### Dashboard

- KPIs for today’s sterilizer cycles & recent maintenance
- Real-time load tracking overview (public)

### Authentication

- Register / Login / Logout with JWT
- Protected routes for all critical data
- Session persistence via `localStorage` token

### UI/UX

- Toast notifications
- Reusable card layouts
- Loading skeletons
- Consistent CSS-based dashboard layout

---

## 🧱 Monorepo Layout

```
apps/
├─ server/     → Express API + MongoDB
└─ client/     → React client (Vite)
```

---

## 🧩 Run Locally

### 1. Install Dependencies (from root)

```bash
npm install
```

### 2. Copy `.env.example` → `.env` and update values

Example for local development:

```bash
# apps/server/.env
PORT=3001
CLIENT_URL=http://localhost:5173
MONGO_URL=mongodb://localhost:27017/spt
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

```bash
# apps/client/.env
VITE_API_URL=http://localhost:3001
```

### 3. (Optional) Seed Demo Data

```bash
node apps/server/scripts/seed.js
```

### 4. Start Both Servers (two terminals)

```bash
# Terminal 1: Express API
npm run dev:server   # Runs on http://localhost:3001

# Terminal 2: React client
npm run dev:web      # Runs on http://localhost:5173
```

---

## 🏗️ Build for Production

```bash
# Build web client
npm run build:web

# Start Express API (after build)
npm run start:server
```

---

## 🧰 Useful Scripts

| Command        | Description                     |
| -------------- | ------------------------------- |
| `dev:server`   | Run Express API with nodemon    |
| `dev:web`      | Start Vite dev server           |
| `build:web`    | Build production-ready client   |
| `start:server` | Run API in production mode      |
| `seed`         | Populate MongoDB with demo data |

---

## 🔑 API Overview

### **Auth**

| Method | Endpoint             | Description                                                                |
| ------ | -------------------- | -------------------------------------------------------------------------- |
| `POST` | `/api/auth/register` | Create new user _(email, password, name, employeeId, sterilizationNumber)_ |
| `POST` | `/api/auth/login`    | Authenticate existing user                                                 |
| `GET`  | `/api/auth/me`       | Fetch logged-in user profile (JWT required)                                |

### **Machines**

| Method   | Endpoint            | Description               |
| -------- | ------------------- | ------------------------- |
| `GET`    | `/api/machines`     | Get all machines          |
| `GET`    | `/api/machines/:id` | Get machine by ID         |
| `POST`   | `/api/machines`     | Create new machine (auth) |
| `PUT`    | `/api/machines/:id` | Update machine (auth)     |
| `DELETE` | `/api/machines/:id` | Delete machine (auth)     |

### **Maintenance**

| Method | Endpoint                            | Description               |
| ------ | ----------------------------------- | ------------------------- |
| `GET`  | `/api/maintenance?machineId=&date=` | Fetch maintenance records |
| `POST` | `/api/maintenance`                  | Log maintenance activity  |
| `GET`  | `/api/maintenance/history`          | Fetch maintenance history |

### **Cycles**

| Method   | Endpoint          | Description          |
| -------- | ----------------- | -------------------- |
| `GET`    | `/api/cycles`     | List cycles          |
| `POST`   | `/api/cycles`     | Log sterilizer cycle |
| `GET`    | `/api/cycles/:id` | Get cycle detail     |
| `DELETE` | `/api/cycles/:id` | Delete a cycle       |

> **Auth required:** All write operations.  
> **Header:** `Authorization: Bearer <token>`

---

## 🧿 Security & Validation

- Server-side validation with **Zod + Mongoose schemas**
- Endpoints protected by **JWT**
- CORS restricted to `CLIENT_URL`
- **Helmet** middleware enabled for HTTP security headers
- Sensitive config via `.env` (never committed)

---

## 🗃️ Database Indexes

| Collection      | Index                               |
| --------------- | ----------------------------------- |
| **Maintenance** | `{ machineId: 1, performedAt: -1 }` |
| **Cycles**      | `{ machineId: 1, startedAt: -1 }`   |

Indexes ensure efficient lookups by machine and date.

---

## 🧠 Usage Guide

1. **Login with demo user** _(or register a new account)_

   - Use seeded demo data or create your own.
   - When logged out, only the Dashboard is visible.

2. **Access Restricted Views**

   - Machines, Maintenance, Cycles, and Detail pages require login.

3. **Dashboard KPIs**

   - Today’s sterilizer cycles and recent maintenance appear in real-time.

4. **Machine Detail View**

   - Log or view maintenance and sterilizer cycles by machine.

5. **Cycle & Maintenance History**

   - Export reports via CSV from "View All…" pages.

6. **Reports & Recall Tracking**
   - Track historical loads and maintenance schedules with filters.

---

### ❤️ Made with care

Created to streamline and modernize sterile processing operations — from washer to sterilizer — with data-driven visibility.

---

### Dashboard

![Dashboard](screenshots/dashboard.jpg)

### Machines

![Machines](screenshots/machines.jpg)

### Machine Detail — Washer

![Machine Detail — Washer](screenshots/machine-detail-washer.jpg)

### Machine Detail — Sterilizer

![Machine Detail — Sterilizer](screenshots/machine-detail-sterilizer.jpg)

### Log Maintenance Form

![Log Maintenance](screenshots/log-maintenance.jpg)

### Log Cycle Form

![Log Cycle](screenshots/log-cycle.jpg)

### Maintenance History (with CSV export)

![Maintenance History](screenshots/maintenance-history.jpg)

### Cycles History (with CSV export)

![Cycles History](screenshots/cycles-history.jpg)

### Login

![Login](screenshots/login.jpg)

### Register

![Register](screenshots/register.jpg)
