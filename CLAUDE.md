# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ITL Leave Management System — a mobile-first web app for drivers (employees) to request leave and for leaders (managers) to approve/manage those requests.

- **Production**: https://drivers-tau.vercel.app
- **Database**: MongoDB Atlas cluster `driver-request`

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx tsc --noEmit     # TypeScript type-check only
```

No test framework is configured.

To seed a leader account (POST to `/api/seed` with `secretKey: "itl-leave-system-secret-2024"`), or reset all data with `action: "reset"`.

## Deployment

GitHub repo: https://github.com/Narongyot1990/fls-driver (connected to Vercel project `drivers`)

Push to `master` → Vercel auto-deploys to https://drivers-tau.vercel.app

```bash
git add <files>
git commit -m "feat: ..."
git push
```

## Architecture

### Auth System (Custom JWT, not NextAuth)

Two separate JWT libraries are used intentionally:
- **`jose`** (`src/lib/jwt-edge.ts`) — Edge-compatible, used exclusively in `src/middleware.ts`
- **`jsonwebtoken`** (`src/lib/jwt-auth.ts`) — Node.js, used in API route handlers via `src/lib/api-auth.ts`

Tokens stored as httpOnly cookies: `accessToken` (15 min) + `refreshToken` (7 days). The middleware silently rotates tokens on refresh.

> **Note:** NextAuth (`src/lib/auth.ts` + `/api/auth/[...nextauth]`) is installed but **completely unused** — the custom JWT system is the real implementation. Treat it as dead code.

### Two User Roles

| Role | Login | Auth |
|------|-------|------|
| Driver | LINE OAuth → `/api/auth/line` | Custom JWT |
| Leader | Email/Password → `/api/auth/leader-login` | Custom JWT |

New Driver accounts start with `status: 'pending'` and must be activated by a Leader before they can submit leave requests. Drivers with `status: 'pending'` are blocked from creating leave requests at the API level. Pusher triggers a real-time notification to the driver on activation.

### Middleware (`src/middleware.ts`)

Runs on all routes except static files. Handles:
1. Public path bypass (login pages, auth endpoints, `/api/seed`)
2. Token verification → role-based redirect enforcement
3. Automatic access token refresh from refresh token

Leaders are redirected to `/leader/home`; drivers attempting `/leader/*` paths are redirected to `/home`. `/dashboard` is accessible by both roles.

### Real-time Notifications (Pusher)

Pusher triggers in two places:
- New leave request → channel `leave-requests`, event `new-leave-request`
- Driver activated by leader → channel `driver-{userId}`, event `driver-activated`

### API Route Pattern

All API routes use `src/lib/api-auth.ts` helpers:
- `requireAuth(request)` — any authenticated user
- `requireLeader(request)` — leaders only
- `requireDriver(request)` — drivers only

Each helper returns a discriminated union: `{ payload }` on success or `{ error: NextResponse }` on failure.

Always call `await dbConnect()` before any Mongoose operation.

### Data Models

**User** — Both driver and leader profiles share the User concept, but drivers are stored in `User` and leaders in `Leader`.

- Driver `status`: `'pending'` | `'active'` — pending users cannot submit leave requests
- Leave quotas tracked as fields: `vacationDays`, `sickDays`, `personalDays`
- Leaders can only delete users with `status: 'pending'`; active driver records are protected

**LeaveRequest** — `leaveType`: `vacation` | `sick` | `personal` | `unpaid`; `status`: `pending` | `approved` | `rejected` | `cancelled`

**SubstituteRecord** — Records non-leave driver incidents managed by leaders (`/leader/substitute`):
- `recordType`: `vacation` | `sick` | `personal` | `unpaid` | `absent` | `late` | `accident` | `damage`
- Fields: `userId`, `recordType`, `description`, `date`, `createdBy`
- API: `GET/POST /api/substitute`

**Leader** — `email`, `password` (bcrypt), `name`

### Leave Request Validation (`POST /api/leave`)

The API enforces in order:
1. Driver must have `name + surname` set (profile completion required)
2. Driver `status` must be `'active'`
3. No overlapping leave dates
4. Sufficient quota remaining (`vacationDays` / `sickDays` / `personalDays`)

Error messages are returned in Thai.

## Key Conventions

- **Brand colors**: Dark Blue `#002B5B`, Green `#00d084`
- **Path alias**: `@/` maps to `src/`
- Mongoose models use the pattern `mongoose.models.ModelName || mongoose.model(...)` to avoid re-registration in dev HMR
- `mongoose`, `mongodb`, and `bcryptjs` are listed as `serverExternalPackages` in `next.config.ts` — they must never be imported in client components or edge runtime code
- API responses: `{ success: true, data }` on success, `{ error: "message" }` with status code on error
- Driver pages use `localStorage` to cache user state and display cached data if API calls fail
- All user-facing labels (leave types, status, record types) are in Thai and defined in `src/lib/types.ts` (`leaveTypeLabels`, `substituteTypeLabels`, `statusLabels`, etc.)

## UI Design System — Minimalist Pro Theme

The entire app uses a consistent design system with light/dark mode support via `ThemeProvider` (`next-themes`).

### CSS Variables (`src/app/globals.css`)
- **Colors**: `--accent`, `--success`, `--warning`, `--danger`, `--text-primary`, `--text-secondary`, `--text-muted`
- **Backgrounds**: `--bg-base`, `--bg-surface`, `--bg-inset`
- **Spacing**: `--radius-sm/md/lg/xl`, `--shadow-sm/md/lg/accent`
- **Typography**: Fluid sizing with `clamp()` — `--text-fluid-xs` through `--text-fluid-3xl`

### Shared Components
- **`PageHeader`** — Sticky header with title, optional subtitle, back button, and theme toggle
- **`Sidebar`** — Desktop navigation (hidden on mobile)
- **`BottomNav`** — Mobile navigation (hidden on desktop)
- **`DatePickerModal`** — Date range picker using `react-day-picker`

### Utility Classes
- `.card` / `.card-neo` — Elevated containers with shadows
- `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-danger` — Consistent buttons
- `.input` — Form inputs with focus states
- `.badge` / `.badge-success` / `.badge-warning` / `.badge-danger` / `.badge-accent` — Status indicators

### Icons
- **Lucide React** icons used throughout
- Leave type icons: `Umbrella` (vacation), `Thermometer` (sick), `Briefcase` (personal), `Ban` (unpaid)

### User Display Pattern
```typescript
interface User {
  lineDisplayName: string;      // LINE account name
  lineProfileImage?: string;    // LINE profile photo URL
  name?: string;                // Thai first name
  surname?: string;             // Thai last name
  phone?: string;
  employeeId?: string;
}
```

Display priority: Show `name + surname` if available, otherwise fall back to `lineDisplayName`. Profile images are shown as round avatars (32px in calendar popups, 40px in leader pages).

### Layout Patterns
- Leader list pages (`/leader/drivers`, `/leader/history`): tabs and summary stats are sticky; the list scrolls independently with `overflow-y-auto`

## Environment Variables

Required in `.env.local`:
```
MONGODB_URI=
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_REDIRECT_URI=
NEXT_PUBLIC_LINE_CHANNEL_ID=
NEXT_PUBLIC_LINE_REDIRECT_URI=
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
JWT_SECRET=
REFRESH_SECRET=
```
