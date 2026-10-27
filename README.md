# CBIT Lost & Found Portal

A web application designed for students, faculty, and staff of **Chaitanya Bharathi Institute of Technology (CBIT)** to report, track, and recover lost and found belongings across the campus.

---

## 1. Problem Statement and Objectives

Items such as ID cards, calculators, books, lab records, wallets, and electronic accessories are frequently misplaced or found across campus buildings, laboratories, sports grounds, and canteens. Without a centralized tracking system, reclaiming lost belongings depends on word-of-mouth or fragmented notice boards.

The **CBIT Lost & Found Portal** provides:
- A centralized campus platform for reporting both lost and found belongings.
- Real-time cataloging with category filtering, keyword searching, and status tracking (`active` vs. `resolved`).
- Direct integration between a modern React 19 frontend and a secure Express.js + MongoDB backend.
- Structured data persistence with image support and ownership-based authorization.

---

## 2. Main Features

- **Dashboard & Campus Analytics**:
  - Dynamic metrics computed directly from MongoDB: Lost Reports, Found Reports, Resolved Cases, and Total Reports.
  - Category breakdown and monthly report distribution charts.
  - Recent reports table with thumbnail previews, location, date, and status badges.
- **Lost & Found Listings**:
  - Dedicated pages for lost items (`/lost-items`) and found items (`/found-items`).
  - Search filtering by item name, description, and campus location.
  - Category filtering (`Electronics`, `Documents`, `Books`, `Accessories`, `Others`).
- **Validated Item Reporting (`/report`)**:
  - Toggle between Lost Item and Found Item reporting modes.
  - Conditional validation: Student Roll Number is mandatory for lost item reports.
  - Contact number validation enforcing 10-digit Indian mobile formats (`^[6-9]\d{9}$`).
  - Standard RFC 5322-compliant email syntax validation.
  - File upload with instant client preview and backend disk storage.
- **RESTful Backend API**:
  - Express.js backend with Mongoose ODM and MongoDB.
  - JWT-based authentication supporting both authenticated users and guest campus reports.
  - Centralized error handling, request validation via Zod schemas, and security headers via Helmet.
  - Dedicated on-disk image storage outside MongoDB to prevent document bloat.

---

## 3. Technology Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) (Functional Components, Hooks)
- **Routing**: [React Router DOM v7](https://reactrouter.com/) (Single Page Application)
- **Styling**: [Bootstrap 5.3](https://getbootstrap.com/) + Custom CSS (`App.css`)
- **Build Tool**: [Vite 8](https://vitejs.dev/) with `@vitejs/plugin-react`
- **Language**: JavaScript (ES6+ / JSX)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (v18+ / v24 LTS recommended)
- **Framework**: [Express.js](https://expressjs.com/) v4
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) v8 ODM
- **Authentication**: JSON Web Tokens ([jsonwebtoken](https://github.com/auth0/node-jsonwebtoken))
- **Validation**: [Zod](https://zod.dev/)
- **File Uploads**: [Multer](https://github.com/expressjs/multer) (disk storage in `backend/uploads/`)
- **Security**: [Helmet](https://helmetjs.github.io/) & [CORS](https://github.com/expressjs/cors)
- **Testing**: Node.js native test runner (`node:test`, `node:assert`) and [Supertest](https://github.com/ladjs/supertest)

---

## 4. Architecture Overview

```text
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│            (Vite Dev Server / Port 5173)               │
│                                                        │
│  [Dashboard]   [Lost Items]   [Found Items]   [Report] │
└───────────────────────────┬────────────────────────────┘
                            │
               HTTP / REST API Requests
             (via Vite Proxy or Port 5000)
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Express.js Backend                    │
│                   (Node.js / Port 5000)                │
│                                                        │
│  Middleware: Helmet, CORS, Morgan, Zod, Auth (JWT)     │
│  Controllers: Health, Items, Stats, Upload             │
│  Storage Service: Static uploads to /uploads on disk   │
└───────────────────────────┬────────────────────────────┘
                            │
                      Mongoose ODM
                            │
┌───────────────────────────▼────────────────────────────┐
│                     MongoDB Database                   │
│         (Local 127.0.0.1:27017 or MongoDB Atlas)       │
│                                                        │
│  Collection: items (id, type, itemName, category, etc.)│
└────────────────────────────────────────────────────────┘
```

---

## 5. Repository Directory Tree

```text
CBIT_lost_found/
├── backend/
│   ├── scripts/
│   │   └── seed.js             # Idempotent MongoDB database initialization script
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js     # Mongoose connection, disconnection & ping probe
│   │   │   └── env.js          # Centralized environment variable validation
│   │   ├── controllers/
│   │   │   ├── healthController.js # Health check with live MongoDB ping
│   │   │   ├── itemController.js   # Items CRUD and pagination handlers
│   │   │   ├── statsController.js  # Dashboard aggregation metrics handler
│   │   │   └── uploadController.js # File upload controller
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT token signing, requireAuth & optionalAuth guards
│   │   │   ├── errorHandler.js # Centralized error handler & Mongoose error mapper
│   │   │   ├── upload.js       # Multer memory storage (JPG/PNG/WebP; SVG blocked)
│   │   │   └── validator.js    # Zod request body/query schemas & regex validators
│   │   ├── models/
│   │   │   └── Item.js         # Mongoose schema, validation hooks & compound indexes
│   │   ├── routes/
│   │   │   ├── healthRoutes.js # /api/health
│   │   │   ├── itemRoutes.js   # /api/items
│   │   │   ├── statsRoutes.js  # /api/stats
│   │   │   ├── uploadRoutes.js # /api/upload
│   │   │   └── index.js        # Combined Express API router
│   │   ├── services/
│   │   │   ├── itemService.js  # MongoDB database operations & business logic
│   │   │   └── storageService.js # Dedicated disk storage for uploaded media
│   │   ├── app.js              # Express app setup, static routes, CORS, Helmet
│   │   └── server.js           # Server listener & graceful shutdown handlers
│   ├── tests/
│   │   ├── auth.test.js        # Unit tests for JWT authentication and authorization
│   │   ├── items.test.js       # Integration tests for validation, filtering, pagination
│   │   └── mongodb.live.test.js # Live integration tests against running MongoDB
│   ├── uploads/                # Dedicated local disk directory for uploaded images
│   ├── .env.example            # Backend environment template
│   ├── .gitignore              # Backend ignore rules
│   ├── package.json            # Backend scripts and dependencies
│   └── README.md               # Backend-specific documentation
├── public/
│   ├── data/
│   │   └── items.json          # Seed dataset with 20 campus mock reports
│   └── images/                 # Default campus product images and assets
├── src/
│   ├── components/
│   │   ├── Footer.jsx          # Branded footer component
│   │   ├── ItemCard.jsx        # Item card rendering item details & image
│   │   ├── Navbar.jsx          # Top navigation bar with CBIT branding
│   │   ├── SearchBar.jsx       # Keyword search & category filter dropdown
│   │   └── StatCard.jsx        # Summary metric card
│   ├── pages/
│   │   ├── Dashboard.jsx       # Analytics dashboard & recent reports
│   │   ├── FoundItems.jsx      # Found items listing & filtering
│   │   ├── LostItems.jsx       # Lost items listing & filtering
│   │   └── ReportItem.jsx      # Item submission form with validation
│   ├── services/
│   │   └── api.js              # Centralized API configuration & getImageUrl helper
│   ├── App.css                 # Custom styles and responsive layouts
│   ├── App.jsx                 # Route definitions
│   └── main.jsx                # React root mount
├── index.html                  # HTML entry point
├── vite.config.js              # Vite configuration with dev proxy
├── package.json                # Frontend scripts and dependencies
├── package-lock.json           # Locked dependency versions
├── .gitignore                  # Git ignore rules
└── README.md                   # Project documentation
```

---

## 6. Prerequisites

- **Node.js**: v18.0.0 or higher (v24 LTS recommended)
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance running on `127.0.0.1:27017` or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cloud connection string.

---

## 7. Installation Instructions

Clone the repository and install dependencies for both the frontend and backend:

### PowerShell (Windows)
```powershell
# 1. Clone repository
git clone https://github.com/vinay-2006/CBIT_lost_found.git
cd CBIT_lost_found

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend
npm install
cd ..
```

---

## 8. Environment Variable Setup

The backend configuration is managed via an environment file.

1. Navigate to the `backend/` directory:
   ```powershell
   cd backend
   ```
2. Copy the template to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Inspect and edit `.env` as needed:
   ```dotenv
   PORT=5000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173

   # MongoDB Connection
   MONGODB_URI=mongodb://127.0.0.1:27017/cbit_lost_found

   # JWT Secret for Authentication
   JWT_SECRET=your_jwt_secret_key_change_in_production

   # Upload Directory on Disk
   UPLOAD_DIR=uploads
   MAX_FILE_SIZE_BYTES=5242880
   ```

> **Security Note:** Never commit `.env` to version control. It is excluded by `.gitignore`.

---

## 9. Local MongoDB Setup

1. Ensure the MongoDB service is running locally on port `27017`:
   ```powershell
   # Windows Services check
   Get-Service -Name MongoDB -ErrorAction SilentlyContinue
   ```
   Or verify network connectivity:
   ```powershell
   Test-NetConnection -ComputerName 127.0.0.1 -Port 27017
   ```
2. If connecting to **MongoDB Atlas**, update `MONGODB_URI` in `backend/.env` with your cluster connection string:
   ```dotenv
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/cbit_lost_found?retryWrites=true&w=majority
   ```

---

## 10. Database Seeding (Idempotent)

Initialize the MongoDB database with the 20 campus baseline mock records:

```powershell
cd backend
npm run seed
```

- **Idempotency**: The seed script uses `Item.findOneAndUpdate({ id: item.id }, { $set: item }, { upsert: true })`.
- Running this script repeatedly is **safe**; it updates existing items and inserts missing records without creating duplicates.

---

## 11. Running the Application

### Step 1: Start the Backend Server
```powershell
cd backend
npm run dev
```
- The backend starts on `http://localhost:5000`.
- Health check available at: `http://localhost:5000/api/health`.

### Step 2: Start the Frontend Application
Open a new terminal window:
```powershell
npm run dev
```
- The Vite dev server starts on `http://localhost:5173`.
- Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 12. API Endpoint Reference

All backend responses return standard JSON.

### Authentication Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register student with name, CBIT institutional email (`@cbit.ac.in`), roll number, and password |
| `POST` | `/api/auth/login` | Public | Authenticate student, sets HttpOnly `cbit_token` cookie and returns JWT |
| `POST` | `/api/auth/logout` | Public | Clears HttpOnly session cookie |
| `GET` | `/api/auth/me` | Protected | Returns current authenticated student profile (via cookie or Bearer token) |

### Items & Management Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/items` | Public | List reports with search, category/type/status filter, and pagination |
| `GET` | `/api/items/my-reports` | Protected | Retrieve all reports submitted by the logged-in student |
| `GET` | `/api/items/:id` | Public | Retrieve report details by numeric ID |
| `POST` | `/api/items` | Protected / Auth | Submit a lost or found report (auto-associates `userId`) |
| `PATCH` | `/api/items/:id` | Owner / Admin | Update report status (`active` ↔ `resolved`) or permitted content fields |
| `DELETE` | `/api/items/:id` | Owner / Admin | Delete report (enforces ownership and administrator authorization) |
| `GET` | `/api/stats` | Public | Aggregated live dashboard statistics (totals, resolved, category and monthly counts) |
| `POST` | `/api/upload` | Auth / Public | Upload image file (multipart/form-data, max 5MB, JPG/PNG/WebP; SVG blocked) |
| `GET` | `/api/health` | Public | Health check with live MongoDB ping probe and latency |
| `GET` | `/data/items.json`| Public | Direct backward-compatibility endpoint returning raw items array |

### Example: Student Registration
```http
POST /api/auth/register HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "name": "Divya Teja",
  "email": "divya.teja@cbit.ac.in",
  "rollNo": "23A91A0577",
  "password": "Password123!"
}
```

---

## 13. Authentication and Authorization Overview

1. **Student Registration**:
   - Institutional domain validation enforces `@cbit.ac.in` (and subdomains) to ensure campus affiliation.
   - Roll number format validation enforces standard 10–12 character formats (e.g., `23A91A0501`, `160121733001`).
   - Strong password validation: Minimum 8 characters with at least one letter and one number.
   - Passwords securely hashed with `bcryptjs` (salt factor 10) before persistence. Passwords are never returned in API responses or logs.
2. **Dual Session Strategy**:
   - Web browsers use secure `HttpOnly`, `SameSite: Lax` cookies (`cbit_token`).
   - API clients and automated tests can also pass `Authorization: Bearer <token>`.
3. **Report Ownership & Dynamic Lifecycle**:
   - Reports submitted while authenticated automatically bind `userId: student.id`.
   - Owners can update report status dynamically between `active` and `resolved` from their dashboard or item cards.
   - Changes persist to MongoDB immediately and update dashboard counts and listing filters in real time.
   - Unauthorized attempts by other students or anonymous users to edit or delete reports are strictly rejected (`401` / `403`).
4. **Guest Report Compatibility**:
   - Historical guest records (`userId: null`) cannot be claimed or modified by arbitrary users matching email or phone. Only administrators can delete or modify guest reports.

---

## 14. Image Upload Behavior & Limitations

- **Dedicated Storage**: Uploaded files are written directly to `backend/uploads/` on disk outside of MongoDB to prevent BSON document size limits (16 MB) and database bloat.
- **Allowed Formats**: `image/jpeg`, `image/png`, `image/webp`.
- **SVG Uploads**: Prohibited (`400 Bad Request`) to prevent Stored Cross-Site Scripting (XSS).
- **Size Limit**: 5 MB (`5242880` bytes).
- **Public Serving**: Served statically via Express at `/uploads/<filename>`.
- **Cleanup**: Deleting an item report deletes its corresponding file from `backend/uploads/`.

---

## 15. Testing and Verification

### Backend Test Suite (65 tests across 14 suites — 100% Passing)
```powershell
cd backend
npm test
```
Includes:
- **Student Authentication Tests** (`studentAuth.test.js`): Registration, login, duplicate account rejection, domain validation, password hashing, session cookies, `/api/auth/me`, logout.
- **Status Lifecycle & Ownership Tests** (`statusWorkflow.test.js`): Owner resolution, reopen, non-owner rejection (403), anonymous rejection (401), invalid status rejection (400), dynamic stats updates.
- **Auth Middleware Tests** (`auth.test.js`): Bearer tokens, token expiration, guest fallbacks, unauthorized tampering guards.
- **Item Integration Tests** (`items.test.js`): CRUD, Zod validation, search, pagination, upload restrictions, production safety guards.
- **Live MongoDB Tests** (`mongodb.live.test.js`): Real database operations when MongoDB service is running (with graceful skip when daemon is offline).

### Frontend Production Build
```powershell
npm run build
```
Compiles Vite client bundle to `dist/` with 0 errors.

### Browser End-to-End Verification
Automated browser testing verified the full student lifecycle:
1. Registration with `@cbit.ac.in` email and roll number.
2. Login and persistent session across page reloads.
3. Reporting a lost item with auto-populated student identity.
4. Managing report in "My Reports", toggling status to "Resolved".
5. Verifying persistence of "Resolved" status across reloads and in live Dashboard metrics.
6. Filtering by "Resolved Only" on `/lost-items`.
7. Logging out and verifying protected route redirection back to `/login`.

---

## 16. Production Deployment Considerations

1. **Database**: Use a hosted cluster such as **MongoDB Atlas**. Restrict Network Access to the application server's IP address rather than `0.0.0.0/0`.
2. **Secrets**: Set a cryptographically random string for `JWT_SECRET` in production.
3. **Environment Guard**: When `NODE_ENV=production`, the backend strictly refuses in-memory fallback. If MongoDB is unreachable, it fails safely with HTTP `503`.
4. **CORS**: Set `CORS_ORIGIN` in `backend/.env` to the production frontend domain (e.g., `https://lostfound.cbit.ac.in`).
5. **Static Media**: For multi-instance deployments, consider backing `backend/uploads/` with a shared volume or cloud object storage (e.g., AWS S3).

---

## 17. Common Troubleshooting Steps

| Issue | Root Cause | Resolution |
|---|---|---|
| **MongoDB connection failed (`ECONNREFUSED 127.0.0.1:27017`)** | MongoDB service is stopped or not installed locally. | In PowerShell, run `Get-Service MongoDB` and start with `Start-Service MongoDB` (or `net start MongoDB`). Verify network with `Test-NetConnection -Port 27017`. Alternatively, supply a MongoDB Atlas connection string in `backend/.env`. |
| **Frontend displays network error or empty list** | Backend server is not running or CORS is misconfigured. | Ensure backend is started (`cd backend; npm run dev`) on port 5000 and `CORS_ORIGIN=http://localhost:5173` is present in `backend/.env`. |
| **Image upload fails (`HTTP 400 Bad Request`)** | File type is not whitelisted (e.g., `.svg`, `.gif`) or exceeds 5 MB. | Only JPG, PNG, and WebP files up to 5 MB are accepted. SVGs are rejected to eliminate Stored XSS risks. |
| **Permission Denied (`HTTP 403 Forbidden`) on report modification/deletion** | Request lacks valid ownership or administrator credentials. | Guest reports can only be deleted by an administrator. Authenticated reports require a valid Bearer JWT token matching `userId` or admin role. |
| **Port 5000 or 5173 already in use** | A previous Node process is still running in the background. | In PowerShell, run `Get-NetTCPConnection -LocalPort 5000` to find the process ID (`OwningProcess`), then run `Stop-Process -Id <PID> -Force`. |

---

## 18. Known Limitations

- **Guest Identity**: For guest reports created without authentication, phone number and email matching provides basic field association, but does not substitute for cryptographic proof of identity. User account creation with campus SSO or email OTP is recommended for hardened identity verification.
- **Image Storage in Containerized Environments**: Local disk storage in `backend/uploads/` is ephemeral unless mounted to a persistent volume.

---

## 19. License

This project was developed for educational and campus use at **Chaitanya Bharathi Institute of Technology (CBIT)**. Refer to repository administrators for distribution terms.
