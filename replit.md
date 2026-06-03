# SPIOT Feedback Portal

## Project Overview
A comprehensive Student Feedback Portal for Sharadchandra Pawar Institute of Technology (SPIOT), a diploma college. The system manages feedback collection, analysis, and reporting across multiple user roles with support for diploma program structure (6 semesters).

**Technology Stack:**
- Frontend: Next.js 14+ with React
- Backend: Next.js API Routes
- Database: MongoDB
- Authentication: NextAuth.js
- Styling: Tailwind CSS with custom design system
- PDF Generation: pdf-lib
- Charts: Recharts

## User Roles
1. **Admin** - System-wide settings, semester management, user management
2. **HOD (Head of Department)** - Faculty assignments, subject management, report viewing, HOD suggestions
3. **Faculty/Staff** - View own feedback reports and download PDFs
4. **Student** - Submit feedback for assigned faculty

## Recent Changes (October 22, 2025)

### 1. Mobile Logout Fix ✅
**Issue:** Students and other roles couldn't access logout on mobile devices
**Solution:** Added logout button to the "More" menu in the mobile sidebar for all roles
**Files Modified:**
- `src/components/modern-sidebar.tsx` - Added logout option to mobile menu

### 2. Dynamic Semester Management System ✅
**Feature:** Admin can now configure current semester (1-6) with automatic odd/even detection and academic year formatting

**Components Created:**
- Admin settings page: `src/app/(dashboard)/admin/semester-settings/page.tsx`
- API endpoint: `src/app/api/admin/semester-settings/route.ts`
- MongoDB service: Added `semesterSettingsService` in `src/lib/mongodb-services.ts`

**Database Schema:**
```javascript
{
  _id: ObjectId,
  currentSemester: Number (1-6),
  academicYear: String (e.g., "2025-26"),
  semesterType: String ("Odd" or "Even"),
  semesterString: String (e.g., "Odd Semester 2025-26"),
  updatedAt: Date
}
```

**Semester Logic:**
- Semesters 1, 3, 5 = Odd
- Semesters 2, 4, 6 = Even
- Format: "{Odd/Even} Semester {AcademicYear}"

### 3. Semester Field in Subjects ✅
**Feature:** Subjects now include semester number (1-6) for proper organization

**Changes:**
- Added semester dropdown to HOD subject creation/editing UI
- Updated subject API to validate and store semester (1-6)
- Subjects are now organized by semester for better clarity

**Files Modified:**
- `src/app/(dashboard)/hod/subjects/page.tsx`
- `src/app/api/subjects/route.ts`

### 4. Dynamic Semester Integration ✅
**Change:** Replaced all hardcoded semester references with dynamic fetching from settings

**Pages Updated:**
- HOD Assignment Page: Displays current semester in title, uses it for faculty assignments
- Student Dashboard: Shows current semester in page header
- All pages now fetch semester from `/api/admin/semester-settings`

**Files Modified:**
- `src/app/(dashboard)/hod/assignment/page.tsx`
- `src/app/(dashboard)/student/dashboard/page.tsx`

### 5. PDF Download Fix ✅
**Issue:** Faculty PDF reports had MongoDB compatibility issues with `include: { feedbacks: true }`
**Root Cause:** MongoDB service doesn't support including related feedbacks directly
**Solution:** Changed to fetch feedbacks separately for each assignment using `feedbackService.findMany()`

**Files Modified:**
- `src/app/api/faculty/[staffId]/report.pdf/route.ts`

**Performance Note:** Current N+1 query pattern is acceptable for typical faculty assignment counts. Future optimization available if needed via batch fetching.

### 6. CustomSelect Component Fix ✅
**Issue:** Import error for CustomSelect in semester settings page
**Solution:** Changed from default import to named import `{ CustomSelect }`

**Files Modified:**
- `src/app/(dashboard)/admin/semester-settings/page.tsx`

## Cross-Department Faculty Support
**Status:** Already implemented and working correctly

The system fully supports faculty from different departments teaching subjects in other departments. HOD reports correctly include all faculty assigned to their department's subjects, regardless of the faculty member's home department.

**Example:** A Mechanical Engineering faculty member can teach a subject in Computer Science, and they will appear in the Computer Science HOD's reports.

## Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Authentication pages
│   ├── (dashboard)/               # Protected dashboard pages
│   │   ├── admin/                 # Admin-only pages
│   │   │   └── semester-settings/ # Semester configuration
│   │   ├── hod/                   # HOD pages
│   │   │   ├── assignment/        # Faculty-subject assignments
│   │   │   ├── subjects/          # Subject management
│   │   │   └── reports/           # Faculty feedback reports
│   │   ├── faculty/               # Faculty pages
│   │   └── student/               # Student pages
│   └── api/                       # API routes
│       ├── auth/                  # NextAuth configuration
│       ├── admin/                 # Admin APIs
│       │   └── semester-settings/ # Semester settings API
│       ├── subjects/              # Subject CRUD
│       ├── faculty/               # Faculty reports & PDFs
│       ├── hod/                   # HOD-specific APIs
│       └── student/               # Student APIs
├── components/                    # Reusable React components
│   ├── modern-sidebar.tsx         # Responsive sidebar with mobile support
│   ├── custom-select.tsx          # Custom dropdown component
│   └── ui-controls.tsx            # Button, Input, etc.
├── lib/
│   └── mongodb-services.ts        # MongoDB data access layer
└── styles/                        # Global styles and themes
```

## MongoDB Collections

1. **users** - All system users
2. **departments** - Academic departments
3. **staff** - Faculty/staff profiles
4. **students** - Student profiles
5. **academic_years** - Academic year records
6. **subjects** - Course subjects with semester field
7. **faculty_assignments** - Faculty-subject-semester mappings
8. **feedback** - Student feedback submissions
9. **hod_suggestions** - HOD suggestions to faculty
10. **settings** - System settings including semester configuration

## Development Notes

### MongoDB Service Pattern
The project uses a custom MongoDB service layer (`mongodb-services.ts`) that mimics Prisma's API for consistency:
- `findUnique({ where, include })` - Single record
- `findMany({ where, include, orderBy })` - Multiple records
- `create(data)` - Create record
- `update({ where, data })` - Update record
- `delete({ where })` - Delete record

### Include Support
Not all services support all `include` options. Check the service implementation before using nested includes. Example:
- `assignmentService` supports `include.subject` and `include._count.feedback`
- Does NOT support `include.feedbacks` (fetch separately using feedbackService)

### Semester Management Workflow
1. Admin sets current semester via Settings page
2. System stores in MongoDB `settings` collection
3. All pages fetch current semester from API
4. HOD creates assignments for current semester
5. Students see tasks for current semester
6. Reports are semester-specific

### Design System
The application uses CSS custom properties for theming:
- `--primary` - Primary brand color (emerald)
- `--bg-base`, `--bg-elevated` - Background colors
- `--text-primary`, `--text-secondary`, `--text-muted` - Text colors
- `--card-bg`, `--card-border` - Card styling
- Supports light/dark mode switching

## Deployment Considerations

1. **MongoDB Connection:** Ensure MongoDB connection string is set in environment variables
2. **NextAuth Secret:** Configure NEXTAUTH_SECRET for production
3. **Initial Setup:** Admin should configure semester settings before faculty assignments
4. **Data Seeding:** May need to seed initial semester settings for new deployments

## Future Enhancements (Architect Suggestions)

1. **PDF Performance:** If faculty assignment counts grow, consider batch-fetching feedbacks to avoid N+1 queries
2. **AssignmentService:** Optionally extend to support `include.feedbacks` for better code reuse
3. **Integration Tests:** Add tests for PDF generation with multiple assignments
4. **Semester Initialization:** Auto-initialize semester settings on first deployment

## User Preferences

### Coding Standards
- Use TypeScript for type safety
- Follow Next.js 14+ App Router conventions
- Keep MongoDB service layer consistent with Prisma-like API
- Maintain mobile responsiveness across all pages
- Support light/dark mode everywhere

### File Organization
- Group related functionality by feature/role
- Keep API routes parallel to page structure
- Centralize reusable components
- Maintain clear separation between client and server components

## Known Issues & Limitations

1. **PDF N+1 Queries:** Current implementation fetches feedbacks per assignment (acceptable for typical usage, optimize if needed)
2. **First-Run Setup:** Semester settings must be configured by admin before system is fully functional
3. **WebSocket Warning:** Hot reload WebSocket connection warning in development (cosmetic only)

## Contact & Support

For technical issues or questions about the SPIOT Feedback Portal, refer to:
- Project documentation in this file
- MongoDB service implementation in `src/lib/mongodb-services.ts`
- API route structure in `src/app/api/`

---

**Last Updated:** October 22, 2025
**Current Version:** Diploma Program Support with Dynamic Semester Management
**Status:** Production Ready ✅
