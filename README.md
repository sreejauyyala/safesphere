# SafeSphere: 24/7 Community Safety Intelligence Network

> **Note on Project Status:**  
> **Step 1 establishes the SafeSphere foundation. Advanced AI, live location, routing, safety intelligence, emergency, guardian, community and admin features will be implemented in subsequent steps.**

---

## 1. Project Name
**SafeSphere** &mdash; 24/7 Community Safety Intelligence Network.

---

## 2. Project Purpose
SafeSphere is an autonomous, community-first safety platform designed to provide round-the-clock protection and intelligence for:
- Women commuting alone or working late shifts
- Students navigating universities, dorms, and urban campuses
- Employees and nocturnal shift workers
- Minors and families requiring automated under-18 guardian protection
- Colleges, corporations, and residential associations managing localized civic safety
- First responders and community emergency desks

The platform combines real-time geo-telemetry, crowd-sourced hazard verification, safety-weighted routing, and Google Gemini multi-modal AI risk assessment to prevent harm before it occurs.

---

## 3. Technology Stack

### Frontend
- **Framework & Tooling:** React 19, Vite, TypeScript
- **Styling:** Tailwind CSS (v4) with modern glassmorphism design tokens
- **Routing:** React Router v7
- **HTTP Client:** Axios (reusable typed client with interceptors)
- **Map & Geo-rendering:** OpenStreetMap & Leaflet with custom category pins and polyline routes
- **Icons:** Lucide React

### Backend
- **Framework:** Python 3.13, FastAPI
- **Server:** Uvicorn ASGI with structured request-timing middleware
- **Data Validation:** Pydantic v2 & Pydantic-Settings
- **ORM & Database:** SQLAlchemy 2.0 with PostgreSQL (psycopg & psycopg2 drivers)
- **HTTP/Networking:** HTTPX

### Database
- **Primary:** PostgreSQL (with Docker Compose development service)
- **Schema Design:** UUID primary keys (`TimeStampedUUIDModel`) and automatic UTC timestamps

### Authentication & Push Notifications (Architecture Prepared)
- **Client Auth:** Firebase Authentication SDK
- **Backend Admin:** Firebase Admin SDK & Firebase Cloud Messaging (FCM)

### Artificial Intelligence
- **AI Engine:** Google Gemini API adapter interface (`gemini_service.py`) for multi-modal text, voice transcripts, and image hazard classification

### Maps & Routing
- **Map Tiles:** OpenStreetMap (OSM)
- **Routing Abstraction:** `BaseRoutingService` interface enabling plug-and-play swapping of OSRM, OpenRouteService, and proprietary engines

---

## 4. Folder Structure

```
safespherr/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/              # Static media and brand assets
│   │   ├── components/          # Reusable UI widgets & Leaflet Map component
│   │   ├── contexts/            # Context state providers (Auth, Telemetry)
│   │   ├── hooks/               # Custom React hooks (useLocation, useAuth)
│   │   ├── layouts/             # Page shells (RootLayout, AuthLayout)
│   │   ├── pages/               # Application view routes (12 views)
│   │   ├── services/            # Axios API client, Firebase, Routing
│   │   ├── types/               # TypeScript interfaces & domain models
│   │   ├── utils/               # Formatting, distance, and coordinate helpers
│   │   ├── App.tsx              # BrowserRouter configuration
│   │   ├── index.css            # Tailwind CSS styling tokens
│   │   └── main.tsx             # Application entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/   # Health, Auth, Reports, Pulse, Journeys, SOS, Guardians, Admin
│   │   │       └── api.py       # API v1 router aggregator
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic Settings & environment variables
│   │   │   └── database.py      # SQLAlchemy engine, session maker, DB connectivity probe
│   │   ├── middleware/          # Request logging and CORS handlers
│   │   ├── models/              # Declarative SQLAlchemy domain models
│   │   │   ├── base.py          # UUID timestamped base model
│   │   │   ├── user.py          # User profile model
│   │   │   ├── guardian.py      # Under-18 guardian protection model
│   │   │   ├── trusted_contact.py
│   │   │   ├── safety_report.py # Hazard reports with Gemini risk attributes
│   │   │   ├── safety_score.py  # Territorial safety pulse scores
│   │   │   ├── journey.py       # Monitored route tracking model
│   │   │   ├── help_point.py    # Police, 24/7 pharmacy, hospital shelters
│   │   │   ├── organization.py  # Campuses, corporate safety boards
│   │   │   ├── feedback.py      # User sentiment and trip rating
│   │   │   └── issue_resolution.py
│   │   ├── repositories/        # Generic CRUD data access repositories
│   │   ├── schemas/             # Pydantic validation schemas
│   │   ├── services/            # Gemini AI service, Routing abstraction, FCM notifications
│   │   └── main.py              # FastAPI application bootstrap
│   ├── tests/
│   │   └── test_health.py       # Pytest health-check validation suite
│   ├── requirements.txt         # Python dependencies
│   └── .env.example
│
├── docs/
│   └── architecture.md          # Detailed system architecture guide
│
├── .gitignore
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 5. Prerequisites

- **Node.js:** v18.0.0 or later (v25+ supported)
- **npm:** v9.0.0 or later
- **Python:** v3.10 or later (v3.13 supported)
- **Docker & Docker Compose:** (Optional for local PostgreSQL container)
- **Git**

---

## 6. Frontend Installation

Navigate to the `frontend` folder and install dependencies:

```bash
cd frontend
npm install
```

---

## 7. Backend Installation

Navigate to the `backend` folder, create a Python virtual environment, and install dependencies:

```bash
cd backend
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On Linux / macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

---

## 8. PostgreSQL Setup

### Option A: Using Docker Compose (Recommended for local dev)
A preconfigured `docker-compose.yml` is provided at the repository root:

```bash
docker-compose up -d postgres
```
> **Security Notice:** The default credentials in `docker-compose.yml` (`safesphere_user` / `safesphere_password`) are intended strictly for local development. Production deployments must use unique, cryptographically strong passwords managed via secure environment secrets.

### Option B: Local PostgreSQL Installation
Create a local database named `safesphere_db` and ensure your user has read/write privileges.

---

## 9. Environment Variable Setup

Copy `.env.example` in both backend and frontend or root:

```bash
# In backend:
cp .env.example .env

# In frontend:
cp .env.example .env
```

Key variables configured in `.env`:
- `DATABASE_URL`: `postgresql://safesphere_user:safesphere_password@localhost:5432/safesphere_db`
- `GEMINI_API_KEY`: Your Google Gemini API Key (Required in Step 8)
- `VITE_API_URL`: `http://localhost:8000/api/v1`
- `FIREBASE_API_KEY`: Firebase web client configuration

---

## 10. How to Run Frontend

From the `frontend` directory:

```bash
cd frontend
npm run dev
```

The frontend will start at: `http://localhost:5173/`

---

## 11. How to Run Backend

From the `backend` directory (with virtual environment activated):

```bash
cd backend
# Windows:
.\.venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Linux / macOS:
# uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive Swagger API Documentation: `http://localhost:8000/api/v1/docs`

---

## 12. Health-Check URL

- **Probe URL:** `http://localhost:8000/api/v1/health`
- **Expected Response:**
  ```json
  {
    "status": "ok",
    "service": "SafeSphere API"
  }
  ```
- **Diagnostic URL:** `http://localhost:8000/api/v1/health/details` (inspects database connectivity, Gemini status, and FCM readiness).

---

## 13. Git & GitHub Setup

Initialize and configure git:

```bash
git init
git add .
git commit -m "feat: Step 1 - SafeSphere foundation architecture"
```

The repository includes a comprehensive `.gitignore` preventing secrets (`.env`), virtual environments (`.venv`), `node_modules`, and cache files from ever being committed.

---

## 14. Current Implemented Features (Step 1 Foundation)

1. **FastAPI Application Gateway:** Clean API versioning under `/api/v1`, CORS middleware, structured request logging.
2. **Specification Health Check:** `GET /api/v1/health` responding with `{"status": "ok", "service": "SafeSphere API"}`.
3. **Database Architecture:** SQLAlchemy 2.0 declarative models with UUID keys and timestamping:
   - `User`, `Guardian`, `TrustedContact`, `SafetyReport`, `SafetyScore`, `Journey`, `HelpPoint`, `Organization`, `Feedback`, `IssueResolution`.
4. **Service Abstractions:**
   - `gemini_service.py`: Google Gemini API adapter with placeholder signatures (`analyze_safety_text`, `analyze_safety_image`, `analyze_voice_transcript`, `classify_safety_report`) and Step 8 TODO indicators.
   - `routing_service.py`: Abstract `BaseRoutingService` allowing pluggable navigation providers.
   - `notification_service.py`: Firebase Cloud Messaging (FCM) alert architecture.
5. **Interactive Safety Map Foundation:**
   - OpenStreetMap tile integration via Leaflet.
   - Category-colored markers for User GPS, Safety Hazard Reports, and 24/7 Help Havens.
   - Polyline safe route rendering.
6. **Frontend Views (12 Routes):**
   - `/` Landing Page
   - `/login` & `/register` (with age-based minor guardian warnings)
   - `/home` Dashboard
   - `/map` Interactive Safety Map
   - `/report` Text, Voice, Photo incident reporting
   - `/journey` Monitored safe route navigation
   - `/safety-mode` "I Feel Unsafe" silent vigilance telemetry
   - `/trusted-circle` Emergency circle
   - `/guardian` Minor protection portal (<18)
   - `/profile` User profile & trust score
   - `/admin` Hotspot detection & issue resolution tracker
7. **Automated Testing:** Pytest suite with 100% pass rate validating the specification health endpoint.

---

## 15. Features Planned for Later Steps

- **Step 2:** Firebase Authentication integration (Registration, Login, JWT session tokens, Minor detection flow).
- **Step 3:** Live GPS tracking, geolocation background polling, and device breadcrumbs.
- **Step 4:** Real-time Safety Pulse engine and dynamic hotspot calculation.
- **Step 5:** Safety-aware route recommendation with streetlight density & hazard avoidance algorithms.
- **Step 6:** Multi-modal citizen reporting (Text, Speech-to-Text voice notes, Photo uploads with EXIF verification).
- **Step 7:** One-Touch SOS, emergency SMS/WhatsApp dispatch, and automated panic triggers.
- **Step 8:** Full Google Gemini AI integration (automated hazard severity rating, fake-report filtering, image analysis).
- **Step 9:** Guardian Protection automated check-ins, delayed-arrival alerts, and ward tracking.
- **Step 10:** Admin & Municipal dashboard with issue resolution workflow and civic hazard dispatch.
