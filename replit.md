# Overview

This Student Feedback Portal for SPIOT facilitates structured feedback on teaching performance from students to faculty. It supports multi-role users (Admin, HOD, Staff, Student) for managing feedback, staff, subjects, and academic years. The system's core purpose is to provide comprehensive feedback collection, analysis, and reporting, aiming to enhance educational quality across departments.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework:** Next.js 15 (App Router) with React 19.

**Styling Approach:** Tailwind CSS 4 with `@apply` directives, implementing a WhatsApp-inspired design system with a primary green color (`#25D366`). It uses CSS variables for theming (light/dark mode), reusable utility classes, and a mobile-first responsive design.

**UI Design Decisions:** Features a collapsible vertical sidebar for desktop and a bottom tab bar for mobile navigation. Utilizes modular components, client-side validation with `react-hot-toast`, and `Recharts` for data visualization.

**Loading States:** Implements professional skeleton loading screens across all dashboard pages for improved perceived performance. The UI structure renders immediately with animated placeholders while data loads asynchronously, providing a smooth, modern user experience. Skeleton components are reusable and match the final content layout (cards, tables, stats, etc.).

## Backend Architecture

**Framework:** Next.js API Routes.

**Database:** Firebase Firestore (NoSQL) via Firebase Admin SDK v13.5.0, with a custom service layer for operations.

**Authentication:** NextAuth v4 using pure JWT-based sessions and a credentials provider. Passwords are hashed with bcrypt (10 rounds). Role-Based Access Control (ADMIN, HOD, STAFF, STUDENT) is enforced at the API level, with users stored in the 'users' Firestore collection.

**Firestore Collections:**
- **users**: Core authentication, roles, department, and academic year.
- **departments**: Organizational units.
- **academicYears**: Academic year groupings.
- **staff**: Faculty profiles linked to users and departments.
- **subjects**: Course definitions.
- **facultyAssignments**: Staff-to-subject mappings by semester.
- **feedback**: Student submissions with 16 parameters.
- **hodSuggestions**: HOD comments on faculty performance.

**API Design Patterns:** Adheres to RESTful conventions, includes session-based authorization, department-scoped data access for HODs, and supports bulk operations. The current semester ("Odd 2025-26") is hardcoded for assignment and feedback queries, pending dynamic management. HODs control feedback windows and report visibility. Faculty assignments are synced by atomic replacement. Student accounts are created with enrollment number as initial password.

## Key Architectural Decisions:

- **Current Semester Hardcoding:** Semester is hardcoded for simplicity, awaiting dynamic implementation.
- **HOD Department Scoping:** HOD access is restricted to their assigned department for subject management and reports. However, HODs can assign faculty from any department to their subjects to support cross-departmental teaching.
- **Staff Management:** Only Admin users can manage staff (add/edit/delete). Staff can be assigned to any department. HODs no longer have access to staff management; they can only view and assign existing staff to subjects.
- **Cross-Departmental Faculty Assignments:** HODs can assign any staff member from any department to their subjects, allowing flexibility for inter-departmental teaching arrangements.
- **Feedback Window Control:** HODs manage feedback submission and report visibility.
- **Assignment Sync Pattern:** Assignments are managed by atomically replacing existing entries for a semester.
- **Student Auto-Password:** Initial student passwords are their enrollment numbers.
- **Middleware Authentication:** Custom middleware using `getToken` from next-auth/jwt for route protection and role-based access control. Protected routes automatically redirect unauthenticated users to login page.
- **Signout Handling:** Uses `signOut({ redirect: false })` with manual redirect to prevent crashes and ensure smooth logout experience.
- **Dynamic NEXTAUTH_URL:** Automatically detects Replit domain from environment variables or falls back to localhost for development.
- **Submission Status Year Filtering:** The submission status page displays students filtered by academic year (SYCO, TYCO, FYCO) with proper year information displayed in the table. Year filtering handles empty results gracefully.
- **Progressive Loading Pattern:** All client-side pages use skeleton loaders to render UI structure immediately while data loads in the background. This prevents blank screens and reduces perceived loading time, creating a more professional and responsive feel throughout the application.

# External Dependencies

**Authentication:**
- `NextAuth v4.24.11` (JWT-only).

**Database:**
- `Firebase Admin SDK v13.5.0`.
- `Firebase Firestore`.

**UI Libraries:**
- `lucide-react`: Icons.
- `react-select`: Multi-select dropdowns.
- `recharts`: Charting.
- `react-hot-toast`: Notifications.

**Document Generation:**
- `html2canvas`: Screenshot capture.
- `jspdf`, `pdf-lib`: PDF generation and manipulation.
- `exceljs`: Excel export.
- `papaparse`: CSV parsing.

**Security:**
- `bcrypt 6.0.0`: Password hashing.

**Development:**
- `TypeScript 5.x`.

**Deployment:**
- Configured for Replit autoscale deployment.
- Requires `FIREBASE_SERVICE_ACCOUNT_KEY`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` environment variables.