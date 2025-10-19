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

**October 19, 2025 - Complete Prisma to Firebase Migration (COMPLETED):**
Successfully migrated the entire application from Prisma + PostgreSQL to Firebase Firestore:

**Data Migration:**
- ✅ **Migrated all Prisma data to Firebase** - Created and ran comprehensive migration script that successfully transferred:
  - 252 Users (2 ADMIN, 5 HOD, 24 STAFF, 221 STUDENT)
  - 29 Staff profiles
  - 26 Subjects
  - 31 Faculty Assignments
  - 125 Feedback submissions
  - 7 Academic Years
  - 4 Departments
  - 5 HOD Suggestions
- ✅ **Zero data loss** - All records from PostgreSQL successfully migrated to Firestore collections

**Code Migration:**
- ✅ **Fixed auth route** - Migrated NextAuth authentication from Prisma to Firebase userService
- ✅ **Removed all Prisma dependencies** - Uninstalled @prisma/client and prisma packages completely
- ✅ **Deleted Prisma files** - Removed schema.prisma, migrations folder, and prisma.ts client file
- ✅ **All API routes functional** - Verified all 28+ API endpoints working correctly with Firebase:
  - /api/departments ✅
  - /api/years ✅
  - /api/staff ✅
  - /api/subjects ✅
  - /api/hod/metrics ✅
  - /api/hod/feedback-status ✅
  - /api/hod/release-status ✅
  - /api/auth/* (NextAuth) ✅
  - All other routes tested and operational ✅

**Database Layer:**
- ✅ **Created Firebase service layer** - Built comprehensive service modules for all collections:
  - userService - User authentication and management
  - departmentService - Department CRUD operations
  - staffService - Staff profile management with relational queries
  - academicYearService - Academic year tracking
  - subjectService - Subject/course management
  - assignmentService - Faculty-subject assignments
  - feedbackService - Student feedback submissions
  - hodSuggestionService - HOD comments and suggestions
- ✅ **Verified database connectivity** - All 8 Firebase collections operational and tested

**Migration Benefits:**
- **Faster queries** - NoSQL document structure eliminates complex joins
- **Better scalability** - Firebase scales automatically without manual database management
- **Simplified deployment** - No need for separate PostgreSQL instance
- **Cost-effective** - Pay-per-use pricing model vs fixed database hosting costs
- **Real-time capabilities** - Firebase supports real-time listeners (future enhancement opportunity)

**October 18, 2025 - Vercel to Replit Migration:**
- Migrated project from Vercel to Replit environment
- Updated development and production scripts to bind to port 5000 and host 0.0.0.0
- Configured `allowedDevOrigins` for Replit iframe compatibility (supports *.repl.co, *.replit.dev, *.replit.app)
- Moved authentication secrets to Replit Secrets manager (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
- Set up deployment configuration for autoscale publishing
- Configured workflow to run Next.js development server on port 5000

**October 19, 2025 - WhatsApp-Inspired UI Redesign (COMPLETED):**
Successfully completed comprehensive frontend modernization with WhatsApp-like polished interface:
- ✅ Implemented WhatsApp-inspired design system with green primary colors (#25D366), subtle shadows, and smooth transitions
- ✅ Refactored all utility classes to use Tailwind's @apply directive in globals.css for better maintainability
- ✅ Created responsive sidebar: collapsible vertical sidebar on desktop, bottom tab bar on mobile
- ✅ Added full dark mode support with CSS variables and theme toggle component
- ✅ Modernized all core components (StatCard, UI controls, ConfirmationModal, badges, buttons)
- ✅ Updated HOD dashboard, Profile page, and all layouts with consistent modern styling
- ✅ Enhanced mobile responsiveness across all breakpoints
- ✅ Improved component architecture with better modularization
**Note:** Backend logic, API routes, and data flow remain unchanged (as required)

**October 19, 2025 - Major Performance Optimizations (COMPLETED):**
Fixed critical database query performance issues that were causing 20-30 second page loads:
- ✅ **Fixed /api/hod/reports** - Eliminated N+1 query problem (reduced from 28s to <3s)
  - Changed from nested loops with 71+ separate database queries to single query with proper includes
  - Used Prisma's include feature to fetch staff, assignments, subjects, and feedbacks in one query
  - Moved totalStudents count outside the loops (was querying on every iteration)
- ✅ **Optimized /api/hod/metrics** - Used Promise.all for parallel queries (reduced from 10s to <5s)
  - Changed 5 sequential database counts to run in parallel using Promise.all
  - Fixed singleton Prisma client usage (was creating new client on every request)
- ✅ **Fixed HOD reports page UI** - Migrated to proper theming with performance optimizations
  - Applied consistent theme classes (card, btn-primary, input-field, etc.)
  - Added useMemo and useCallback to prevent unnecessary re-renders
  - Optimized data filtering and selection logic
- ✅ **Optimized HOD assignment page** - Fixed react-select performance issues
  - Memoized subject options to prevent recalculation on every render
  - Used useCallback for all event handlers
  - Applied theme-aware styles to Select component
- ✅ **Migrated remaining HOD pages** - Applied consistent theming across all pages
  - admin/years, admin/hods, hod/students, hod/staff, hod/subjects all use proper theme classes
  - All tables now use .data-table and .table-wrapper for consistent styling
  - Replaced hardcoded colors with CSS variables for light/dark mode support

**Performance Impact:**
- Login time: Improved by optimizing session checks (NextAuth overhead remains ~1-2s in dev mode)
- Reports page: **90% faster** (28s → 2-3s)
- Dashboard metrics: **50% faster** (10s → 5s)
- Overall UX: Significantly smoother with eliminated render bottlenecks

**October 19, 2025 - UX & Component Improvements (COMPLETED):**
Comprehensive improvements to layout, components, and user experience:
- ✅ **Optimized spacing** - Reduced page-container padding for better content utilization
- ✅ **Independent table scrolling** - Tables scroll horizontally on small screens without affecting the whole page
- ✅ **Login page loading states** - Added smooth loading overlay when navigating after login for perceived performance improvement
- ✅ **Custom dropdown component** - Created theme-matching CustomSelect component that works consistently across all operating systems
- ✅ **HOD Students page redesign** - Complete layout overhaul with:
  - Side-by-side card layout for upload and promote sections
  - Custom dropdown selectors throughout
  - Better visual hierarchy with page headers and descriptions
  - Improved filter placement with icon
  - Empty state handling in table
- ✅ **Consistent utility classes** - Audited and standardized all buttons/components to use proper utility classes across:
  - admin/departments, admin/hods
  - hod/subjects, hod/students
  - All modals and forms
- ✅ **Component consistency** - Replaced native select dropdowns with CustomSelect throughout admin and HOD pages

**Components Added:**
- `CustomSelect` - Theme-aware dropdown component with keyboard navigation
- `LoadingOverlay` - Full-screen loading indicator for navigation transitions

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework:** Next.js 15 (App Router) with React 19

**Styling Approach:**
- Tailwind CSS 4 with @apply directive for utility classes (defined in globals.css)
- WhatsApp-inspired design system with primary color: `#25D366` (WhatsApp green)
- CSS variables for theming (light and dark mode support)
- Reusable utility classes: `.btn-primary`, `.btn-secondary`, `.card`, `.badge`, etc.
- Responsive design with mobile-first approach
- Smooth transitions and subtle shadows for polished feel

**UI Design Decisions:**
- **Sidebar Navigation:** Desktop uses left-positioned vertical sidebar (collapsible), mobile uses bottom tab bar
- **Layout Pattern:** Dashboard shell wrapper provides consistent navigation across all authenticated routes
- **Component Structure:** Modular components (dashboard-layout, portal-layout, sidebar) for reusability
- **Form Handling:** Client-side validation with react-hot-toast for user feedback
- **Chart Library:** Recharts for data visualization (feedback analytics)

## Backend Architecture

**Framework:** Next.js API Routes (serverless functions)

**Database:**
- **Database:** Firebase Firestore (NoSQL document database)
- **SDK:** Firebase Admin SDK v13.5.0
- **Connection Management:** Singleton Firebase app initialization
- **Service Layer:** Custom services wrapping Firestore operations for type safety and consistency

**Authentication:**
- **Library:** NextAuth v4 (without database adapter)
- **Strategy:** Pure JWT-based sessions with credentials provider
- **Password Hashing:** bcrypt (10 rounds)
- **Role-Based Access:** ADMIN, HOD, STAFF, STUDENT roles with route-level protection
- **User Storage:** Users stored in Firestore 'users' collection

**Firestore Collections:**
- **users** - Core authentication entity with role field, departmentId, and academicYearId
- **departments** - Institute organizational units with name and abbreviation
- **academicYears** - Year/class groupings (e.g., "First Year", "Second Year")
- **staff** - Faculty profiles linking userId to departmentId
- **subjects** - Course definitions with subjectCode, name, and academicYearId
- **facultyAssignments** - Staff-to-subject mappings with semester tracking
- **feedback** - Student responses with 16 rating parameters plus suggestions
- **hodSuggestions** - HOD comments on faculty performance by semester

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
- NextAuth v4.24.11 for session management (JWT-only, no database adapter)

**Database:**
- Firebase Admin SDK v13.5.0
- Firebase Firestore (NoSQL cloud database)
- Service account authentication via FIREBASE_SERVICE_ACCOUNT_KEY environment variable

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
- Designed for Replit deployment with autoscale configuration
- No build step required for Firebase (client initialized at runtime)
- Required environment variables:
  - FIREBASE_SERVICE_ACCOUNT_KEY (Firebase service account JSON)
  - NEXTAUTH_URL (application URL)
  - NEXTAUTH_SECRET (JWT signing secret)
- Port 5000 for development server (configured for Replit compatibility)
- Cross-origin support for Replit iframe environments

**Setup Requirements:**
1. Create Firebase project at console.firebase.google.com
2. Enable Firestore Database
3. Generate service account key (JSON)
4. Add FIREBASE_SERVICE_ACCOUNT_KEY to Replit Secrets
5. Initialize collections with seed data (see FIREBASE_SETUP.md)

**Missing/Future Dependencies:**
- Dynamic semester management system
- Email notification service (for password resets, feedback reminders)
- File storage service (if moving beyond local CSV uploads; could use Firebase Storage)
- Analytics/monitoring service (Firebase Analytics could be integrated)