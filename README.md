# SafeSphere: 24/7 Community Safety Intelligence Network

> **Note on Project Status:**  
> **STEP 1 & STEP 2 COMPLETED.**  
> Step 1 established the foundation architecture, database models, and route scaffolds.  
> Step 2 delivers complete Firebase Authentication, PostgreSQL User Profiles with automatic DOB age detection, Minor Safeguarding, and Guardian Connect OTP Verification.  
> Subsequent modules (live location, Google Gemini AI, route recommendations, SOS, and admin dashboards) will be implemented in future phases.

---

## 1. Project Purpose
SafeSphere is an autonomous, community-first safety platform designed to provide round-the-clock protection and intelligence for:
- Women commuting alone or working late shifts
- Students navigating universities, dorms, and urban campuses
- Employees and nocturnal shift workers
- Minors and families requiring automated under-18 guardian protection
- Colleges, corporations, and residential associations managing localized civic safety
- First responders and community emergency desks

The platform combines real-time geo-telemetry, crowd-sourced hazard verification, safety-weighted routing, and Google Gemini multi-modal AI risk assessment to prevent harm before it occurs.

---

## 2. Technology Stack

### Frontend
- **Framework & Tooling:** React 19, Vite, TypeScript
- **Styling:** Tailwind CSS (v4) with dark glassmorphism design system
- **Routing:** React Router v7 with protected routes and role/guard checks
- **Authentication:** Firebase Authentication SDK with hybrid dev-token support
- **HTTP Client:** Axios with bearer authentication interceptors
- **Map & Geo-rendering:** OpenStreetMap & Leaflet with custom category pins
- **Icons:** Lucide React

### Backend
- **Framework:** Python 3.13, FastAPI
- **Server:** Uvicorn ASGI with structured request-timing middleware
- **Data Validation:** Pydantic v2 & Pydantic-Settings
- **ORM & Database:** SQLAlchemy 2.0 with cross-dialect UUIDs (`Uuid(as_uuid=True)`)
- **Database Engine:** PostgreSQL (primary) with resilient auto SQLite fallback for offline development
- **Security & Tokens:** PyJWT, Firebase Admin SDK integration, and RBAC dependency injection
- **HTTP/Networking:** HTTPX

---

## 3. Step 2 — Authentication, User Profile & Guardian Connect

Step 2 establishes the core identity, privacy, and guardian safeguarding system.

### 3.1 Features Implemented
1. **Firebase Authentication:**
   - User registration with legal name, email, phone, DOB, password, and user type.
   - User login, logout, and password recovery (`/forgot-password`).
   - Seamless token synchronization with backend bearer authentication.
   - Development mock mode (`dev-token-<uid>`) enabling complete offline and local hackathon testing without external service blockers.
2. **Server-Side Age Calculation & Validation:**
   - Derives exact age from the user's Date of Birth (DOB).
   - Validates boundary conditions (exact 18th birthday is classified as Adult; 1 day prior is classified as Minor).
   - Rejects future dates and unrealistic ages (>120 years).
3. **Automated Minor Detection:**
   - `age < 18` &rarr; `is_minor = true` (Mandatory Guardian Connect flow).
   - `age >= 18` &rarr; `is_minor = false` (Standard Adult profile).
   - Non-alarming educational notice: *"Guardian Connect helps keep your trusted guardian informed when SafeSphere safety features are used."*
4. **Guardian Connect & Verification Protocol:**
   - Minors link a primary parent/guardian (`Parent`, `Mother`, `Father`, `Guardian`, `Other`).
   - Enforces relationship integrity: prevents self-assignment and blocks adult accounts from attaching minor guardians.
   - Dual-status tracking:
     - `verification_status`: `PENDING`, `VERIFIED`, `REJECTED`.
     - `consent_status`: `PENDING`, `ACCEPTED`, `DECLINED`.
   - OTP verification workflow (Dev OTP code: `123456`).
5. **Role-Based Access Control (RBAC):**
   - Three standard roles: `USER`, `ORGANIZATION_ADMIN`, `SYSTEM_ADMIN`.
   - Registration strictly provisions `role = USER`; client role escalation attempts are disregarded.
   - Reusable dependency factory `require_role(*roles)` enforces HTTP 403 Forbidden on administrative endpoints.
6. **Protected Routing & Navigation:**
   - Unauthenticated users are redirected to `/login`.
   - Minor accounts without a linked guardian are redirected to `/guardian`.
   - Adults have direct access to `/home`.
   - Zero redirect loops between `/guardian` and `/profile`.
7. **Polished Responsive Profile UI (`/profile`):**
   - Personal Information (Name, Email, Phone, DOB, User Type).
   - Safety Account status & Trust Score.
   - Guardian Connect card (dynamically presented only for minor accounts).
   - Security controls (Change password, Sign out).

---

## 4. PostgreSQL Database Schema

### `users` Table
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | Primary Key |
| `firebase_uid` | VARCHAR(128) | Unique, Indexed (maps to Firebase identity) |
| `full_name` | VARCHAR(255) | User's legal name |
| `email` | VARCHAR(255) | Unique, Indexed |
| `phone` | VARCHAR(30) | Unique, Validated E.164 phone number |
| `date_of_birth` | DATE | Used for server-side age derivation |
| `age` | INTEGER | Calculated dynamically |
| `is_minor` | BOOLEAN | `true` if age < 18, `false` otherwise |
| `user_type` | VARCHAR(50) | `Student`, `Employee`, `General Public`, `Other` |
| `role` | VARCHAR(50) | Default: `USER`. (`ORGANIZATION_ADMIN`, `SYSTEM_ADMIN`) |
| `profile_image_url` | VARCHAR(500) | Optional avatar URL |
| `is_active` | BOOLEAN | Default: `true` |
| `created_at` | TIMESTAMPTZ | Automatic UTC creation timestamp |
| `updated_at` | TIMESTAMPTZ | Automatic UTC update timestamp |

### `guardians` Table
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | Primary Key |
| `minor_user_id` | UUID | Foreign Key &rarr; `users.id`, Unique per minor |
| `guardian_name` | VARCHAR(150) | Full name of parent/guardian |
| `guardian_phone` | VARCHAR(30) | Guardian mobile contact |
| `guardian_email` | VARCHAR(255) | Optional notification email |
| `relationship` | VARCHAR(50) | `Parent`, `Mother`, `Father`, `Guardian`, `Other` |
| `verification_status` | VARCHAR(30) | `PENDING`, `VERIFIED`, `REJECTED` |
| `consent_status` | VARCHAR(30) | `PENDING`, `ACCEPTED`, `DECLINED` |
| `verification_otp` | VARCHAR(10) | Secure verification OTP code |
| `otp_expires_at` | TIMESTAMPTZ | OTP expiration window |
| `created_at` | TIMESTAMPTZ | Automatic UTC creation timestamp |
| `updated_at` | TIMESTAMPTZ | Automatic UTC update timestamp |

---

## 5. API Endpoints

### Authentication & Users
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Registers user profile in database and derives age & minor status |
| `GET` | `/api/v1/auth/me` | Authenticated | Fetches authenticated user profile from token |
| `GET` | `/api/v1/users/me` | Authenticated | Gets user profile, safety account attributes, and linked guardian |
| `PUT` | `/api/v1/users/me` | Authenticated | Updates editable attributes (name, phone, user type) |
| `GET` | `/api/v1/users/admin/system-status` | Admin (`SYSTEM_ADMIN`, `ORGANIZATION_ADMIN`) | RBAC-protected administrative health probe |

### Guardian Connect
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/guardians` | Minor Only | Links primary guardian to minor account (<18) |
| `GET` | `/api/v1/guardians/me` | Minor Only | Retrieves current minor's guardian details |
| `PUT` | `/api/v1/guardians/me` | Minor Only | Updates guardian contact details |
| `DELETE` | `/api/v1/guardians/me` | Minor Only | Removes guardian connection |
| `POST` | `/api/v1/guardians/verify` | Minor Only | Verifies guardian consent via OTP |

---

## 6. Environment Variables

### Backend (`.env`)
```env
PROJECT_NAME="SafeSphere"
ENVIRONMENT="development"
DEBUG=true
API_V1_STR="/api/v1"

# Database (PostgreSQL primary; auto-fallback to SQLite in local dev)
DATABASE_URL="postgresql://safesphere_user:safesphere_password@localhost:5432/safesphere_db"

# Firebase Admin SDK (Production credentials)
FIREBASE_PROJECT_ID="safesphere-app"
FIREBASE_CREDENTIALS_PATH=""

# Guardian OTP Verification
OTP_DEV_CODE="123456"
OTP_EXPIRY_MINUTES=15
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL="http://localhost:8000/api/v1"

# Firebase Web Client (Optional for dev mock mode, required for live Firebase production)
VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN="safesphere-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="safesphere-app"
VITE_FIREBASE_STORAGE_BUCKET="safesphere-app.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID=""
VITE_FIREBASE_APP_ID=""
```

---

## 7. Installation & Quick Start

### Prerequisites
- Node.js v18+ & npm
- Python 3.10+ (Python 3.13 tested)
- PostgreSQL or Docker (Optional; SQLite fallback is built-in)

### Step 1: Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Swagger UI: `http://127.0.0.1:8000/api/v1/docs`  
Health Check: `http://127.0.0.1:8000/api/v1/health`

### Step 2: Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Frontend App: `http://127.0.0.1:5173/`

---

## 8. Verification & Testing Guide

### 8.1 Automated Tests (Pytest)
Run the 29-test backend test suite:
```bash
cd backend
.\.venv\Scripts\python.exe -m pytest -v
```
**Test Coverage Includes:**
- Age calculation (adult, minor, exact 18-year boundary)
- Validation of impossible dates (future DOB, unrealistic past DOB)
- Adult registration and minor registration
- Duplicate email prevention
- Prevention of self-assignment as guardian
- Prevention of adult guardian attachment
- Guardian linking, update, removal, and OTP verification
- Role-based authorization (`USER` vs `SYSTEM_ADMIN` / `ORGANIZATION_ADMIN`)
- Cross-user data isolation and unauthenticated access rejection

### 8.2 Frontend TypeScript Build Check
```bash
cd frontend
npm run build
```
Ensures zero TypeScript compilation errors or broken imports.

### 8.3 Manual Adult vs Minor Account Workflow

#### Scenario A: Minor Account (< 18)
1. Open `http://localhost:5173/register`.
2. Fill legal name, email, phone, and pick a Date of Birth indicating an age < 18 (e.g. 16 years ago).
3. The real-time age preview displays: *"Minor Account &bull; Guardian Connect helps keep your trusted guardian informed."*
4. Click **Create Account**.
5. The application redirects automatically to `/guardian`.
6. Fill in guardian details (Name: `Sarah Connor`, Phone: `+1-555-444-5555`, Relationship: `Mother`).
7. Click **Save Guardian & Send Code**.
8. In the OTP prompt, enter Dev OTP `123456` and click **Verify OTP**.
9. The banner confirms *"Guardian Setup Completed. Your account is fully protected."*
10. Click **Continue** to proceed to `/home`.
11. View `/profile` to observe the active Guardian Connect card.

#### Scenario B: Adult Account (&ge; 18)
1. Open `http://localhost:5173/register`.
2. Fill details with a DOB indicating age &ge; 18 (e.g. 25 years ago).
3. The preview confirms: *"Standard Adult Account. No mandatory guardian setup required."*
4. Click **Create Account**.
5. The application routes directly to `/home`.
6. Navigate to `/guardian`; the page indicates guardian setup is optional for adults.
7. Navigate to `/profile`; guardian requirements are omitted.

---

## 9. Next Steps (Step 3 and Beyond)
*Do not implement these in Step 2:*
- **Step 3:** Live GPS Tracking, Geolocation Polling, and Breadcrumb Trails
- **Step 4:** Real-time Safety Pulse & Hotspot Computation Engine
- **Step 5:** Safety-Aware Route Recommendations with Streetlight Density
- **Step 6:** Multi-Modal Incident Reporting (Text, Voice Notes, Photo Verification)
- **Step 7:** One-Touch Emergency SOS & Panic Dispatch
- **Step 8:** Google Gemini Multi-Modal AI Analysis & Hazard Classification
- **Step 9:** Guardian Protection automated check-ins and delayed-arrival notifications
- **Step 10:** Admin & Municipal Civic Dashboard
