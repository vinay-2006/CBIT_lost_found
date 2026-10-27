# CBIT Lost & Found Portal - Backend API (MongoDB Edition)

A production-grade, secure, and performant REST API backend for the **CBIT Lost & Found Portal**, powered by **Node.js**, **Express.js**, and **MongoDB (with Mongoose)**.

---

## 1. Overview & Architecture

The backend provides a complete API layer for reporting, retrieving, updating, and tracking lost and found belongings on campus, maintaining 100% data contract compatibility with the existing React frontend.

```text
CBIT_lost_found/backend/
├── src/
│   ├── config/
│   │   ├── env.js                # Environment configuration & validation
│   │   └── database.js           # Mongoose MongoDB connection, disconnect & ping
│   ├── controllers/
│   │   ├── healthController.js   # Server health, uptime, & active MongoDB ping
│   │   ├── itemController.js     # CRUD operations for lost/found items
│   │   ├── statsController.js    # Dashboard analytics & aggregation
│   │   └── uploadController.js   # Safe file upload handling
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication (optional & enforced guards)
│   │   ├── errorHandler.js       # Centralized error handling & uniform JSON responses
│   │   ├── upload.js             # Multer memory storage (JPG/PNG/WebP; SVG blocked for XSS prevention)
│   │   └── validator.js          # Zod validation schemas (Indian phone, email, rollNo)
│   ├── models/
│   │   └── Item.js               # Mongoose schema, validation hooks, compound & search indexes
│   ├── routes/
│   │   ├── healthRoutes.js       # /api/health
│   │   ├── itemRoutes.js         # /api/items
│   │   ├── statsRoutes.js        # /api/stats
│   │   ├── uploadRoutes.js       # /api/upload
│   │   └── index.js              # Combined API router
│   ├── services/
│   │   ├── itemService.js        # Business logic, MongoDB Mongoose queries & local fallback
│   │   └── storageService.js     # Dedicated disk image storage (outside MongoDB)
│   ├── app.js                    # Express app configuration, static uploads, CORS, Helmet
│   └── server.js                 # Server listener, DB connector & graceful shutdown
├── scripts/
│   └── seed.js                   # Idempotent MongoDB database initialization & seeder
├── tests/
│   ├── auth.test.js              # 9 authentication and authorization tests
│   ├── items.test.js             # 35 endpoint validation, filtering, pagination & security tests
│   └── mongodb.live.test.js      # 9 live integration tests against actual MongoDB instance
├── uploads/                      # Dedicated storage directory for uploaded media
├── .env.example                  # Environment configuration template
├── .gitignore                    # Backend gitignore (node_modules, .env, uploads)
├── package.json                  # Dependencies and scripts (start, dev, test, seed)
└── README.md                     # Backend documentation
```

---

## 2. Prerequisites & MongoDB Setup

- **Node.js**: v18.0.0 or higher (v24 LTS recommended)
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or **MongoDB Atlas** cloud cluster.

### Setting Up MongoDB Atlas (Cloud)
1. **Create an Account / Project**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
2. **Deploy a Free Cluster**: Choose **M0 Free Tier** (AWS/GCP/Azure) and select a region closest to your users (e.g. `ap-south-1` Mumbai).
3. **Configure Database User**:
   - Navigate to **Security** -> **Database Access** -> **Add New Database User**.
   - Select **Password Authentication**. Set a secure username (e.g. `cbit_admin`) and a strong password.
   - Grant role: `readWriteAnyDatabase` or `Built-in: readWrite` on `cbit_lost_found`.
4. **Configure Network Access**:
   - Navigate to **Security** -> **Network Access** -> **Add IP Address**.
   - Add your current development IP address, or allow `0.0.0.0/0` (with strong password) for cloud hosting.
5. **Obtain Connection String**:
   - Go to **Deployments** -> **Database** -> Click **Connect**.
   - Select **Drivers** (Node.js).
   - Copy the SRV URI:
     ```text
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/cbit_lost_found?retryWrites=true&w=majority
     ```
6. **Set in `.env`**:
   Add the URI as `MONGODB_URI` in `backend/.env`.

---

## 3. Installation & Getting Started

1. **Navigate to the backend directory:**
   ```bash
   cd CBIT_lost_found/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```dotenv
   PORT=5000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173

   # MongoDB Connection
   MONGODB_URI=mongodb://127.0.0.1:27017/cbit_lost_found

   # JWT Secret
   JWT_SECRET=cbit_lost_found_dev_secret_key_2026

   # Dedicated Uploads Directory (on disk, outside MongoDB)
   UPLOAD_DIR=uploads
   MAX_FILE_SIZE_BYTES=5242880
   ```

4. **Seed the Database (Idempotent):**
   ```bash
   npm run seed
   ```
   This initializes indexes and populates the 20 campus mock records without creating duplicates.

5. **Start the backend server:**
   - **Development mode (with file watcher):**
     ```bash
     npm run dev
     ```
   - **Production mode:**
     ```bash
     npm start
     ```
   The server starts at `http://localhost:5000`.

---

## 4. Dedicated Image Storage (No Blobs in MongoDB)

To prevent BSON document size limits (16 MB) and database bloat, image files are **not** stored as binary blobs inside MongoDB:
- Uploaded images are saved to a dedicated on-disk storage directory (`backend/uploads/`) using unique hashed filenames.
- Static images are served securely via Express at `/uploads/<filename>`.
- Allowed formats: `image/jpeg`, `image/png`, `image/webp`. SVG uploads are blocked to eliminate Stored XSS vectors.
- Deleting an item automatically cleans up its associated uploaded image from disk.

---

## 5. API Reference & Endpoints

All responses follow a consistent JSON format:
- **Success:** `{ "success": true, "data": ... }`
- **Error:** `{ "success": false, "error": { "message": "...", "details": [...] } }`

### 5.1 Health & Status Check

#### `GET /api/health`
Checks server uptime and actively probes MongoDB connection with ping latency.
- **Response `200 OK` (when healthy):**
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "service": "CBIT Lost & Found Backend API",
      "uptimeSeconds": 120,
      "timestamp": "2026-10-26T18:15:00.000Z",
      "environment": "development",
      "database": {
        "provider": "MongoDB",
        "connected": true,
        "latencyMs": 4
      }
    }
  }
  ```

---

### 5.2 Items API

#### `GET /api/items`
Retrieves reports with filtering, searching, sorting, and pagination.
- **Query Parameters:**
  - `type` *(optional)*: `'lost'` | `'found'`
  - `category` *(optional)*: `'Electronics'` | `'Documents'` | `'Books'` | `'Accessories'` | `'Others'`
  - `status` *(optional)*: `'active'` | `'resolved'` | `'all'`
  - `search` *(optional)*: Search string matching item name, description, or location
  - `page` *(optional, default: 1)*: Page number
  - `limit` *(optional, default: 20, max: 100)*: Items per page
  - `sortBy` *(optional, default: 'date')*: `'date'` | `'createdAt'` | `'itemName'` | `'id'`
  - `order` *(optional, default: 'desc')*: `'asc'` | `'desc'`
  - `format` *(optional)*: Set to `'raw'` to receive raw array `[...]` matching mock file format.

#### `GET /data/items.json`
Direct compatibility endpoint returning raw array `[...]` matching frontend `fetch('/data/items.json')`.

#### `GET /api/items/:id`
Retrieves report details by numeric ID.

#### `POST /api/items`
Submits a new lost or found report with Zod validation.
- Roll number required for lost reports.
- Indian mobile number validation (`^[6-9]\d{9}$`).
- Valid email format.

#### `PATCH /api/items/:id`
Updates permitted fields or resolves status (`active` -> `resolved`).
- Authenticated reports: requires owner Bearer token.
- Guest reports: status resolution is open; modifying content requires admin token or reporter verification.

#### `DELETE /api/items/:id`
Deletes a report.
- Authenticated reports: requires owner Bearer token.
- Guest reports: requires admin token to prevent malicious deletion of campus records.

---

### 5.3 Analytics & Dashboard API

#### `GET /api/stats`
Computes dynamic campus metrics matching `Dashboard.jsx`.
- Total, lost, found, resolved, and active counts.
- Category breakdown and monthly distribution.
- 5 most recent reports.

---

### 5.4 Image Upload API

#### `POST /api/upload`
Uploads an item image via `multipart/form-data`.
- Field name: `image`
- Allowed formats: JPG, PNG, WebP (SVG is prohibited for security)
- Max size: 5 MB
- Response contains relative URL: `/uploads/item_1729960000_a1b2c3.png`.

---

## 6. Testing & Verification

Run tests:
```bash
cd CBIT_lost_found/backend
npm test
```

### Test Suite Structure:
1. `tests/studentAuth.test.js` (12 tests): Student registration, login, CBIT institutional email verification (`@cbit.ac.in`), roll number format, password strength, duplicate prevention, HttpOnly session cookies, and logout.
2. `tests/statusWorkflow.test.js` (8 tests): Dynamic status lifecycle (`active` ↔ `resolved`), ownership authorization, `GET /api/items/my-reports`, non-owner/anonymous rejection, dynamic stats counter updates.
3. `tests/auth.test.js` (9 tests): JWT signing, `requireAuth`, `optionalAuth`, ownership checks, guest report protection.
4. `tests/items.test.js` (35 tests): CRUD operations, Indian phone & roll number validation, search, filtering, pagination, upload type restrictions, and production safety guards.
5. `tests/mongodb.live.test.js` (9 tests): **Live MongoDB integration tests** verifying active connection, ping latency, real collection queries, mutations, and stats aggregation.

**Result: 65 tests across 14 suites pass with 0 failures.**

---

## 7. Common Troubleshooting Steps

| Symptom | Cause | Solution |
|---|---|---|
| `MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017` | MongoDB service is inactive. | Start service: `net start MongoDB` or configure cloud MongoDB Atlas URI in `.env`. |
| `HTTP 400 Validation failed: rollNo is required for lost items` | Missing roll number on lost report. | Ensure `rollNo` string is supplied when `type === 'lost'`. |
| `HTTP 400 Invalid file type` | Attempting to upload unsupported format or SVG. | Upload only JPG, PNG, or WebP images. SVG is prohibited to prevent Stored XSS. |
| `HTTP 403 Unauthorized: Guest reports can only be deleted by an administrator` | Anonymous deletion attempt on guest report. | Provide an administrator JWT token via `Authorization: Bearer <token>`. |
| `EADDRINUSE: address already in use :::5000` | Port 5000 occupied by existing process. | Identify PID with `Get-NetTCPConnection -LocalPort 5000` and stop with `Stop-Process -Id <PID> -Force`. |
