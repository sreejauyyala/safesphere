# SafeSphere Architecture Overview

## Project Mission
SafeSphere is an intelligent, community-powered safety network providing real-time safety telemetry, guardian protection, automated SOS dispatch, AI-driven risk assessment, and incident tracking for individuals, families, students, and organizations.

## Foundation Architecture (Step 1)

### 1. High-Level System Architecture
```
+-------------------------------------------------------+
|                    CLIENT LAYER                       |
|   React + TypeScript + Vite + Tailwind CSS + Leaflet   |
+-------------------------------------------------------+
                           |
                           | HTTPS / REST / WebSockets
                           v
+-------------------------------------------------------+
|                   API & LOGIC LAYER                   |
|       FastAPI (Python 3.13) API Gateway (/api/v1)     |
|   + Core Config, Security & CORS                      |
|   + Health & Diagnostic Endpoints                     |
|   + Abstract Routing Service                          |
|   + Gemini AI Service Adapter (Placeholder)           |
|   + Notification Service Architecture (FCM Ready)     |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|                     DATA LAYER                        |
|   PostgreSQL + SQLAlchemy ORM                         |
|   UUID Primary Keys & Timestamp Tracking              |
+-------------------------------------------------------+
```

### 2. Frontend Structure
- `src/components/`: Reusable UI elements (Buttons, Navbar, Modals, Cards) and the `Map` component wrapper.
- `src/pages/`: Placeholder views for the core application routes.
- `src/layouts/`: Common page shells (RootLayout, AuthLayout, DashboardLayout).
- `src/services/`: API client (`api.ts`), authentication adapter, routing abstraction.
- `src/hooks/`: Custom React hooks (`useAuth`, `useLocation`).
- `src/types/`: TypeScript interface definitions for API responses and models.
- `src/utils/`: Helper functions and formatting utilities.
- `src/contexts/`: React context providers (AuthContext, SafetyPulseContext).

### 3. Backend Structure
- `app/api/v1/`: API route definitions and endpoint controllers.
- `app/core/`: Configuration, database engine setup, security settings.
- `app/models/`: SQLAlchemy declarative models for all domain entities.
- `app/schemas/`: Pydantic data schemas for validation and serialization.
- `app/services/`: External integrations (Gemini AI, Notifications, Routing).
- `app/repositories/`: Data access patterns (ready for multi-developer scale).
- `app/middleware/`: Request logging, exception handling, and auth checks.

### 4. Database Entities
- **User**: Core profile, age classification, contact information, role.
- **Guardian**: Linked guardians for users under 18 with emergency notification rights.
- **TrustedContact**: Individual circle of trusted emergency contacts.
- **SafetyReport**: Community reports (text, photo, voice transcript) with status & coordinates.
- **SafetyScore**: Calculated area safety ratings.
- **Journey**: Active travel tracking sessions with timed check-ins and destination status.
- **HelpPoint**: Physical safety locations (police stations, hospitals, open businesses, safe shelters).
- **Organization**: Campus/company entities managing member safety.
- **Feedback**: Post-incident or user experience feedback.
- **IssueResolution**: Administrative tracking of reported hazards and resolution workflows.
