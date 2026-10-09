# SafeSphere: 24/7 Community Safety Intelligence Network

> **Note on Project Status:**  
> **STEPS 1 THROUGH 13 COMPLETED.**  
> Step 1 established the foundation architecture, database models, and route scaffolds.  
> Step 2 delivered complete Firebase Authentication, PostgreSQL User Profiles with automatic DOB age detection, Minor Safeguarding, and Guardian Connect OTP Verification.  
> Step 3 delivered the complete Home Dashboard, AppShell Navigation, Mobile Bottom Navigation, Reusable Component Library, and Responsive UI layout.  
> Step 4 delivered real-time Geolocation Permission handling, GPS location services, live journey creation, active journey monitoring with pause/resume/end lifecycle, breadcrumb logging, and route history visualization.  
> Step 5 delivered the complete interactive SafeSphere Safety Map: OpenStreetMap & Leaflet integration, live GPS positioning, visually distinct safety report markers, verified 24/7 help points, community hotspot overlays, interactive layer filtering, Nominatim search, Home preview integration, and active journey path rendering.  
> Step 6 delivered the full Community Safety Reporting System: user-submitted text safety reports, dual location assignment (live GPS & interactive Leaflet map picker), category & severity taxonomy, responsible reporting safeguards, duplicate submission throttling, user report ownership & history, report detail cards, and immediate Safety Map marker synchronization.  
> Step 7 delivered Google Gemini AI text safety analysis, structured JSON classification schema, confidence scoring, prompt injection defense, and non-blocking fallback reporting.  
> Step 8 delivered Multi-Modal Safety Reporting: Voice Speech-to-Text with Gemini transcription, photo hazard recognition, image + text combination, storage abstraction, and unified user review/confirmation.  
> Step 9 delivered the Deterministic Safety Pulse & Territorial Risk Estimation Engine: location-specific, time-aware 0–100 score, category half-life aging, distance decay, duplicate dampening, data confidence & freshness metrics, transparent explanations, Safety Map & Home Dashboard integrations, and historical progression API.  
> Step 10 delivered Safety-Aware Routing & Route Comparison: provider-agnostic routing engine abstraction (OSRM, ORS, DevFixtures), road alternatives comparison (Fastest, Shortest, Lower Estimated-Risk), route-level Safety Pulse spatial corridor evaluation, signal deduplication, transparent data coverage and confidence indicators, insufficient data warnings, Leaflet map polyline layer, and planned journey GPS lifecycle integration.  
> Step 11 delivered "I Feel Unsafe" Mode & Preventive Safety Assistance: dedicated activation flow, watchdog telemetry, nearby verified safe haven radar, lower-estimated-risk route reassessment, trusted contact notification integration status, minor guardian connect verification, and "I'm Safe Now" deactivation without journey disruption.  
> Step 12 delivered Trusted Circle, SOS Emergency System & Guardian Alerts: trusted contact management, contact invitation & verification lifecycle, granular contact notification permissions, automatic minor guardian notifications on journey start/end, SOS activation & location sharing, cryptographically secure time-limited live sharing links, truthful notification delivery outbox logging, and resilient mock/provider abstractions.  
> Step 13 delivered the Community Verification & Feedback System: independent report observations, structured dispute functionality, 1-vote-per-user database integrity, separation between community counts and official verification, resolution confirmation with reopening request workflows, post-journey route and safety-usefulness ratings, 9-category platform feedback, private feedback history, deterministic nearby duplicate detection, privacy protection without exposing reporter/disputer identities, full auditable lifecycle logs, and strict Safety Pulse governance.  

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
     - `verification_status`: `NOT_VERIFIED`, `PENDING`, `VERIFIED`, `REJECTED`.
     - `consent_status`: `PENDING`, `ACCEPTED`, `DECLINED`.
   - Direct Guardian contact management (OTP verification removed from Guardian Connect; contact verification is not enabled).
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
| `POST` | `/api/v1/guardians/verify` | Minor Only | (Deprecated / Legacy) OTP verification endpoint |

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

## 9. Step 3 — SafeSphere Home Dashboard, Navigation & Responsive UI

Step 3 delivers a modern, mobile-first design system and dashboard architecture:

### 9.1 Layout Architecture (`AppShell`)
- **Desktop (>= 768px):** Sticky Top Header with search bar, notifications, and user avatar profile menu. Fixed left Sidebar with core network navigation links, status indicators, and an emergency SOS dispatch trigger.
- **Mobile (< 768px):** Compact top bar, touch-friendly bottom navigation bar (`Home`, `Map`, `Report`, `Journey`, `More`), and a smooth slide-out drawer for extended modules without horizontal scrolling.

### 9.2 Reusable Component Library
- **UI Primitives (`components/ui/`):**
  - `Button`: Accessible variants (`primary`, `secondary`, `danger`, `outline`, `ghost`), loading spinners, and focus rings.
  - `Card`: Glassmorphism containers with optional ambient glows (`glow-rose`, `glow-blue`, `glow-emerald`).
  - `StatusBadge`: Accessible status indicators communicating through both iconography and text (never color alone).
  - `EmptyState`: Clean dashed fallback state for empty lists and data queries.
  - `LoadingState`: Animated radar/shield pulse indicating ongoing network processes.
  - `ErrorState`: Alert box with retry trigger.
- **Navigation Shell (`components/navigation/`):**
  - `Header`: Global search bar (`/` shortcut), unread notification badge, avatar menu toggle.
  - `Sidebar`: Full navigation links, minor protection tags, and emergency trigger.
  - `MobileNavigation`: Touch-optimized bottom navigation.
  - `NotificationPanel`: Dropdown panel with category icons, unread filters, and dismissal triggers.
  - `ProfileMenu`: Dropdown menu linking to Profile, Guardian Connect, Trusted Circle, Feedback, and Logout.
- **Dashboard Modules (`components/dashboard/`):**
  - `SafetyPulseCard`: Prominent territorial index card (`-- / 100` Calculating...) ready for Step 4 algorithms.
  - `QuickActionCard`: 4 rapid 1-touch actions (Start Journey, Report Issue, I Feel Unsafe, Instant SOS).
  - `LocationCard`: Geo-fence area indicator with callbacks prepared for Step 5 GPS.
  - `SafeMapPreview`: Embedded radar map preview with interactive zone and marker slots.
  - `JourneyCard`: Active journey monitor with toggleable idle and monitored travel states.
  - `SafetyInsightCard`: Localized crowd-sourced notices (lighting, hazards, patrols, havens).
  - `GuardianCard`: Dynamically presented **only for minor accounts (< 18)**.
  - `TrustedCircleCard`: Emergency response circle preview.
  - `RecentActivity`: Activity audit log.

### 9.3 Routes Available in Step 3
- `/home` &mdash; SafeSphere Home Dashboard
- `/map` &mdash; Safety Map & Community Telemetry
- `/report` &mdash; Report Safety Hazard or Incident
- `/journey` &mdash; Monitored Safe Journey Console
- `/safety-mode` &mdash; "I Feel Unsafe" Silent Vigilance Protocol
- `/trusted-circle` &mdash; Emergency Responder Circle
- `/guardian` &mdash; Guardian Connect Hub
- `/feedback` &mdash; Community Safety Sentiment & Feedback
- `/profile` &mdash; User Profile & Account Security

---

---

## 10. Step 4 — Live GPS Location & Journey Tracking

Step 4 integrates real-time GPS telemetry, user-controlled location permissions, active journey tracking, and route history visualization without third-party vendor lock-in.

### 10.1 Key Architecture & Features
1. **Explicit Location Permission Handling:**
   - Handled via HTML5 Geolocation API with user confirmation modal.
   - Distinct handling for Permission Granted, Permission Denied, GPS Unavailable, and Timeout.
   - Privacy guarantee clearly documented in UI:
     > *"SafeSphere only tracks live location when the user explicitly starts an active tracking experience such as Journey Tracking. Location is not publicly shared by default."*
2. **Current Location Service (`locationService.ts`):**
   - Clean promise-based `getCurrentLocation()` returning `{ latitude, longitude, accuracy, timestamp }`.
   - Continuous foreground watcher `watchLocation()` and `stopWatchingLocation()`.
   - Never hard-codes coordinates.
3. **Reusable Location State (`LocationContext.tsx`):**
   - Exposes `currentLocation`, `accuracy`, `isLocationEnabled`, `permissionStatus`, `isTracking`, `error`, `startLocationTracking()`, and `stopLocationTracking()`.
   - Connected across Home Dashboard, Map page, and Journey page.
4. **Home Dashboard Integration:**
   - Replaced placeholder LocationCard with real GPS telemetry: detected coordinates, accuracy (±m), status indicator (🟢 Location Active / 🟡 Permission Required), and `[View on Map]` action.
5. **Interactive Map Component (`Map.tsx` & `MapPage.tsx`):**
   - Leaflet & OpenStreetMap integration with user location pin and accuracy circle (`L.circle`).
   - Follow-me toggle and one-touch Recenter button.
   - Prepared for upcoming safety layers (`safetyMarkers`, `helpPoints`, `safetyZones`).
6. **Journey Tracking System:**
   - **Start Journey:** User enters destination and optional label (Home, College, Office, Other). If under 18, shows informational message about Guardian Connect.
   - **Single Active Journey Enforcement:** Backend enforces HTTP 409 Conflict if an active/paused journey already exists. Frontend displays *Continue Journey* and *End Journey* options.
   - **Active Journey Screen (`ActiveJourneyCard.tsx`):** Live elapsed timer, cumulative distance travelled, started timestamp, and controls (`[Open Map]`, `[Pause Tracking]`, `[End Journey]`).
   - **Pause & Resume Tracking:** Pausing stops breadcrumb transmission to the database. Resuming reactivates GPS logging.
   - **End Journey & Summary:** Requires confirmation modal. Finalizes status to `COMPLETED`, records duration and final distance, and displays `JourneySummaryModal` (`[Done]`).
   - **Distance Calculation:** Server calculates cumulative movement using the Haversine great-circle formula, automatically filtering out micro-jitter (< 3m).
   - **Journey History (`JourneyHistoryList.tsx`):** Displays previous trips. Clicking any journey opens its route path with recorded breadcrumb points rendered directly on the map.

### 10.2 Database Models
- **`Journey` (`journeys` table):**
  - `id`: UUID (Primary Key)
  - `user_id`: UUID (Foreign Key -> `users.id`)
  - `destination_name`: String(200)
  - `title`: String(150)
  - `start_latitude`, `start_longitude`: Float
  - `destination_latitude`, `destination_longitude`: Float (Optional)
  - `status`: String (`PLANNED`, `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`)
  - `started_at`, `ended_at`: DateTime (UTC)
  - `last_latitude`, `last_longitude`: Float
  - `last_location_update`: DateTime (UTC)
  - `distance_travelled`: Float (in km)
- **`JourneyLocationPoint` (`journey_location_points` table):**
  - `id`: UUID (Primary Key)
  - `journey_id`: UUID (Foreign Key -> `journeys.id`, CASCADE)
  - `latitude`, `longitude`: Float
  - `accuracy`: Float (Optional)
  - `timestamp`: DateTime (UTC)

### 10.3 Backend REST APIs
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/journeys` | Start a new journey (returns `409 Conflict` if one is already active) |
| `GET` | `/api/v1/journeys` | Retrieve user's journey history |
| `GET` | `/api/v1/journeys/active` | Retrieve currently active or paused journey (`null` if none) |
| `GET` | `/api/v1/journeys/{id}` | Retrieve specific journey details (ownership verified) |
| `POST` | `/api/v1/journeys/{id}/location` | Append live GPS breadcrumb & calculate Haversine distance |
| `POST` | `/api/v1/journeys/{id}/pause` | Pause location tracking |
| `POST` | `/api/v1/journeys/{id}/resume` | Resume location tracking |
| `POST` | `/api/v1/journeys/{id}/end` | End journey and calculate duration & summary stats |
| `GET` | `/api/v1/journeys/{id}/locations` | Fetch recorded GPS points for route path display |

### 10.4 Location Update Strategy & Performance
- **Movement-based Throttle:** Client checks for significant movement (>= 5 meters) or minimum periodic elapsed time (>= 15 seconds) before transmitting points to `/api/v1/journeys/{id}/location`.
- **Database Write Optimization:** Server ignores sub-3m GPS jitter when accumulating distance.
- **Offline Resilience:** If network is temporarily disconnected, local GPS state is kept in memory without interrupting map navigation or crashing the UI.

### 10.5 Privacy & Security Measures
- **Strict Ownership Isolation:** All journey endpoints enforce `journey.user_id == current_user.id`. Requests from other users return `403 Forbidden`.
- **No Background Tracking When Idle:** Geolocation watcher is stopped immediately when a journey ends or when tracking is paused.
- **No Public GPS Broadcasts:** Coordinates are private to the user and never exposed on public or unauthenticated endpoints.

### 10.6 Testing & Verification
- **Backend Test Suite (`test_step4_journey_location.py`):**
  - Complete lifecycle: creation, breadcrumb appending, distance calculation, pause/resume, and finalization.
  - Multi-active journey conflict handling (`409 Conflict`).
  - Privacy and cross-tenant access isolation (`403 Forbidden`).
  - Rejection of breadcrumbs on completed or paused journeys (`400 Bad Request`).
  - All 31 backend pytest tests passing (100%).
- **Frontend Verification:**
  - TypeScript build (`tsc -b && vite build`) passing with 0 errors.

---

## 11. Step 5 — SafeSphere Safety Map

Step 5 delivers an interactive, community-first safety map built on Leaflet and OpenStreetMap, seamlessly connected to Step 4's live GPS telemetry, journey tracking, and nearby public hazard data without third-party vendor lock-in.

### 11.1 Map Setup & OpenStreetMap Architecture
- **Library Stack:** React 19, TypeScript, Leaflet (`leaflet` and `@types/leaflet`), `react-leaflet`.
- **Tile Provider:** OpenStreetMap standard raster tiles:
  `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
  Attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`.
- **Modular Provider Agnostic Architecture:** Tile endpoints and subdomains are configurable props in `SafeSphereMap.tsx`, allowing replacement with custom tiles (e.g. Mapbox, Stadia, CARTO Dark Matter, self-hosted tile server) without rewriting the map layer logic or marker components.

### 11.2 Reusable Map Components (`frontend/src/components/map/`)
1. **`SafeSphereMap.tsx`:**
   - Central map container accepting configurable props:
     - `userLocation`: `{ latitude, longitude, accuracy }` from `LocationContext`
     - `reports`: List of `MapSafetyReport` objects
     - `helpPoints`: List of `MapHelpPoint` objects
     - `hotspots`: List of `MapHotspot` safety clusters
     - `activeJourney`: Current active or paused journey
     - `recordedJourneyPoints`: GPS breadcrumb coordinates for active/historic trips
     - `searchResult`: Geocoded search destination
     - `filters`: Layer visibility toggles
     - `showControls`: Toggle for mobile or embeddable previews
   - Manages map lifecycle, tile rendering, center coordinates, and user pan state.
2. **`UserLocationMarker.tsx`:**
   - Renders animated pulsing blue marker at current GPS coordinates.
   - Plots semi-transparent accuracy circle matching GPS precision (±meters).
3. **`SafetyReportMarker.tsx` & `markerIcons.ts`:**
   - Visually distinct pins using category-specific icons and colored borders:
     - 💡 **Poor Lighting** (`poor_lighting`) &mdash; Amber
     - 🚧 **Road Obstruction** (`road_obstruction`) &mdash; Orange
     - 🛣️ **Road Damage** (`road_damage`) &mdash; Amber-Red
     - 👥 **Low Activity / Isolated Area** (`isolated_area`) &mdash; Indigo
     - 🚌 **Transport Issue** (`transport_issue`) &mdash; Blue
     - ⚠️ **General Safety Concern** (`general_safety`) &mdash; Rose
   - Category identification uses both symbol and badge color to adhere to accessibility standards.
4. **`HelpPointMarker.tsx`:**
   - Plots verified 24/7 havens:
     - 👮 **Police Station** (`police_station`)
     - 🏥 **Hospital** (`hospital`)
     - 🛡️ **Security Desk** (`security_desk`)
     - 🎓 **Campus Security** (`campus_security`)
     - 📍 **Verified Help Point** (`verified_help_point`)
   - Strictly renders records where `verified = true`.
5. **`HotspotLayer.tsx`:**
   - Soft circular polygon overlays representing community safety signal clusters.
   - Levels: `low`, `moderate`, `elevated`, `higher`.
   - Uses non-alarming terminology: *"Community Safety Signal Cluster"*, *"Elevated Estimated Risk Area"*.
6. **`MapControls.tsx` & `RecenterButton.tsx`:**
   - Accessible Zoom In (+), Zoom Out (-), Fullscreen toggle, and `[📍 My Location]` recenter button.
   - Recenter performs a smooth `map.flyTo()` animation to current user coordinates without locking the map during manual exploration.
7. **`MapLegend.tsx`:**
   - Expandable and collapsible floating legend detailing all map pin categories and signal layers.
8. **`MapFilters.tsx`:**
   - Slide-over drawer and mobile-friendly sheet allowing granular filtering:
     - Safety report categories
     - Help point classifications
     - Safety hotspot visibility
     - Quick "Select All" and "Reset" controls
9. **`MapSearch.tsx`:**
   - Real-time location search powered by `geocodingService.ts`.
   - 350ms input debounce, loading indicators, clear trigger, and temporary destination pin drop.
10. **`MapPopup.tsx` & `popupTemplates.ts`:**
    - Clean dark-mode cards showing title, category, description, severity, status, and creation time.
    - Zero reporter PII exposed.

### 11.3 Map Data Backend REST APIs
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/map/reports` | Public-safe safety reports with optional category, severity, status, lat, lon, radius |
| `GET` | `/api/v1/map/help-points` | Verified help points with optional point_type, lat, lon, radius |
| `GET` | `/api/v1/map/hotspots` | Community signal clusters with optional level, lat, lon, radius |
| `GET` | `/api/v1/map/data` | Consolidated viewport payload loading reports, help points, and hotspots in 1 call |
| `GET` | `/api/v1/help-points/nearby` | Proximity lookup of nearest verified 24/7 help points |
| `GET` | `/api/v1/safety-reports` | Full safety reports query endpoint |

### 11.4 Database Models & Schema Additions
- **`safety_reports` Table:**
  - Added `severity`: VARCHAR(20) (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - Added `verification_status`: VARCHAR(30) (`UNVERIFIED`, `COMMUNITY_VERIFIED`, `OFFICIAL_VERIFIED`, `REJECTED`)
- **`help_points` Table:**
  - Added `point_type`: VARCHAR(50) (`police_station`, `hospital`, `security_desk`, `campus_security`, `verified_help_point`)
- **`hotspots` Table:**
  - `id`: UUID (Primary Key)
  - `latitude`, `longitude`: Float
  - `radius`: Float (in meters)
  - `level`: VARCHAR(20) (`low`, `moderate`, `elevated`, `higher`)
  - `label`: VARCHAR(150)
  - `source`: VARCHAR(100)
  - `created_at`, `updated_at`: DateTime (UTC)

### 11.5 Geocoding Service (`geocodingService.ts`)
- Utilizes the OpenStreetMap Nominatim Geocoding API (`https://nominatim.openstreetmap.org/search`).
- Sends custom `User-Agent: SafeSphere-SafetyApp/1.0` header.
- Formats addresses and bounds into clean coordinates.
- Includes local offline demo fallback for resilience when offline or rate-limited.

### 11.6 Home Dashboard & Journey Map Integration
- **Home Dashboard (`SafeMapPreview.tsx`):**
  - Directly embeds `SafeSphereMap` showing live GPS telemetry, nearby hazard pins, and verified help points.
  - `[Open Safety Map]` navigates straight to `/map`.
- **Journey Map Integration (`MapPage.tsx` & `JourneyHistoryList.tsx`):**
  - Automatically detects active journey from Step 4.
  - Renders Start point 📍, Destination 🎯, live user position 🔵, and recorded breadcrumb polyline (`L.polyline`).
  - Journey history modal visualizes completed routes with full GPS path fidelity.

### 11.7 Location Privacy & Security Safeguards
- **Zero Reporter PII:** The backend serialization schema (`SafetyReportMapItem`) strictly strips `user_id`, reporter name, phone number, and email. Public map queries return only anonymous community hazard data.
- **No Broadcast of User Location:** The user's live coordinates are solely rendered within their own authenticated client session and never broadcast to public map endpoints.
- **Input Sanitization:** Proximity queries enforce valid latitude (-90 to 90), longitude (-180 to 180), and bounded search radii (0.1km to 100km).

### 11.8 Testing Instructions
- **Run Backend Tests:**
  ```bash
  cd backend
  .venv\Scripts\python.exe -m pytest tests -v
  ```
  *Result: 38 passed (100% test pass rate).*
- **Run Frontend Build:**
  ```bash
  cd frontend
  npm run build
  ```
  *Result: Clean TypeScript compilation and Vite production bundle generated with 0 errors.*
- **Interactive Verification:**
  1. Open `http://localhost:5173/map` to view current position, accuracy circle, and seeded markers.
  2. Search for any location in the search bar and verify map flies to destination.
  3. Open Filter drawer, uncheck categories, and verify markers filter dynamically.
  4. Click `[📍 My Location]` to test smooth recenter animation.
  5. Start a Journey in `/journey`, switch to `/map`, and observe active journey start/destination pins and path polyline.

### 11.9 Known Limitations
- Free-tier OpenStreetMap Nominatim geocoding enforces a 1 request/second usage limit; client-side debouncing (350ms) protects against excessive calls.
- In-memory Haversine distance calculations are used for the SQLite developer database; production deployments on PostgreSQL can leverage the PostGIS extension (`ST_DWithin`) for indexed spatial lookups.

---

## 12. Step 6 — Community Safety Reporting System

Step 6 delivers an intuitive, fast, and responsible citizen safety reporting engine. Commuters can document environmental hazards, infrastructure failures, or isolated stretches using concise text, attach their live GPS location or pick coordinates on an interactive map, and instantly publish community safety intelligence without exposing their personal identity.

> **Note on AI Classification:** Step 6 provides user-submitted text safety reporting. AI-assisted classification and automated threat scoring will be added in Step 7 using Google Gemini.

### 12.1 Report Categories & Taxonomy
SafeSphere categorizes safety hazards using a standardized, accessible symbol system:
- 💡 **Poor Lighting** (`poor_lighting`) &mdash; Dark alleys, non-functional streetlights, unlit pedestrian paths.
- 🛣️ **Road Damage** (`road_damage`) &mdash; Dangerous potholes, broken footpaths, open excavation trenches, missing utility covers.
- 🚧 **Road Obstruction** (`road_obstruction`) &mdash; Construction debris, fallen trees, illegal barricades blocking safe foot passage.
- 👥 **Isolated Area** (`isolated_area`) &mdash; Deserted stretches with little to no foot traffic, lack of natural surveillance.
- 🚌 **Transport Issue** (`transport_issue`) &mdash; Stranded commutes, abandoned bus stops, non-operational transit points.
- ⚠️ **General Safety Concern** (`general_safety`) &mdash; Contextual civic hazards or environmental concerns.
- ❓ **Other** (`other`) &mdash; Other civic safety observations requiring municipal attention.

### 12.2 Severity Levels
- **Low:** Minor issue that may need maintenance or civic attention.
- **Medium:** Issue that could affect pedestrian safety, visibility, or movement.
- **High:** Serious safety concern requiring prompt attention.
*Note: Severity represents observed physical or environmental obstruction, not a definitive prediction of personal danger.*

### 12.3 Report Lifecycle & Status Progression
- **Submission:** Initial state is provisioned as `status = "OPEN"`, `verification_status = "PENDING"`.
- **Review:** Progression to `status = "IN_REVIEW"` or `verification_status = "VERIFIED"` based on civic or trusted circle confirmations.
- **Resolution:** Marked as `status = "RESOLVED"` once civic authorities or community members confirm the issue has been repaired or cleared.
- **Rejection:** Marked as `status = "REJECTED"` if flagged as spam, invalid, or resolved.

### 12.4 Location Selection Strategies
1. **Option A &mdash; Current GPS Location:**
   - Connects to Step 4's `useLocation()` hook from `LocationContext`.
   - Handles permission states (Granted, Denied, Unavailable, Timeout) with a retry CTA.
   - Performs automated reverse geocoding via `GeocodingService.reverseGeocode()` to derive a human-readable neighborhood/street label.
2. **Option B &mdash; Interactive Map Picker:**
   - Opens an interactive Leaflet modal powered by `SafeSphereMap`.
   - Commuters can pan across the city and tap/click anywhere to place a pin.
   - Automatically reverse geocodes the selected marker position.

### 12.5 Database Model (`safety_reports` Table)
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | Primary Key |
| `user_id` | UUID | Foreign Key &rarr; `users.id`, strips on public serialization |
| `report_type` | VARCHAR(50) | Modality: `text` (active), `voice` / `image` (Step 8) |
| `category` | VARCHAR(100) | Validated taxonomy category (`poor_lighting`, etc.) |
| `title` | VARCHAR(200) | Brief report headline |
| `description` | TEXT | Observation narrative (5-1000 characters) |
| `severity` | VARCHAR(50) | `LOW`, `MEDIUM`, `HIGH` |
| `latitude` | FLOAT | GPS Latitude (-90 to 90) |
| `longitude` | FLOAT | GPS Longitude (-180 to 180) |
| `location_label` | VARCHAR(255) | Human-readable address / landmark |
| `status` | VARCHAR(50) | `OPEN`, `IN_REVIEW`, `RESOLVED`, `REJECTED` |
| `verification_status` | VARCHAR(50) | `PENDING`, `VERIFIED`, `REJECTED` |
| `verification_count` | INTEGER | Community verification counter (default 0) |
| `created_at` | TIMESTAMPTZ | Automatic UTC submission timestamp |
| `updated_at` | TIMESTAMPTZ | Automatic UTC update timestamp |

### 12.6 Backend REST APIs
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/reports` | Authenticated | Submits new report with server-side validation & duplicate throttling |
| `GET` | `/api/v1/reports/me` | Authenticated | Retrieves current user's submitted safety reports history |
| `GET` | `/api/v1/reports/{id}` | Public / Auth | Report detail view (strips reporter PII for non-owners) |
| `DELETE` | `/api/v1/reports/{id}` | Owner / Admin | Deletes submitted report (returns 403 Forbidden for non-owners) |
| `GET` | `/api/v1/reports/nearby` | Public | Spatial proximity query returning nearby public reports |

### 12.7 Duplicate Report Throttling
- Prevents accidental spam or rapid repeated submissions.
- If the same user submits a report with the same category within ~100 meters within a 15-minute window, the API responds with `HTTP 409 Conflict`.
- Frontend displays an actionable alert: *"You recently submitted a similar report for this location."* with a direct `[View Existing Report]` button.

### 12.8 Privacy & Responsible Reporting Protections
- **Zero Reporter PII on Map:** Public map and nearby endpoints serialize reports using `SafetyReportPublicResponse`, strictly omitting `user_id`, reporter name, phone number, and email.
- **Responsible Reporting Safeguards:** UI enforces factual, environmental observations and reminds users:
  > *"Only report observations or environmental concerns that you genuinely experienced. Please avoid accusing specific individuals, publishing personal identities, or making unsupported allegations."*
- **Unsaved Changes Prompt:** If a commuter begins writing a report and attempts to exit, a confirmation prompt prevents accidental loss of entered data.

### 12.9 Frontend Components (`frontend/src/components/report/`)
- `ReportForm.tsx`: Progressive workflow managing input, validation, review, and success states.
- `ReportCategorySelector.tsx`: Category cards with visual symbols and descriptions.
- `ReportSeveritySelector.tsx`: Low / Medium / High impact selectors with educational tooltips.
- `ReportDescription.tsx`: Textarea with character count (5-1000) and responsible reporting notice.
- `ReportLocationPicker.tsx`: Dual-mode location picker with GPS auto-detection and Leaflet map modal.
- `ReportReview.tsx`: Pre-submission confirmation card with mini Leaflet map preview.
- `ReportSuccess.tsx`: Post-submission confirmation with actions to view report or locate on Safety Map.
- `ReportHistory.tsx`: History list of user's submitted reports with category filter chips.
- `ReportCard.tsx`: Individual report summary card with status badges and relative timestamp.
- `ReportStatusBadge.tsx`: Visual status indicators for review and verification states.
- `ReportEmptyState.tsx`: Friendly placeholder for users with zero reports.
- `ReportDetailPage.tsx` (`/report/:id`): Full report detail view with interactive map preview, timestamps, status badges, and owner-only delete action.

### 12.10 Testing Instructions
- **Run Backend Test Suite:**
  ```bash
  cd backend
  .venv\Scripts\python.exe -m pytest tests -v
  ```
  *Result: 49 passed (100% test pass rate).*
- **Run Frontend Build:**
  ```bash
  cd frontend
  npm run build
  ```
  *Result: Clean TypeScript compilation and Vite bundle generated with 0 errors.*

---

---

## 13. Step 7 — Google Gemini AI Safety Classification

SafeSphere integrates Google Gemini AI using the official `google-genai` SDK to evaluate natural-language citizen reports.

### 13.1 Features Implemented
- **Standardized Hazard Taxonomy:** Maps natural language to standardized categories (`poor_lighting`, `road_damage`, `road_obstruction`, `isolated_area`, `transport_issue`, `general_safety`, `other`) and severities (`low`, `medium`, `high`).
- **Structured JSON Schema:** All Gemini responses are validated against Pydantic schema `SafetyReportAIAnalysisResult`.
- **Responsible AI & Privacy Protection:** System instructions strictly prohibit labeling individuals as criminals, predicting future crimes, or declaring zones definitively dangerous.
- **Prompt Injection Defense:** Treats user inputs strictly as untrusted observation data; never follows instructions or overrides inside user descriptions.
- **Graceful Fallback:** If AI is unavailable or unconfigured, manual reporting continues smoothly without disruption.

---

## 14. Step 8 — Multi-Modal Safety Reporting (Voice + Image Recognition with Gemini)

SafeSphere supports three seamlessly integrated hazard reporting modalities:
1. 📝 **Text Reporting**
2. 🎤 **Voice Reporting** (Speech-to-text transcription + safety classification)
3. 📷 **Image Reporting** (Multimodal visual hazard analysis with optional citizen description)

> **Core Principle:**  
> *"SafeSphere uses AI to assist with safety-report classification. AI output is a suggestion and must be reviewed by the user before submission."*  
> Gemini suggestions are strictly advisory. The user's explicit choices (category, severity, description, location) **always win**. Gemini never directly triggers emergency services, SOS, or modifies verified status.

---

### 14.1 Multi-Modal Architectural Flow
```
[ 📝 TEXT ]          [ 🎤 VOICE ]                  [ 📷 IMAGE ]
     │                     │                             │
     │            Audio Transcription                    │
     │                     │                             │
     │            Editable Transcript                    │
     │                     │                             │
     ▼                     ▼                             ▼
Google Gemini          Google Gemini                Google Gemini
Text Classification   Text Classification       Multimodal Visual Analysis
     │                     │                             │
     └─────────────────────┼─────────────────────────────┘
                           ▼
            Normalized Structured AI Schema
       { category, severity, summary, signal,
         confidence, suggested_action }
                           │
                           ▼
                   User Review & Edit
                           │
                           ▼
                   User Confirmation
                           │
                           ▼
                  Final Safety Report
            (status: OPEN, verification: PENDING)
                           │
                           ▼
                  SafeSphere Safety Map
```

---

### 14.2 Voice Reporting Architecture & Features
- **Browser MediaRecorder Integration:**
  - Feature-detects supported browser formats (`audio/webm;codecs=opus`, `audio/webm`, `audio/mp4`, `audio/ogg`, `audio/wav`).
  - Graceful microphone permission handling (`Microphone access is required to record a voice report.`) with retry and fallback to manual text reporting.
- **Recording Controls & Visualizer:**
  - `VoiceReportRecorder`: Live pulsing recording indicator, MM:SS timer with 60-second automatic duration cutoff.
  - Controls: Stop Recording, Cancel, and Record Again.
  - Audio playback preview with custom play/pause and size badge.
- **Speech-to-Text Transcription:**
  - Powered by Google Gemini audio processing (`GEMINI_TRANSCRIBE_MODEL=gemini-3.5-transcribe` with resilient automatic fallback to `GEMINI_MODEL=gemini-2.5-flash`).
  - Automatic language detection supporting English, Hindi, and regional speech.
- **Editable Transcript Card (`VoiceTranscriptCard`):**
  - Displays transcript verbatim and allows citizens to edit any terms before AI classification.
  - Polite fallback for unclear speech: *"SafeSphere could not confidently understand the recording."* with options to Record Again or Enter Text Manually.

---

### 14.3 Image Reporting Architecture & Features
- **Capture & Upload:**
  - Dual triggers: `[Take Photo]` (device camera) and `[Upload from Device]` (file picker), plus drag-and-drop zone.
  - Allowed image types: `image/jpeg`, `image/png`, `image/webp`.
  - Maximum upload size: 10 MB limit with client-side and server-side validation.
- **Image Preview & Dual Context:**
  - `ImagePreview`: Visual photo review with file name, size, and aspect ratio preservation.
  - Action buttons: Replace Photo, Remove Photo.
  - Optional accompanying text input (*"Describe what you want SafeSphere to look for"*). Gemini evaluates both visual evidence and citizen text for enhanced classification.
- **Responsible Visual AI Guidelines:**
  - Instructed strictly to identify physical hazards (e.g. broken streetlights, road craters, blocked walkways, damaged infrastructure).
  - Explicitly prohibited from identifying individuals, performing facial recognition, labeling people as criminals, or inferring intent.
  - Handles visual uncertainty: If an image does not clearly depict a safety hazard, classifies as `category: other` with summary: *"The image does not provide enough evidence to classify a specific safety issue."*

---

### 14.4 Storage Service Abstraction (`storage_service.py`)
- Modular service managing local development storage (`uploads/images` and `uploads/temp_audio`) and ready for Firebase Storage or cloud object store.
- **Temporary Audio Cleanup:** Raw voice recordings are held only during speech transcription and deleted immediately in `try...finally` blocks.
- **Security Protections:** Whitelisted MIME extensions, file size limits (10 MB), UUID-based randomized filenames, and path traversal protection against `..` directory traversal.
- **Private Media Serving:** `GET /api/v1/reports/media/images/{filename}` serves evidence photos only to authenticated users.

---

### 14.5 Backend Multi-Modal Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/reports/transcribe-audio` | Authenticated | Transcribes voice recording to plain text |
| `POST` | `/api/v1/reports/analyze-audio` | Authenticated | Transcribes audio and returns normalized AI classification |
| `POST` | `/api/v1/reports/analyze-image` | Authenticated | Analyzes photo evidence (+ optional description) with Gemini |
| `GET` | `/api/v1/reports/media/images/{filename}` | Authenticated | Serves stored private photo evidence |
| `POST` | `/api/v1/reports` | Authenticated | Submits final report (persists `report_type`, `transcript`, `media_url`) |

---

### 14.6 Environment Configuration
```env
# Google Gemini Multi-Modal Model Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TRANSCRIBE_MODEL=gemini-3.5-transcribe

# Multi-Modal Upload Limits
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_BYTES=10485760  # 10 MB
```

---

### 14.7 Testing & Verification
- **Run Backend Test Suite:**
  ```bash
  cd backend
  .venv\Scripts\python.exe -m pytest tests -v
  ```
  *Result: 89 passed (100% test pass rate across all modules).*
- **Run Frontend Build:**
  ```bash
  cd frontend
  npm run build
  ```
  *Result: Clean TypeScript compilation and Vite bundle generated with 0 errors.*
- **Run Frontend Linter:**
  ```bash
  cd frontend
  npm run lint
  ```
  *Result: 0 errors.*

---

---

## 15. Step 9 — Safety Pulse & Risk Estimation Engine

Step 9 introduces SafeSphere's deterministic, location-specific, time-aware territorial risk calculation engine. It transforms verified community safety reports and emergency infrastructure points into a transparent 0–100 numerical indicator and risk classification.

### 15.1 Core Philosophy & Governance Rules
1. **Deterministic Calculation:** The score is calculated deterministically on the backend via mathematical algorithms; generative AI (Gemini) is never used to synthesize or invent the final numerical score.
2. **No Default Safety (Absence $\neq$ Safety):** An area without reports does **not** receive an artificial score of 100. If no reliable verified data exists, the engine explicitly returns `status: "insufficient_data"` and `score: null` with the label: *"Insufficient data to estimate local safety conditions."*
3. **Decoupled Confidence:** Data confidence (`high`, `moderate`, `low`, `insufficient`) is tracked and reported separately from the Safety Pulse score.
4. **Responsible Reporting & Non-Discrimination:** Safety Pulse only reflects verified physical safety hazards. It never profiles individuals, neighborhoods, or sensitive demographics, and displays clear disclaimers that the score does not predict crime or guarantee safety.

### 15.2 Score Scale & Risk Categorization
| Score Range | Risk Classification | Description |
|---|---|---|
| **80 – 100** | Lower estimated risk | Well-documented sector with minimal active verified hazards and strong safe haven coverage |
| **60 – 79** | Moderate estimated risk | Minor or distant verified issues present |
| **40 – 59** | Elevated estimated risk | Multiple active hazards or high-severity unresolved issues nearby |
| **0 – 39** | Higher estimated risk | Immediate proximity to severe, critical, or persistent unresolved hazards |
| **null** | Unknown | Insufficient verified reports to compute a reliable estimate |

### 15.3 Mathematical Scoring Formula
For each verified, unresolved safety report $i$ within assessment radius $R$, its individual hazard penalty contribution $P_i$ is computed as:
$$P_i = W_{\text{severity}} \times D_{\text{geo}}(d_i, R) \times A_{\text{recency}}(t_i, \text{category}) \times T_{\text{context}}(\text{category}, \text{time})$$

Where:
1. **Base Severity Weights ($W_{\text{severity}}$):**
   - `LOW`: 6.0 pts
   - `MEDIUM`: 14.0 pts
   - `HIGH`: 24.0 pts
   - `CRITICAL`: 32.0 pts
2. **Geographic Distance Decay ($D_{\text{geo}}$):**
   - Haversine distance $d_i$ in meters.
   - At distance $0\text{ m} \rightarrow 1.0$; at radius perimeter $R \rightarrow 0.15$.
   - $D_{\text{geo}} = \max\left(0.15, 1.0 - 0.85 \times \frac{d_i}{R}\right)$
3. **Category-Aware Recency Aging ($A_{\text{recency}}$):**
   - Modeled via exponential half-life decay: $A_{\text{recency}} = \max\left(0.10, 0.5^{\frac{\Delta t}{H_{\text{category}}}}\right)$
   - `road_obstruction`: 48 hours (temporary blockages/debris clear quickly)
   - `transport_issue`: 168 hours (~7 days transit congestion/stop issues)
   - `poor_lighting`: 336 hours (~14 days streetlight out until municipal repair)
   - `general_safety`: 336 hours (~14 days)
   - `other`: 336 hours (~14 days)
   - `road_damage`: 720 hours (~30 days structural potholes persist longer)
   - `isolated_area`: 1440 hours (~60 days structural urban isolation)
4. **Time Context Sensitivity ($T_{\text{context}}$):**
   - Applies *only* when supported by relevant category logic:
     - `night` + (`poor_lighting` or `isolated_area`) $\rightarrow 1.2\times$ factor
     - `morning` / `afternoon` + `poor_lighting` $\rightarrow 0.8\times$ factor (daylight mitigation)
     - Time alone never penalizes a location without supporting hazard reports.
5. **Duplicate Throttling & Dampening:**
   - Repeated reports of the same category receive diminishing penalty impact to prevent coordinated or accidental report clustering:
   - $\text{Penalty}_{\text{dampened}} = P_i \times \frac{1.0}{1.0 + 0.5 \times k}$ where $k$ is previous occurrences of that category.
6. **Verified Help Haven Relief:**
   - Verified 24/7 Police Desks, Hospitals, and Safe Havens provide a mitigating reassurance buffer up to $-8.0$ penalty points (never wiping out severe hazards).
7. **Final Clamping:**
   $$\text{Score} = \text{clamp}(10, 100, \text{round}(100.0 - \text{Net Penalty}))$$

### 15.4 Report Eligibility Rules
- **Verified & Unresolved:** Fully eligible. Contributes according to severity, distance, recency, and category.
- **Verified & Resolved:** Excluded from active hazard penalty. Tracked in resolution count and historical trends.
- **Pending / Under Verification:** Appears on map with a pending badge; never contributes to the confirmed numerical score.
- **Rejected / Spam:** Strictly discarded; zero contribution.

### 15.5 Real vs. Unavailable vs. Development Fixture Data
- **Real Backend Data:**
  - Verified user and authority safety reports (`SafetyReport` table).
  - Verified 24/7 emergency safe havens (`HelpPoint` table).
  - Exact Haversine coordinates and verified resolution timestamps.
- **Data Sources Explicitly Marked Unavailable:**
  - Real-time municipal lighting sensors (Marked unavailable, never fabricated).
  - Live crowd telemetry feeds (Marked unavailable, never fabricated).
  - Real-time transit surveillance feeds (Marked unavailable, never fabricated).
- **Development Fixtures:**
  - Clearly isolated test coordinates (`TEST_LAT=25.1234, TEST_LON=85.5678`) utilized exclusively in automated pytest suites with automated setup/teardown cleanup.

### 15.6 Data Confidence & Freshness Methodology
- **Confidence:**
  - `insufficient`: 0 verified reports and 0 help points.
  - `low`: 1 verified report or only nearby help points.
  - `moderate`: $\ge 2$ verified reports.
  - `high`: $\ge 4$ verified reports spanning $\ge 2$ distinct categories.
- **Freshness:**
  - `fresh`: newest relevant report $\le 24$ hours old.
  - `moderate`: newest report $\le 7$ days old.
  - `limited`: newest report $\le 30$ days old.
  - `stale`: newest report $> 30$ days old.

### 15.7 Backend Reusable Service Interface
In `app.services.safety_pulse_service`:
- `calculate_safety_pulse(db, latitude, longitude, radius_meters, time_context)`
- `get_location_safety_assessment(db, latitude, longitude, radius_meters, time_context)` *(Interface for Step 10 Safety-Aware Routing waypoints)*
- `get_nearby_safety_signals(db, lat, lon, radius_meters)`
- `calculate_report_contribution(report, distance_m, radius_m, now, time_context)`
- `calculate_data_confidence(...)`
- `calculate_data_freshness(...)`
- `get_safety_pulse_history(db, latitude, longitude, radius_meters, time_range)`

### 15.8 Safety Pulse API Endpoints
| Method | Endpoint | Access | Parameters | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/safety-pulse` | Public / App | `latitude`, `longitude`, `radius` (default 500m), `time_context` | Real-time territorial risk calculation with breakdown |
| `GET` | `/api/v1/safety-pulse/history` | Public / App | `latitude`, `longitude`, `radius`, `time_range` (`7d`, `30d`, `90d`) | Real database timeline snapshots and resolution trend |

### 15.9 Frontend Components & Integration
1. **`SafetyPulseCard` (`components/safety-pulse/SafetyPulseCard.tsx`):**
   - Displays 0–100 score with risk classification badges (`Lower`, `Moderate`, `Elevated`, `Higher`).
   - Displays decoupled Data Confidence, Data Freshness, and Last Assessed timestamp.
   - Interactive radius selector (`250m`, `500m`, `1km`, `2km`) and time context selector (`Neutral`, `Morning`, `Afternoon`, `Evening`, `Night`).
   - Strongest signals cards with individual distance, category, and severity pills.
   - Handles four distinct states: Location Disabled, Backend Unavailable, Insufficient Data, and Available Score.
   - Concise responsible use disclaimer footer.
2. **`SafetyPulseExplanation` (`components/safety-pulse/SafetyPulseExplanation.tsx`):**
   - Modal triggered via *"Why this score?"* button.
   - Displays transparent data provenance: verified hazards, resolved count, help havens, and pending review.
   - Itemized list of contributing reports with individual distance and point deduction amounts.
   - Full list of data sources marked unavailable to ensure transparency.
3. **Safety Map Integration (`pages/MapPage.tsx` & `components/map/SafeSphereMap.tsx`):**
   - Dedicated *"Safety Pulse"* control pill in map header showing current score summary.
   - Clicking any map point or recentering opens localized Safety Pulse calculation for that exact sector.
   - Visual Leaflet dashed sector circle showing the exact assessment radius overlay.
4. **Home Dashboard Integration (`pages/HomePage.tsx`):**
   - Prominently positioned alongside GPS location card, dynamically loading proximity intelligence.

### 15.10 Testing & Verification
- **Run Step 9 Specific Backend Test Suite:**
  ```bash
  cd backend
  .venv\Scripts\python.exe -m pytest tests/test_step9_safety_pulse.py -v
  ```
  *Result: 17 passed (100% test pass rate across all requirement scenarios A through N).*
- **Run Full Backend Test Suite:**
  ```bash
  cd backend
  .venv\Scripts\python.exe -m pytest tests -v
  ```
  *Result: 116 passed across all steps (Steps 1–10).*
- **Run Frontend Type Check:**
  ```bash
  cd frontend
  npx tsc --noEmit
  ```
  *Result: 0 errors.*

---

## 16. Step 10 — Safety-Aware Routing & Route Comparison

Step 10 delivers safe travel intelligence: enabling users to enter destinations, compare multiple real road route alternatives, evaluate distance, travel time, and route-corridor Safety Pulse risk metrics, and choose routes with lower estimated risk when supporting civic safety data exists.

### 16.1 Core Principle
> *"Do not optimize only for the shortest route. Help people make more informed travel decisions using available safety information."*

Users retain 100% authoritative control over their final route choice. SafeSphere presents real road metrics, transparent safety signal indicators, data coverage percentages, and explicit disclaimers without making false safety guarantees.

### 16.2 Routing Technology & Provider Abstraction
SafeSphere implements a provider-agnostic routing interface (`BaseRoutingProvider`) in `backend/app/services/routing_service.py` to decouple routing computation from specific external vendors:
- **`OSRMProvider` (Default):** Connects to OpenStreetMap OSRM servers (`https://router.project-osrm.org`) for foot/walking and driving geometries with full alternative route generation.
- **`OpenRouteServiceProvider`:** Connects to OpenRouteService API with bearer token authentication when configured.
- **`DevFixtureRoutingProvider`:** Offline fallback provider that computes realistic OpenStreetMap corridor alternatives (labeled accurately as `provider="dev_fixture"`). Ensures deterministic testing and offline hackathon capability if external networks or sandbox environments block outbound routing traffic.

### 16.3 Configuration & Environment Variables
The routing system is entirely configured via backend environment variables (defined in `backend/app/core/config.py` and `.env.example`):
```bash
# Routing Engine Configuration (Step 10)
ROUTING_PROVIDER="osrm"                          # Options: "osrm", "openrouteservice", "dev_fixture"
ROUTING_BASE_URL="https://router.project-osrm.org" # Base endpoint for routing requests
ROUTING_API_KEY=""                               # Optional API key for commercial providers (e.g. ORS)
ROUTING_TIMEOUT_SECONDS=8.0                     # HTTP timeout for routing requests
ROUTE_SAMPLE_INTERVAL_METERS=250.0               # Spatial interval for sampling corridor points
ROUTE_MAX_SAMPLE_POINTS=25                       # Maximum sample points evaluated per route candidate
```

### 16.4 Route Alternatives & Ranking Logic
When alternatives are requested, the service categorizes routes using real geometric and safety indicators:
- **`fastest`:** The candidate with the lowest travel duration (`duration_seconds`).
- **`shortest`:** The candidate with the minimum spatial distance (`distance_m`).
- **`lower_estimated_risk`:** The candidate exhibiting the highest corridor Safety Pulse score and highest data coverage, with fewer high-severity hazards.
- **`alternative`:** Secondary viable road corridors.

### 16.5 Route-Level Safety Pulse Spatial Evaluation
Implemented in `backend/app/services/route_safety_service.py`:
1. **Geometric Sampling:** Samples points along the GeoJSON `LineString` coordinates at a configurable distance interval (default: 250m, max 25 points). Start and end points are always sampled.
2. **Corridor Signal Querying:** Evaluates a 300-meter buffer around each sample point, querying active verified unresolved safety reports and 24/7 verified help havens from the Step 9 Safety Pulse service.
3. **Spatial Deduplication:** Reports and help points located near adjacent sample points are deduplicated using their unique IDs, preventing the same report from artificially dominating a route.
4. **Data Coverage Calculation:**
   $$\text{Coverage} = \frac{\text{Assessed Sample Points with Civic Data}}{\text{Total Route Sample Points}}$$
   - High Coverage: $\ge 65\%$
   - Moderate Coverage: $40\% - 64\%$
   - Low Coverage: $20\% - 39\%$
   - Insufficient Coverage: $< 20\%$

### 16.6 Transparent Insufficient Data Handling
- When corridor coverage is $< 25\%$, the estimated risk status is explicitly set to `insufficient_data` or `unknown`, and the numerical score is set to `null`.
- The UI renders an amber warning banner: *"This corridor passes through areas with low verified reporting density. SafeSphere does not assume unmonitored routes are safer."*
- Unassessed routes are **never** labeled as safe.

### 16.7 Mandatory Disclaimer
Every route card and detail drawer displays the mandatory legal disclaimer:
> *"Route safety assessments are estimates based on available information. They do not guarantee safety or predict crime."*

### 16.8 Journey Model & GPS Tracking Integration
The existing `Journey` model (`backend/app/models/journey.py`) was extended with planned route metadata:
- `selected_route_id`: Provider route identifier.
- `route_provider`: Provider name (`"osrm"`, `"dev_fixture"`, etc.).
- `route_geometry`: GeoJSON LineString coordinates stored as JSON Text.
- `planned_distance_m`: Planned travel distance.
- `planned_duration_seconds`: Planned travel time.
- `estimated_risk_level`: Estimated risk (`"lower"`, `"moderate"`, etc.).
- `route_data_coverage`: Coverage fraction (0.0 to 1.0).
- `route_assessed_at`: Timestamp of safety calculation.

**Strict Privacy & History Separation:**
Planned route geometry is stored in `route_geometry`, while actual GPS movement is recorded independently in the `JourneyLocationPoint` breadcrumb entity (`journey_location_points` table). Planned geometry is never overwritten by live GPS readings.

### 16.9 API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/routes/alternatives` | Calculates real candidate routes with Safety Pulse corridor risks, data coverage, top signals, and recommendation. |
| `POST` | `/api/v1/routes/assess-safety` | On-demand corridor safety assessment for arbitrary geometry. |
| `GET` | `/api/v1/routes/provider-info` | Returns routing engine operational status and configuration. |

### 16.10 Frontend Components
1. **`DestinationSearch` (`components/route/DestinationSearch.tsx`):**
   - Place, landmark, and street autocomplete using Nominatim geocoding with local fallback.
   - 350ms input debouncing, loading spinner, clear button, and keyboard/touch selection.
2. **`OriginDestinationForm` (`components/route/OriginDestinationForm.tsx`):**
   - "Use My Current Location" GPS toggle, origin search, destination search, coordinate swap, and walking/driving mode selector.
3. **`RouteComparisonCard` (`components/route/RouteComparisonCard.tsx`):**
   - Route Type badge (`Fastest`, `Shortest`, `Lower Estimated-Risk`).
   - Distance and estimated travel time.
   - Safety Pulse assessment pill and data coverage progress bar.
   - Top verified safety signals with distance offsets.
   - Collapsible limitations drawer and mandatory disclaimer.
4. **`RouteSelectionControls` (`components/route/RouteSelectionControls.tsx`):**
   - Prioritization tabs: "Safety-Aware" (Recommended), "Fastest", "Shortest".
   - Start Journey CTA button linking selected route to active GPS monitoring.
5. **`RoutePlanner` (`components/route/RoutePlanner.tsx`):**
   - Container component orchestrating search, route calculation, comparison, and selection.
6. **`SafeSphereMap` Route Layer (`components/map/SafeSphereMap.tsx`):**
   - Renders candidate route polylines in distinct visual styles. Selected route is drawn with glowing highlight; lower-risk route is drawn in emerald.
   - Clicking route cards or lines highlights the path and automatically fits Leaflet bounds with padding.
   - Active journeys display planned route corridor as a distinct dashed guideline underneath live GPS breadcrumbs.

### 16.11 Testing & Verification
- **Run Step 10 Backend Test Suite:**
  ```bash
  cd backend
  .venv\Scripts\python.exe -m pytest tests/test_step10_safety_routing.py -v
  ```
  *Result: 10 passed (100% test pass rate covering origin/dest validation, coordinate boundary checks, geometry sampling, signal deduplication, insufficient data handling, standalone assessment, and planned journey database persistence).*
- **Run Full Regression Test Suite:**
  ```bash
  cd backend
  .venv\Scripts\python.exe -m pytest tests -v
  ```
  *Result: 116 passed across all steps (Steps 1–10).*
- **Frontend TypeScript Verification:**
  ```bash
  cd frontend
  npx tsc --noEmit
  ```
  *Result: 0 errors.*

### 16.12 Google Maps Platform & Vector Navigation Setup

SafeSphere features a professional, Google Maps-inspired navigation experience with vector map rendering, 3D building visualization, camera tilt & rotation, and the Google Routes API.

#### Environment Variables Configuration
Configure the following keys in your environment files:

**Frontend (`frontend/.env`):**
```env
# Google Maps JavaScript API (Client-side)
VITE_GOOGLE_MAPS_MAPS_API_KEY=your_google_maps_browser_key
# Vector Map ID with tilt & rotation enabled (configured in Google Cloud Console)
VITE_GOOGLE_MAP_ID=your_vector_map_id
```

**Backend (`backend/.env`):**
```env
# Google Routes API (Server-side Directions v2 computeRoutes)
GOOGLE_MAPS_ROUTES_API_KEY=your_google_routes_backend_key
```

#### Google Cloud Console Setup Steps:
1. **Enable Google Cloud APIs:**
   - In [Google Cloud Console](https://console.cloud.google.com/), navigate to **APIs & Services > Library**.
   - Enable:
     - **Maps JavaScript API** (renders client-side vector tiles, road labels, and 3D buildings).
     - **Routes API** (`directions/v2:computeRoutes` for Car, Two-Wheeler, Bicycle, and Walking).
     - **Places API** (for origin and destination autocomplete).
2. **Configure Vector Map ID for 3D Buildings & Tilt:**
   - Navigate to **Google Maps Platform > Map Management**.
   - Click **Create Map ID**.
   - Map Type: **JavaScript**, Raster/Vector: **Vector**.
   - Enable **Tilt** and **Heading/Rotation**.
   - Copy the generated Map ID and assign it to `VITE_GOOGLE_MAP_ID`.
3. **API Key Security & Restrictions:**
   - **Frontend Key (`VITE_GOOGLE_MAPS_MAPS_API_KEY`):**
     - Set Application Restriction to **Websites (HTTP referrers)**.
     - Add `http://localhost:5173/*`, `http://localhost:3000/*`, and your production domain.
     - Restrict API scope to **Maps JavaScript API** and **Places API**.
   - **Backend Key (`GOOGLE_MAPS_ROUTES_API_KEY`):**
     - Kept strictly server-side in `backend/.env`.
     - Set Application Restriction to **IP addresses** (your backend server/cluster IP).
     - Restrict API scope to **Routes API**.
4. **Billing Notice:**
   - Google Maps Platform requires a linked billing account. Google provides a recurring $200 monthly free tier credit which covers thousands of vector map loads and route calculations each month.
5. **Clean Fallback Engine:**
   - If Google Maps credentials are not configured, SafeSphere provides a clean, watermark-free OpenStreetMap engine via the top-right toggle, ensuring no broken UI or CARTO watermark is ever presented.

---

## 17. Roadmap / Future Steps
- **Step 1:** Foundation & Architecture (COMPLETED)
- **Step 2:** Authentication, User Profile & Guardian Connect (COMPLETED)
- **Step 3:** Home Dashboard, Navigation & Responsive UI (COMPLETED)
- **Step 4:** Live GPS Location & Journey Tracking (COMPLETED)
- **Step 5:** SafeSphere Safety Map, Layers & Geocoding (COMPLETED)
- **Step 6:** Real Safety Reporting System (COMPLETED)
- **Step 7:** Google Gemini AI Text Classification & Hazard Severity Evaluation (COMPLETED)
- **Step 8:** Multi-Modal Safety Reporting — Voice & Image Recognition with Gemini (COMPLETED)
- **Step 9:** Safety Pulse Territorial Risk Calculation Engine (COMPLETED)
- **Step 10:** Safety-Aware Route Recommendation & Route Comparison (COMPLETED)
- **Step 11:** "I Feel Unsafe" Mode & Preventive Safety Assistance (COMPLETED)
- **Step 12:** Trusted Circle Emergency Dispatch & SOS Panic Trigger
- **Step 13:** Community Incident Verification & Resolution Workflow
- **Step 14:** Organization, Campus & Municipal Admin Dashboard

---

## 18. Step 11 — "I Feel Unsafe" Mode & Preventive Safety Assistance

### 18.1 Core Principle & Architecture
The **"I Feel Unsafe"** mode provides proactive, preventive safety support when commuters, night-shift workers, or students feel uneasy, anxious, or notice suspicious activity, even when they do **not** want to trigger an immediate emergency SOS siren.
- **Preventive vs. Reactive:** "I Feel Unsafe" activates discreet watchdog telemetry, lists nearby physically verified 24/7 havens, suggests lower-estimated-risk route alternatives, and prepares contact notifications.
- **SOS Separation:** Emergency SOS is kept strictly separated for immediate sirens and panic dispatch.
- **User Agency:** Activating Safety Mode does not automatically call the police or publicly broadcast user coordinates.

### 18.2 Activation & Deactivation Flows
1. **Activation Trigger:**
   - User taps the prominent **"I Feel Unsafe"** quick-action card on the Home Dashboard or Safety Mode navigation link (`/safety-mode?activate=true`).
   - Modal explains: *"Activate preventive safety support for your current journey. SafeSphere can display nearby verified help points, help you review available routes, and notify your selected trusted contacts when contact notifications are configured."*
   - User reviews GPS permission status, journey link state, and can attach an optional context note before confirming.
2. **Active Mode Interface (`/safety-mode`):**
   - Live **SAFETY MODE ACTIVE** visual indicator with pulsing watchdog telemetry status.
   - GPS coordinate and accuracy tracking (reusing Step 4 `LocationContext`).
   - Active journey monitor displaying origin, destination, planned route geometry, and current travel status.
   - Quick Action Matrix:
     - `[View Safety Map]` &rarr; Interactive map navigation with route & haven overlays.
     - `[Find Nearby Help]` &rarr; Smooth scroll to nearby verified safe havens.
     - `[Review Routes]` &rarr; Safety Pulse route reassessment dialog for lower-risk alternatives.
     - `[Manage Trusted Circle]` &rarr; Emergency contacts management.
     - `[Emergency SOS]` &rarr; Direct trigger for emergency dispatch.
     - `[I'm Safe Now — End Safety Mode]` &rarr; Secure session termination modal.
3. **"I'm Safe Now" Deactivation:**
   - Confirmation prompt: *"Are you sure you want to end Safety Mode?"*
   - Selection of deactivation reason (*Reached destination safely*, *Situation resolved*, *Accidental activation*, etc.).
   - Marks `SafetyModeSession.status = "ENDED"` with deactivation timestamp.
   - **Journey Preservation:** Ending Safety Mode does **not** terminate an independently active journey unless the user explicitly chooses to end the journey in Step 4 controls.

### 18.3 Database Model (`SafetyModeSession`)
Entity implemented in `backend/app/models/safety_mode.py`:
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to `User`, indexed)
- `journey_id`: UUID (Nullable Foreign Key to `Journey`, indexed)
- `status`: String (`ACTIVE`, `ENDED`, `INTERRUPTED`)
- `activated_at`: DateTime (UTC, non-nullable)
- `deactivated_at`: DateTime (UTC, nullable)
- `activation_latitude`: Float (Nullable)
- `activation_longitude`: Float (Nullable)
- `last_latitude`: Float (Nullable)
- `last_longitude`: Float (Nullable)
- `last_location_update`: DateTime (UTC, nullable)
- `notification_status`: String (`NOT_CONFIGURED`, `PENDING`, `SENT`, `FAILED`)
- `deactivation_reason`: String (Nullable)
- `user_note`: Text (Nullable, max 500 chars)
- `created_at` / `updated_at`: DateTime (UTC)

### 18.4 Backend REST APIs
All endpoints enforce bearer authentication and strict session ownership (`User A` cannot inspect or end `User B`'s session):
- `POST /api/v1/safety-mode/activate`: Idempotent session activation. Links active journey if present.
- `GET /api/v1/safety-mode/current`: Returns active session state, linked journey details, nearby verified help points, and guardian status.
- `POST /api/v1/safety-mode/{session_id}/end`: Validates ownership, transitions status to `ENDED`, preserves active journey tracking.
- `GET /api/v1/safety-mode/history`: Returns user's private audit log of past Safety Mode sessions.
- `GET /api/v1/safety-mode/help-points/nearby`: Haversine-filtered list of verified 24/7 havens (police stations, hospitals, campus security).
- `GET /api/v1/safety-mode/{session_id}`: Retrieves specific session details for authorized owner.

### 18.5 GPS & Privacy Behavior
- Reuses the existing Step 4 `LocationContext` and browser Geolocation API.
- Does not track location when Safety Mode and journeys are inactive.
- If location permission is denied, Safety Mode remains fully operational; non-location features and honest fallback warnings are displayed.
- Location coordinates are never published to community map feeds.

### 18.6 Nearby Verified Help Points
- Queries physically verified `HelpPoint` records from Step 5 (`is_verified = True`).
- Computes true spherical Haversine distances from user's current GPS position.
- Displays emergency type (`POLICE`, `HOSPITAL`, `CAMPUS_SECURITY`, `TRANSIT_HUB`), 24/7 availability, address, and interactive map navigation.
- If no verified havens exist within search radius, an honest notification is displayed without fabricating points.

### 18.7 Route Reassessment
- Reuses Step 10 `routeService` and Safety Pulse risk estimation engine.
- Evaluates candidate routes (Fastest vs. Shortest vs. Lower Estimated-Risk) with confidence metrics and data coverage.
- Requires explicit user confirmation to change navigation routes; does not silently reroute the user.

### 18.8 Notification Status Truthfulness
- Notification status explicitly tracks `NOT_CONFIGURED`, `PENDING`, `SENT`, and `FAILED`.
- Because complete SMS/Push notification gateways belong to Step 12, the backend returns `NOT_CONFIGURED` when unconfigured, and the UI displays: *"Trusted-contact notifications will be available after setup."*

### 18.9 Minor / Guardian Connect Integration
- Automatically checks under-18 user profile status from Step 2.
- Distinguishes whether a guardian is linked and whether verification is `VERIFIED` or `PENDING`.
- Adults use Safety Mode freely without mandatory guardian linking.

### 18.10 Testing Instructions
- **Backend Test Suite:**
  ```bash
  cd backend
  .venv\Scripts\pytest tests/test_step11_safety_mode.py -v
  ```
  Runs 9 targeted test cases covering standalone activation, journey linking, GPS denial handling, minor/guardian verification, idempotency, ownership validation, and history.
- **Full Backend Suite:**
  ```bash
  cd backend
  .venv\Scripts\pytest -v
  ```
  Executes all 135 test cases spanning Steps 1 through 12.
- **Frontend Build & Typecheck:**
  ```bash
  cd frontend
  npm run build
  npm run lint
  ```

---

## 19. Step 12 — Trusted Circle, SOS & Guardian Alerts

Step 12 delivers reliable, permission-based emergency assistance, trusted contact network management, authorized live-location sharing, and automated guardian alert architecture for SafeSphere.

### 19.1 Trusted Circle Management (`/trusted-circle`)
- **Contact Creation & Relationship Mapping:** Users can add trusted contacts specifying contact name, phone number, optional email, and relationship (`Parent`, `Guardian`, `Friend`, `Sibling`, `Spouse`, `Partner`, `Roommate`, `Other`).
- **Adult Independence:** Adults manage their own Trusted Circle without mandatory guardian restrictions.
- **Granular Permissions Matrix:** Each contact possesses individually configurable boolean permissions:
  - `notify_journey_start`: Dispatches alert when traveler begins an active journey.
  - `notify_journey_end`: Dispatches alert when traveler safely concludes their journey.
  - `notify_safety_mode`: Dispatches alert when traveler triggers Step 11 "I Feel Unsafe" mode.
  - `notify_sos`: Dispatches immediate high-priority alert when traveler activates Emergency SOS.
  - `share_live_location`: Permits access to live travel corridor and breadcrumb tracking.
  - `notify_emergency_updates`: Dispatches follow-up notes and deactivation resolution reasons.

### 19.2 Contact Verification Lifecycle
- **Statuses:** `PENDING`, `VERIFIED`, `REJECTED`, `REVOKED`.
- **Truthful Verification State:** Phone numbers are never assumed to be verified. Contacts start in `PENDING` status.
- **Configurable Provider & Development Mock:**
  - When SMS provider credentials (`SMS_PROVIDER_API_KEY`) are unconfigured, SafeSphere operates in development mode, generating a deterministic test verification code (`123456`) clearly labelled as Development Mode in the UI.
  - Never marks unverified contacts as `VERIFIED`.

### 19.3 Guardian Connect for Users Under 18
- **Under-18 Detection Reuse:** Directly leverages the deterministic age calculation from Step 2 (`is_minor = true`).
- **Guardian Safeguarding:**
  - Confirms guardian relationship and consent status (`VERIFIED` and `ACCEPTED`).
  - Automatically includes verified guardian in journey-start, journey-end, Safety Mode, and SOS alert dispatches.
  - Permits live-location access only under authorized guardian-sharing policy.
  - If guardian verification or consent is pending, clearly displays that state and prevents false claims of active guardian protection.
  - Guardian access cannot cross user accounts.

### 19.4 Journey-Start & Journey-End Notifications
- **Event-Driven Backend Dispatches:** Connected directly to Step 4 `journeys.py` lifecycle (`create_journey` and `end_journey`).
- **Authorized Recipient Filtering:** Backend retrieves user profile, checks minor guardian status, and identifies only verified contacts with `notify_journey_start` or `notify_journey_end` enabled.
- **Deduplication & Idempotency:** Prevents repeated dispatches on network retries.
- **Auto-Revocation:** Ending a journey automatically revokes active live-location sharing sessions.

### 19.5 Protected Live-Location Sharing (`/shared-journey/:token`)
- **Cryptographically Secure Tokens:** 32-byte URL-safe cryptographically secure random tokens (`secrets.token_urlsafe(32)`).
- **Time-Limited & Scoped:** Default 4-hour validity with automatic expiration and immediate owner revocation.
- **Stale Telemetry Notice:** If traveler location has not updated within 5 minutes, an amber telemetry warning is displayed: *"Current location unavailable or stale. Last known location was recorded at [timestamp]."*
- **Standalone Mobile Interface:** Publicly accessible to authorized recipients holding the secure link without requiring an account. Includes Leaflet live map, real-time 10s auto-sync, route polyline preview, distance travelled, and one-touch national emergency dialers (112 / 911).

### 19.6 SOS Emergency System
- **1-Touch Prominent Trigger:** Accessible across SafeSphere headers, navigation drawer, and Quick Actions.
- **Confirmation Dialog:** Explains exact recipients (verified contacts + guardian), GPS data to be broadcasted, and provides immediate activation without delay.
- **Active Emergency Panel (`SOSActiveModal`):**
  - Displays real-time location coordinates, accuracy, and last update timestamp.
  - Live recipient outbox delivery statuses (`SENT`, `DELIVERED`, `UNAVAILABLE`, `FAILED`, `DEV_MOCK`).
  - Direct dialers for official emergency services (112 National Emergency / 911 Police).
  - Explicit End SOS confirmation dialog with deactivation reason recording.
- **Safety Mode Integration:** Keeps preventive assistance (Step 11) distinct from emergency distress (Step 12). Activating SOS while in Safety Mode reuses existing GPS telemetry without duplicating watchers.
- **Non-Interference:** Ending SOS does not prematurely cancel unrelated active journeys.

### 19.7 Notification Providers & Delivery Truthfulness
- **Provider Abstraction (`NotificationService`):**
  - Push Notifications: Firebase Cloud Messaging (FCM) when device registration tokens exist.
  - SMS Provider: Configurable SMS gateway (`SMS_PROVIDER`, `SMS_PROVIDER_API_KEY`, `SMS_PROVIDER_SENDER`).
- **Truthful Status Reporting:**
  - `DELIVERED`: Confirmed by provider webhook / receipt.
  - `SENT`: Dispatched to network gateway.
  - `DEV_MOCK`: Development simulation mode.
  - `UNAVAILABLE`: Gateway not configured in environment (never deceptively logged as sent).
  - `FAILED`: Provider error or invalid recipient.

### 19.8 Database Models & Schema
- `trusted_contacts`: id, user_id, contact_name, phone, email, relationship, verification_status, verification_code, notify_journey_start, notify_journey_end, notify_safety_mode, notify_sos, share_live_location, notify_emergency_updates, created_at, updated_at.
- `sos_sessions`: id, user_id, journey_id (nullable), status (`ACTIVE`, `ENDED`, `CANCELLED`), activated_at, ended_at, initial_latitude, initial_longitude, latest_latitude, latest_longitude, last_location_update, accuracy, emergency_notes, deactivation_reason, created_at, updated_at.
- `notification_logs`: id, user_id, event_id, recipient_id, recipient_name, recipient_phone, recipient_type, event_type, channel, delivery_status, provider_message_id, message_content, error_code, error_message, attempted_at, delivered_at, created_at.
- `journey_sharing_sessions`: id, user_id, journey_id, share_token, recipient_contact_id, is_active, expires_at, revoked_at, created_at, updated_at.

### 19.9 Required Environment Variables
```env
# Notification Providers (Step 12)
SMS_PROVIDER=mock                     # Options: twilio, msg91, mock
SMS_PROVIDER_API_KEY=                 # Provider API key / auth token
SMS_PROVIDER_SENDER=SafeSphere        # Sender ID / alphanumeric header
FIREBASE_CREDENTIALS_PATH=            # Optional path to service account JSON for live FCM
```

### 19.10 Testing Instructions
- **Backend Test Suite (Step 12):**
  ```bash
  cd backend
  .venv\Scripts\pytest tests/test_step12_trusted_circle_sos.py -v
  ```
- **Full Backend Suite:**
  ```bash
  cd backend
  .venv\Scripts\pytest -v
  ```
- **Frontend Production Build:**
  ```bash
  cd frontend
  npm run build
  npm run lint
  ```

---

## 20. Step 13 — Community Verification & Feedback System

Step 13 evolves SafeSphere into a community-driven safety intelligence network where citizens independently validate safety observations, dispute inaccurate reports, rate journey navigation and safety information usefulness, and confirm whether reported municipal/road hazards have genuinely been resolved.

### 20.1 Core Lifecycle Workflow
$$\text{Report} \longrightarrow \text{Community Observations} \longrightarrow \text{Verification Review} \longrightarrow \text{Resolution} \longrightarrow \text{Community Confirmation} \longrightarrow \text{Improved Safety Intelligence}$$

### 20.2 Distinct Operational States
SafeSphere strictly decouples citizen perception from authoritative determination:
1. **Community Feedback:** Unmoderated independent citizen observations (`CONFIRM_ISSUE`, `DISPUTE_ISSUE`, `CONFIRM_RESOLVED`, `REPORT_STILL_PRESENT`). Represented by public count tallies. A high count of confirmations does **not** automatically mark a report officially `VERIFIED`.
2. **Official Verification:** Authoritative administrative status (`PENDING`, `COMMUNITY_SUPPORTED`, `UNDER_REVIEW`, `VERIFIED`, `DISPUTED`, `REJECTED`) managed strictly through authorized reviewer roles (`SYSTEM_ADMIN`, `ORGANIZATION_ADMIN`, `ADMIN`).
3. **Resolution Confirmation:** Post-resolution feedback determining whether an issue officially marked `RESOLVED` remains genuinely resolved in the field. When users submit `REPORT_STILL_PRESENT`, the system transitions report status to `RESOLUTION_DISPUTED`, sets `reopen_requested = True`, flags it for review, and queues it for authorized reopening without deleting previous records.

### 20.3 Feedback Types & Taxonomies
Structured enum types constrained at database and schema layers:
- `CONFIRM_ISSUE`: Independent verification that reported hazard is currently present.
- `DISPUTE_ISSUE`: Contesting validity of report.
- `CONFIRM_RESOLVED`: Confirming reported issue has been cleared or repaired.
- `REPORT_STILL_PRESENT`: Contesting an official resolution because the issue persists.
- `DUPLICATE_REPORT`: Flagging report as a duplicate of an existing pinned incident.
- `INACCURATE_LOCATION`: Flagging incorrect geographical coordinates.
- `INACCURATE_CATEGORY`: Flagging miscategorized incidents.
- `GENERAL_FEEDBACK`: Descriptive remarks or platform feedback.
- `JOURNEY_EXPERIENCE`: Post-journey ratings and route guidance review.

### 20.4 One Vote Per User Rule
- Normalizes active feedback per user per report in the database (`CommunityFeedback.user_id + target_type + target_id`).
- When a user updates their observation, the existing record is safely updated and counters recalculate dynamically.
- Double-clicks and repeat submissions from the same account cannot artificially inflate counts or distort verification.

### 20.5 Duplicate Report Detection
- Deterministic proximity and category clustering: Identifies open or active reports (`OPEN`, `IN_REVIEW`, `RESOLUTION_DISPUTED`, `REOPENED`) within a 150m spatial corridor sharing the same category.
- Flags potential duplicates without automatic record deletion.
- Allows citizens and reviewers to cross-link duplicate pins while preserving the original historical submission.

### 20.6 Post-Journey Feedback & Safety Usefulness Ratings
Presented optionally upon reaching `COMPLETED` journey status (`JourneySummaryModal`):
1. **Overall Experience Rating:** 1 to 5 stars.
2. **Route Accuracy:** `MOSTLY_YES`, `PARTLY`, `NO`, `UNABLE_TO_JUDGE`.
3. **Safety Information Usefulness:** `USEFUL`, `PARTLY_USEFUL`, `NOT_USEFUL`, `INSUFFICIENT_DATA`.
4. **Optional Remarks:** Factual comments on sidewalks, lighting, or route safety.
*Safety Integrity Principle:* A positive journey experience is explicitly treated as quality feedback and does **not** artificially inflate the numerical Safety Pulse or prove an area is safe for everyone.

### 20.7 General Platform Feedback & Private History (`/feedback`)
- Accessible application-wide with 9 core focus categories:
  - App experience
  - Reporting experience
  - Map accuracy
  - Safety Pulse usefulness
  - Route guidance usefulness
  - Accessibility concerns
  - Technical problems
  - Feature suggestions
  - Other feedback
- Private History Tab (`/feedback/me`): Isolated history where authenticated citizens can view all their submitted votes, ratings, and feedback without public exposure.

### 20.8 Audit History Trail (`ReportAuditLog`)
Every significant verification, dispute, resolution, or moderation decision logs an auditable event with:
- Action (`COMMUNITY_CONFIRMED`, `COMMUNITY_DISPUTED`, `RESOLUTION_DISPUTED`, `COMMUNITY_RESOLVED_CONFIRMED`, `OFFICIALLY_VERIFIED`, `OFFICIALLY_RESOLVED`, `OFFICIALLY_REOPENED`, `OFFICIALLY_REJECTED`)
- Previous and updated lifecycle status
- Previous and updated verification status
- Responsible actor ID (never exposed to ordinary users)
- Factual review notes and timestamp

### 20.9 Privacy & Anti-Abuse Safeguards
- **Identity Isolation:** Disputers and report feedback submitters never have their names, phone numbers, or emails displayed publicly.
- **RBAC Governance:** Normal citizens cannot invoke moderation endpoints.
- **Safety Pulse Defense:** Only officially `VERIFIED` and unresolved reports affect the Step 9 numerical Safety Pulse. Community feedback alters pulse solely via documented status changes (e.g. reopened issues return to active status).

### 20.10 New API Endpoints
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/reports/{id}/community-feedback` | Aggregated response counts & user vote | Public / User |
| `POST` | `/api/v1/reports/{id}/verification-feedback` | Submit or update observation / dispute | Authenticated |
| `POST` | `/api/v1/reports/{id}/resolution-feedback` | Confirm resolution or report issue still present | Authenticated |
| `POST` | `/api/v1/reports/{id}/moderate` | Official verification, resolve, or reopen | Admin / Owner |
| `GET` | `/api/v1/reports/{id}/duplicates` | Candidate duplicates within spatial radius | Authenticated |
| `GET` | `/api/v1/reports/{id}/audit-logs` | Auditable history of report transitions | Authenticated |
| `POST` | `/api/v1/journeys/{id}/feedback` | Post-journey experience & usefulness rating | Journey Owner |
| `GET` | `/api/v1/journeys/{id}/feedback/me` | User's private journey feedback | Journey Owner |
| `POST` | `/api/v1/feedback` | General 9-category platform feedback | Authenticated |
| `GET` | `/api/v1/feedback/me` | Private feedback submission history | Authenticated |

### 20.11 Testing Instructions
- **Step 13 Test Suite:**
  ```bash
  cd backend
  .venv\Scripts\pytest tests/test_step13_community_feedback.py -v
  ```
- **Full Backend Test Suite (Steps 1–13, 145 Tests):**
  ```bash
  cd backend
  .venv\Scripts\pytest -v
  ```
- **Frontend Verification:**
  ```bash
  cd frontend
  npm run build
  npm run lint
  ```

---

## 21. Step 14 — Organization & Admin Dashboard

Step 14 transforms SafeSphere from an individual safety application into a complete community and institutional safety management platform. Authorized organizations (colleges, workplace campuses, residential communities, campus security units, public space managers, and local authorities) can monitor reports within their jurisdictional boundary, triage issues via a deterministic priority queue, assign work orders to designated teams, track corrective actions, record official resolutions, and monitor community feedback.

### 21.1 Core Distinction of Lifecycle Stages
SafeSphere strictly separates community engagement from authorized governance:
1. **Community Feedback:** Factual observations, accuracy confirmations, or dispute signals submitted by citizens. *Community feedback does not automatically verify a report.*
2. **Official Verification:** A deliberate, authorized moderation determination performed by an authenticated organization or system administrator, accompanied by a mandatory audit trail note.
3. **Administrative Assignment:** Formal delegation of remediation responsibility to a specific organization or team, with distinct work priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), action descriptions, and target completion dates.
4. **Resolution Confirmation:** Post-resolution feedback submitted by citizens confirming whether the physical hazard was fixed or still present, with automatic review triggering upon credible dispute.

### 21.2 Roles & RBAC Architecture
- **`USER`:** Normal citizens. Can submit safety reports, view public map data, provide community feedback, and manage their own private profiles. *Forbidden from accessing `/admin` or administrative endpoints.*
- **`ORGANIZATION_ADMIN`:** Organization-scoped administrators. Can access reports and assignments within their organization's assigned jurisdiction. Strictly isolated from other organizations' work orders.
- **`SYSTEM_ADMIN`:** Global system administrators. Unrestricted oversight across all organizations, system-wide moderation, organization registration and lifecycle management, and global audit logs.

*Security Rule:* Identity and role are derived exclusively from verified Firebase identity tokens on the backend; frontend-supplied role parameters are rejected.

### 21.3 Organization Types & Lifecycle
Supported organization categories:
- `COLLEGE` — Universities, colleges, and higher-education campuses.
- `COMPANY` — Corporate headquarters, tech parks, and commercial facilities.
- `RESIDENTIAL_COMMUNITY` — Gated residential communities and neighborhood watch associations.
- `CAMPUS_SECURITY` — Dedicated institutional security and dispatch squads.
- `PUBLIC_SPACE_MANAGER` — Municipal parks, transit authorities, and civic zone operators.
- `LOCAL_AUTHORITY` — Certified municipal safety departments.
- `OTHER` — Civic safety organizations.

Status workflow: `PENDING` &rarr; `ACTIVE` &harr; `SUSPENDED`.

### 21.4 Deterministic Preventive Action Queue
The action queue prioritizes unresolved safety hazards without black-box models or artificial inflation:
$$\text{Score} = \text{Base Severity} + \text{Aging Decay} + \text{Dispute Bonus} + \text{Overdue Penalty}$$
- **Base Severity:** `CRITICAL` = 100, `HIGH` = 70, `MEDIUM` = 40, `LOW` = 20.
- **Aging Decay:** $+1.5 \text{ points per day}$ (capped at 45).
- **Dispute Bonus:** $+40 \text{ points}$ if community members reported the issue is still present after claimed resolution.
- **Overdue Penalty:** $+35 \text{ points}$ if `target_resolution_at` has elapsed without completion.
- Distinct from user-reported severity and Safety Pulse scores.

### 21.5 Multi-Organization Isolation & Privacy
- **Strict Query Scoping:** Every admin endpoint automatically queries `OrganizationMembership` for the authenticated user and restricts report, assignment, and resolution records to their assigned organization ID.
- **Cross-Organization Protection:** Attempts to read or mutate another organization's assignments return `403 Forbidden`.
- **Zero Reporter PII:** Administrative lists completely redact user phone numbers, personal email addresses, guardian details, and live GPS trajectories.
- **Audit Logging (`AdministrativeAuditLog`):** Every moderation action (`VERIFY`, `REJECT`, `FLAG_FOR_REVIEW`), issue assignment, and resolution records actor ID, target, previous status, new status, timestamp, and justification reason.

### 21.6 Step 14 Backend APIs
| Method | Endpoint | Description | Scope / Access |
|---|---|---|---|
| `GET` | `/api/v1/admin/dashboard` | Real calculated aggregate metrics | Admin Only |
| `GET` | `/api/v1/admin/reports` | Paginated, filtered safety reports in scope | Admin Only |
| `GET` | `/api/v1/admin/reports/{id}` | Detailed single report for admin review | Admin Only |
| `POST` | `/api/v1/admin/reports/{id}/verify` | Officially verify report with audit record | Admin Only |
| `POST` | `/api/v1/admin/reports/{id}/reject` | Reject invalid report with recorded reason | Admin Only |
| `POST` | `/api/v1/admin/reports/{id}/flag` | Flag report for legal/internal review | Admin Only |
| `POST` | `/api/v1/admin/assignments` | Delegate issue to organization with priority | Admin Only |
| `GET` | `/api/v1/admin/assignments` | List scoped assignments and work orders | Admin Only |
| `PATCH` | `/api/v1/admin/assignments/{id}` | Update assignment status, priority, or plan | Admin Only |
| `POST` | `/api/v1/admin/reports/{id}/resolution` | Record corrective action & mark resolved | Admin Only |
| `POST` | `/api/v1/admin/resolutions/{id}/reopen` | Reopen disputed resolution with reason | Admin Only |
| `GET` | `/api/v1/admin/action-queue` | Deterministic prioritized action queue | Admin Only |
| `GET` | `/api/v1/admin/hotspots` | Spatial recurring issue clusters | Admin Only |
| `GET` | `/api/v1/admin/analytics` | Turnaround KPIs & distribution breakdowns | Admin Only |
| `GET` | `/api/v1/admin/audit-logs` | Administrative moderation audit trail | Admin Only |
| `GET` | `/api/v1/organizations/me` | Current user's organization profile | Org Admin |
| `GET` | `/api/v1/organizations` | Global directory of all organizations | System Admin |
| `POST` | `/api/v1/organizations` | Register new organization | System Admin |
| `PATCH` | `/api/v1/organizations/{id}` | Update organization profile or status | System Admin |
| `POST` | `/api/v1/organizations/{id}/members` | Add administrator or responder to org | System Admin |

### 21.7 Frontend Dashboard Modules
- **`AdminPage.tsx` (`/admin`):**
  - Integrated tab navigation: Dashboard, Reports & Moderation, Action Queue, Operations Map, Analytics, Audit Trail, Organizations.
  - Role-protected routes with RBAC access-denied state.
- **`AdminSummaryCards.tsx`:** 8 real database KPI cards (Reports in scope, pending, verified, unresolved, assigned, in progress, disputes, avg resolution hours).
- **`ReportManagementTable.tsx`:** Full search, category/severity/verification/status filters, pagination, evidence review, and quick moderation actions.
- **`PreventiveActionQueue.tsx`:** Rank-ordered actionable queue with score breakdown and direct assign/resolve modals.
- **`AdminMapPanel.tsx`:** Scoped incident map embedding `SafeSphereMap` with hotspot circles and side inspector.
- **`AdminAnalyticsView.tsx`:** Real turnaround KPIs (hours to assign, hours to resolve, confirmation rate), category bars, and historical trends.
- **`AdminAuditHistoryView.tsx`:** Chain-of-custody audit log viewer.
- **`OrganizationManagementView.tsx`:** Profile management and system-admin organization registry.

### 21.8 Testing Instructions
- **Run Step 14 Pytest Suite:**
  ```bash
  cd backend
  .venv\Scripts\pytest tests/test_step14_admin_dashboard.py -v
  ```
  *Result: 9 passed (100% pass rate).*
- **Run Complete Pytest Suite (Steps 1–14, 154 Tests):**
  ```bash
  cd backend
  .venv\Scripts\pytest -v
  ```
  *Result: 154 passed (100% pass rate).*
- **Run Frontend Validation:**
  ```bash
  cd frontend
  npm run build
  npm run lint
  ```
  *Result: 0 errors across all 142 files.*

### 21.9 Known Limitations
- Geospatial clustering uses Euclidean distance on planar coordinates suitable for city/campus scales; post-hackathon deployments can adopt PostGIS `ST_ClusterDBSCAN` for large regional scales.
- Notifications utilize the existing notification service abstraction; external SMS/FCM delivery requires production credentials configured in `.env`.

---

## 22. Guardian Connect & Notification Infrastructure

Guardian Connect allows minor accounts to add and manage primary parent or legal guardian contact details directly. The OTP verification requirement from Guardian Connect has been removed; guardian contact details are saved with status `NOT_VERIFIED` ("Guardian details saved — contact verification is not enabled").

The underlying SMS and Email provider abstractions remain configured and active to power real-time emergency SOS alerts, journey tracking updates, and safety notifications for verified contacts.

### 22.1 Delivery Provider Architecture
SafeSphere uses clean provider abstractions that fail gracefully, report channel availability truthfully, and never leak credentials or OTP values to the client:

1. **SMS Delivery Providers (`backend/app/services/sms_provider.py`):**
   - **Twilio Verify / Twilio REST API:** Sends international SMS via Twilio Messages API using `SMS_PROVIDER_ACCOUNT_SID`, `SMS_PROVIDER_AUTH_TOKEN`, and `SMS_PROVIDER_FROM_NUMBER`.
   - **MSG91:** Enterprise SMS gateway for Indian and international delivery using `SMS_PROVIDER_AUTH_TOKEN` and `SMS_PROVIDER_SENDER`.
   - **Unconfigured Fallback:** Truthfully returns `NOT_CONFIGURED` status and HTTP 503 if credentials are not configured, disabling the channel without pretending the message was sent.

2. **Email Delivery Providers (`backend/app/services/email_provider.py`):**
   - **SMTP (STARTTLS / SSL):** Native SMTP provider supporting Gmail, SendGrid SMTP, Amazon SES, Mailgun, or corporate relays using `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD`. Runs asynchronously in non-blocking worker threads.
   - **Resend REST API:** Modern transactional email delivery via Resend API using `EMAIL_API_KEY`.
   - **SendGrid Mail Send API:** Enterprise transactional email delivery via SendGrid v3 API using `EMAIL_API_KEY`.
   - **Unconfigured Fallback:** Returns `NOT_CONFIGURED` status and HTTP 503 if credentials are not configured.

### 22.2 Environment Variables & Configuration
Configure provider secrets in your local `.env` file (never commit to git):

```env
# ==========================================
# SMS Provider Configuration
# ==========================================
SMS_PROVIDER=twilio
SMS_PROVIDER_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMS_PROVIDER_AUTH_TOKEN=your_twilio_auth_token_here
SMS_PROVIDER_FROM_NUMBER=+1234567890

# MSG91 Alternative:
# SMS_PROVIDER=msg91
# SMS_PROVIDER_AUTH_TOKEN=your_msg91_auth_key
# SMS_PROVIDER_SENDER=SAFESP

# ==========================================
# Email Provider Configuration
# ==========================================
# Option A: SMTP (e.g., Gmail App Password, Mailgun, Amazon SES)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_verified_account@gmail.com
SMTP_PASSWORD=your_16_character_app_password
SMTP_USE_TLS=true
EMAIL_FROM_ADDRESS=your_verified_account@gmail.com
EMAIL_FROM_NAME="SafeSphere Verification"

# Option B: Resend
# EMAIL_PROVIDER=resend
# EMAIL_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
# EMAIL_FROM_ADDRESS=verify@yourdomain.com
# EMAIL_FROM_NAME="SafeSphere Verification"

# Option C: SendGrid
# EMAIL_PROVIDER=sendgrid
# EMAIL_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
# EMAIL_FROM_ADDRESS=verify@yourdomain.com
# EMAIL_FROM_NAME="SafeSphere Verification"

# ==========================================
# OTP Security & Verification Timing Policy
# ==========================================
OTP_EXPIRY_SECONDS=300
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5
OTP_DEV_MODE=false
```

### 22.3 Security and Truthfulness Policies
- **No Plaintext Leaks:** Plaintext OTP values are never returned by production APIs (`/request-otp`, `/resend-otp`, `/challenge-status`).
- **No Hardcoded Test Banners:** The frontend never displays development codes or bypass OTPs.
- **Delivery Truthfulness:** Twilio/provider acceptance is recorded as `REQUEST_ACCEPTED` and truthfully displayed as *"Verification message requested. Delivery confirmation is unavailable."* rather than falsely claiming `DELIVERED`.
- **Channel Binding:** Verifications validate against the cryptographic hash, bound strictly to the specific guardian record, destination, attempt count, and 5-minute expiry window.



