# FLS Driver — Project Structure Guide

> **For AI assistants & new developers.** This document describes the architecture, conventions, and key files of the FLS Driver Leave Management System.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 15** (App Router, `src/app/`) |
| Language | **TypeScript** (strict) |
| Styling | **Tailwind CSS v4** + CSS custom properties (`globals.css`) |
| Animation | **Framer Motion** + CSS keyframe animations |
| Database | **MongoDB** via **Mongoose** |
| Auth | LINE Login OAuth → JWT cookie (`token`) |
| Realtime | **Pusher** (leave request notifications) |
| Storage | **Vercel Blob** (car wash images) |
| Icons | **Lucide React** |

---

## Directory Layout

```
src/
├── app/                        # Next.js App Router pages
│   ├── globals.css             # Design system: variables, components, animations
│   ├── layout.tsx              # Root layout with ThemeProvider
│   ├── page.tsx                # Landing/redirect
│   ├── login/                  # Driver LINE login
│   │   └── callback/           # OAuth callback handler
│   ├── home/                   # Driver home dashboard
│   ├── profile/                # Driver profile view
│   ├── profile-edit/           # Driver profile editor
│   ├── profile-setup/          # First-time profile setup
│   ├── settings/               # Driver settings
│   ├── contacts/               # Driver contact list
│   ├── leave/                  # Leave request form
│   │   └── history/            # Driver's own leave history
│   ├── dashboard/              # Shared calendar (all approved leaves)
│   ├── car-wash/               # Car wash activity
│   │   └── feed/               # Car wash social feed
│   ├── leader/                 # Leader-only pages
│   │   ├── login/              # Leader PIN login
│   │   ├── home/               # Leader home dashboard
│   │   ├── approve/            # Approve/reject leave requests
│   │   ├── history/            # All leave & substitute history
│   │   ├── drivers/            # Employee management (edit, activate, tier)
│   │   ├── substitute/         # Record substitute entries
│   │   ├── car-wash/           # Leader car wash review
│   │   └── profile-edit/       # Leader profile editor
│   └── api/                    # API routes (Next.js Route Handlers)
│       ├── auth/
│       │   ├── line/           # LINE OAuth exchange → JWT
│       │   ├── me/             # Current user info
│       │   └── logout/         # Clear JWT
│       ├── users/              # GET list, PATCH update, DELETE
│       │   └── [id]/           # GET single user by ID
│       ├── user/profile/       # PATCH own profile
│       ├── leave/              # GET list, POST create
│       │   └── [id]/           # PATCH approve/reject, DELETE cancel
│       ├── substitute/         # GET list, POST create
│       └── car-wash/           # GET list, POST create
│           ├── [id]/           # GET/PATCH/DELETE single activity
│           └── image/          # Image proxy for private blobs
│
├── components/                 # Reusable React components
│   ├── UserAvatar.tsx          # Avatar with performance tier frame
│   ├── ProfileModal.tsx        # User profile popup modal
│   ├── PageHeader.tsx          # Consistent page header
│   ├── BottomNav.tsx           # Mobile bottom navigation
│   ├── Sidebar.tsx             # Desktop sidebar navigation
│   ├── DatePickerModal.tsx     # Date range picker
│   ├── TimePickerModal.tsx     # Time picker
│   ├── ThemeProvider.tsx       # Dark/light theme context
│   └── ThemeToggle.tsx         # Theme switch button
│
├── lib/                        # Shared utilities & config
│   ├── leave-types.ts          # ★ Single source: leave type labels, icons, colors, status badges
│   ├── date-utils.ts           # ★ Single source: formatDateThai, formatRelativeTime, getLeaveDays, isUserOnline
│   ├── profile-tier.ts         # Performance tier config (standard → platinum)
│   ├── types.ts                # Shared TypeScript interfaces
│   ├── mongodb.ts              # Mongoose connection singleton
│   ├── pusher.ts               # Pusher server instance
│   ├── api-auth.ts             # JWT auth middleware (requireAuth, requireLeader)
│   └── thai-holidays.ts        # Thai holiday calendar data
│
├── models/                     # Mongoose models
│   ├── User.ts                 # User schema (drivers + leader fields)
│   ├── LeaveRequest.ts         # Leave request schema
│   ├── SubstituteRecord.ts     # Substitute/record schema
│   └── CarWashActivity.ts      # Car wash activity schema
│
└── hooks/                      # Custom React hooks
    └── useOnlineStatus.ts      # Heartbeat for online presence
```

---

## Design System (`globals.css`)

### CSS Custom Properties
All colors, shadows, radii defined as `--var-name`. Light mode on `:root`, dark mode on `.dark`.

### Component Classes
| Class | Purpose |
|-------|---------|
| `.card` | Standard card with border + shadow |
| `.card-neo` | Neomorphic elevated card |
| `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger` | Button system |
| `.input` | Form inputs (48px min-height, 16px font for iOS zoom prevention) |
| `.badge` / `.badge-success` / `.badge-warning` / `.badge-danger` / `.badge-accent` | Status badges |
| `.text-fluid-xs` through `.text-fluid-4xl` | Fluid typography scaled for iPhone 13 (390px) |

### Animation Classes
| Class | Effect |
|-------|--------|
| `.animate-shimmer` | Gradient shimmer sweep |
| `.animate-pulse-glow` | Pulsing accent glow |
| `.animate-slide-up` | Slide up + fade in |
| `.animate-bounce-in` | Springy scale entrance |
| `.animate-float` | Gentle floating |
| `.animate-gradient-shift` | Background gradient cycle |
| `.card-lift` | Hover lift + shadow on desktop, press scale on mobile |
| `.btn-spring` | Springy button press |
| `.stagger-child` | Auto-staggered children (nth-child delays) |
| `.skeleton` | Loading placeholder shimmer |

---

## Key Shared Libraries

### `src/lib/leave-types.ts`
**Single source of truth** for all leave-related configuration.
- `LEAVE_TYPES` — Record of `vacation | sick | personal | unpaid` with label, icon, color, bgClass, textClass, daysKey
- `LEAVE_TYPE_LIST` — Array version for iteration
- `getLeaveTypeMeta(type)` — Safe lookup with fallback
- `RECORD_TYPES` — Substitute record types (includes absent, late, accident, damage)
- `getRecordTypeLabel(type)` — Label lookup
- `STATUS_BADGES` — `pending | approved | rejected | cancelled` badge config
- `getStatusBadge(status)` — Safe lookup

### `src/lib/date-utils.ts`
**Single source** for date formatting and online status.
- `formatDateThai(dateStr)` — Thai locale date (e.g., "13 มี.ค. 2569")
- `formatRelativeTime(dateStr)` — "5 นาทีที่แล้ว", "3 วันที่แล้ว"
- `getLeaveDays(start, end)` — Inclusive day count
- `isUserOnline(lastSeen)` — Boolean check against 5-min timeout

### `src/lib/profile-tier.ts`
Performance tier system for avatar frames.
- Tiers: `standard → bronze → silver → gold → platinum`
- Each tier has CSS ring gradient, glow shadow, badge styling
- `normalizePerformanceTier(tier)` — Safe cast with fallback

### `src/components/UserAvatar.tsx`
**Always use this** for rendering user avatars. Never use inline `<img>` tags.
- Props: `imageUrl`, `displayName`, `tier`, `size` (xs→2xl), `onClick`, `showTierBadge`
- Renders tier-colored ring + inner avatar circle

---

## Data Flow

### Authentication
1. Driver: LINE Login → `/api/auth/line` → JWT cookie → `localStorage.driverUser`
2. Leader: PIN login → `localStorage.leaderUser`
3. All API routes check JWT via `requireAuth()` / `requireLeader()`

### User Schema Fields
```
lineUserId, lineDisplayName, lineProfileImage,
name, surname, phone, employeeId,
status ('pending' | 'active'), role ('driver'),
vacationDays, sickDays, personalDays,
performanceTier, performancePoints, performanceLevel,
lastSeen, isOnline
```

### Leave Request Flow
1. Driver submits via `/api/leave` POST
2. Pusher notifies leader channel
3. Leader approves/rejects via `/api/leave/[id]` PATCH
4. Pusher notifies driver channel
5. Approved leaves deduct from user quota

---

## Conventions

1. **No inline avatars** — Always use `<UserAvatar />` component
2. **No local leave type definitions** — Import from `src/lib/leave-types.ts`
3. **No local date formatting** — Import from `src/lib/date-utils.ts`
4. **State updates** — Use functional updater `setState(prev => ...)` when updating filtered lists
5. **Styling** — Use CSS custom properties (`var(--accent)`) not hardcoded colors
6. **Typography** — Use `.text-fluid-*` classes for responsive text
7. **Mobile-first** — All pages target iPhone 13 (390px) as primary viewport
8. **Inputs** — Use `.input` class (48px, 16px font to prevent iOS zoom)
9. **API responses** — Always include `performanceTier` in user payloads
