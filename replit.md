# Overview

This is a **Student Feedback Portal** built for SPIOT (an educational institution). The application enables administrators, Heads of Departments (HODs), faculty members, and students to manage and submit feedback on teaching performance. The system provides comprehensive feedback collection, analysis, and reporting capabilities across departments and academic years.

**Core Purpose:**
- Enable students to submit structured feedback on faculty performance
- Allow HODs to manage staff, subjects, and faculty assignments
- Provide administrators with institute-wide oversight
- Generate detailed feedback reports for faculty and department analysis

**Key Features:**
- Multi-role authentication (Admin, HOD, Staff, Student)
- Department and academic year management
- Faculty-subject assignment tracking
- 16-parameter feedback questionnaire
- Real-time submission tracking
- Report generation and analytics
- CSV bulk student import
- Semester-based feedback windows

# Recent Changes

**October 18, 2025 - Vercel to Replit Migration:**
- Migrated project from Vercel to Replit environment
- Updated development and production scripts to bind to port 5000 and host 0.0.0.0
- Configured `allowedDevOrigins` for Replit iframe compatibility (supports *.repl.co, *.replit.dev, *.replit.app)
- Moved authentication secrets to Replit Secrets manager (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
- Set up deployment configuration for autoscale publishing
- Configured workflow to run Next.js development server on port 5000

**Pending User Request - Frontend Modernization:**
User has requested a comprehensive UI/UX overhaul to create a modern, WhatsApp-like polished interface. The goal is to:
- Modernize the overall design with subtle shadows, spacing, and consistent typography
- Implement responsive sidebar behavior (desktop: collapsible left sidebar, mobile: bottom tab bar)
- Create reusable utility classes with Tailwind's @apply directive
- Add dark mode support alongside existing light theme
- Improve mobile responsiveness and remove layout inconsistencies
- Modularize layout components for better maintainability
**Important:** Backend logic, API routes, and data flow should remain unchanged

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework:** Next.js 15 (App Router) with React 19

**Styling Approach:**
- Tailwind CSS 4 for utility-first styling
- Brand color: `#005A9C` (primary blue)
- Light theme focused design (dark mode support planned)
- Custom utility components for buttons, inputs, and forms
- Responsive design with mobile-first approach

**UI Design Decisions:**
- **Sidebar Navigation:** Desktop uses left-positioned vertical sidebar (collapsible), mobile uses bottom tab bar
- **Layout Pattern:** Dashboard shell wrapper provides consistent navigation across all authenticated routes
- **Component Structure:** Modular components (dashboard-layout, portal-layout, sidebar) for reusability
- **Form Handling:** Client-side validation with react-hot-toast for user feedback
- **Chart Library:** Recharts for data visualization (feedback analytics)

## Backend Architecture

**Framework:** Next.js API Routes (serverless functions)

**Database:**
- **ORM:** Prisma Client
- **Database:** PostgreSQL (schema defined in Prisma)
- **Connection Management:** Singleton Prisma client pattern to prevent connection pool exhaustion

**Authentication:**
- **Library:** NextAuth v4 with Prisma adapter
- **Strategy:** JWT-based sessions with credentials provider
- **Password Hashing:** bcrypt (10 rounds)
- **Role-Based Access:** ADMIN, HOD, STAFF, STUDENT roles with route-level protection

**Data Model Highlights:**
- **User:** Core authentication entity with role field
- **Department:** Institute organizational units with HOD assignment
- **AcademicYear:** Year/class groupings (e.g., "First Year Computer Engineering")
- **Staff:** Faculty profiles linked to departments
- **Subject:** Course definitions tied to academic years
- **FacultyAssignment:** Many-to-many relationship between staff and subjects with semester tracking
- **Feedback:** Student responses with 16 rating parameters plus suggestions
- **Student Enrollment:** Students linked to departments and academic years

**API Design Patterns:**
- RESTful conventions (GET, POST, PATCH, DELETE)
- Session-based authorization checks on all protected routes
- Department-scoped data access (HODs only see their department)
- Semester filtering (currently hardcoded to "Odd 2025-26")
- Bulk operations support (CSV upload, mass assignments)

**Key Architectural Decisions:**

1. **Current Semester Hardcoding:** The semester "Odd 2025-26" is currently hardcoded across assignment and feedback queries. This was chosen for initial deployment simplicity but should be replaced with dynamic semester management.

2. **HOD Department Scoping:** HODs can only manage staff, subjects, and students within their assigned department. This is enforced at the API level by querying the HOD's staff profile for departmentId.

3. **Feedback Window Control:** HODs can toggle feedback submission windows (isFeedbackActive) and report visibility (reportsReleased) via department settings. This provides granular control over when students can submit and when faculty can view results.

4. **Assignment Sync Pattern:** Faculty assignments are synced by deleting all existing assignments for a semester and recreating them atomically. This prevents partial update states but requires careful transaction handling.

5. **Student Auto-Password:** Student accounts are created with enrollment number as both username and initial password for simplicity. Students cannot change passwords (role restriction).

## External Dependencies

**Authentication:**
- NextAuth v4.24.11 for session management
- @auth/prisma-adapter for database integration

**Database & ORM:**
- Prisma 6.17.1 (client and CLI)
- PostgreSQL (connection via DATABASE_URL environment variable)

**UI Libraries:**
- lucide-react: Icon library
- react-select: Multi-select dropdowns (faculty assignment)
- recharts: Chart components (feedback analytics)
- react-hot-toast: Toast notifications

**Document Generation:**
- html2canvas: Screenshot capture for reports
- jspdf: PDF generation (faculty reports)
- pdf-lib: PDF manipulation
- exceljs: Excel export functionality
- papaparse: CSV parsing (student bulk import)

**Security:**
- bcrypt 6.0.0: Password hashing

**Development:**
- TypeScript 5.x for type safety
- ESLint with Next.js config (build errors currently ignored via next.config.ts)

**Deployment Considerations:**
- Designed for Vercel deployment (README_VERCEL.md included)
- Prisma generate required in build step
- Environment variables: DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
- Port 5000 for development server (configured for Replit compatibility)
- Cross-origin support for Replit iframe environments

**Missing/Future Dependencies:**
- Dynamic semester management system
- Email notification service (for password resets, feedback reminders)
- File storage service (if moving beyond local CSV uploads)
- Analytics/monitoring service (for production error tracking)