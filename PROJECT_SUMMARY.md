# ITL Leave Management System - Project Summary

## 1. Project Overview

**ชื่อโปรเจกต์:** ITL Leave Management System  
**ประเภท:** Mobile-First Web Application  
**Tech Stack:** Next.js 16 + Vercel + MongoDB Atlas + LINE Login  
**Production URL:** https://drivers-tau.vercel.app  
**Database:** MongoDB Atlas Cluster `driver-request`  
**GitHub:** https://github.com/Narongyot1990/fls-driver

---

## 2. Features Summary

### Driver Features (LINE OAuth)
- Login ด้วย LINE
- ขอลา (ลาพักร้อน, ลาป่วย, ลากิจ, ลากิจไม่ได้รับค่าจ้าง)
- ดูประวัติการลา
- แก้ไขข้อมูลส่วนตัว (phone, employeeId)
- บันทึกกิจกรรมล้างรถ (Car Wash)
- ดู Feed กิจกรรม

### Leader Features (Email/Password)
- Login ด้วย Email + Password
- ดูรายการขอลาของพนักงาน
- อนุมัติ/ไม่อนุมัติ คำขอลา
- Filter ประวัติ (ตามประเภท, สถานะ, วันที่, พนักงาน)
- สร้างรายการแทนพนักงาน (Substitute)
- จัดการพนักงาน (Activate/Deactivate/Delete)
- ดู Feed กิจกรรมล้างรถ

---

## 3. Commands

### Build & Development
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint on entire project
npx tsc --noEmit     # TypeScript type-check only (no emission)
```

### Database Seeding
```bash
# Seed leader account
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"secretKey": "itl-leave-system-secret-2024"}'

# Reset all data
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"secretKey": "itl-leave-system-secret-2024", "action": "reset"}'
```

---

## 4. Architecture

### Authentication System (Custom JWT, not NextAuth)

Two separate JWT libraries are used intentionally:
- **`jose`** (`src/lib/jwt-edge.ts`) — Edge-compatible, used exclusively in `src/middleware.ts`
- **`jsonwebtoken`** (`src/lib/jwt-auth.ts`) — Node.js, used in API route handlers via `src/lib/api-auth.ts`

Tokens stored as httpOnly cookies: `accessToken` (15 min) + `refreshToken` (7 days). The middleware silently rotates tokens on refresh.

> **Note:** NextAuth (`src/lib/auth.ts` + `/api/auth/[...nextauth]`) is installed but **completely unused** — the custom JWT system is the real implementation.

### Two User Roles

| Role | Login Method | Auth |
|------|--------------|------|
| Driver | LINE OAuth → `/api/auth/line` | Custom JWT |
| Leader | Email/Password → `/api/auth/leader-login` | Custom JWT |

New Driver accounts start with `status: 'pending'` and must be activated by a Leader before they can submit leave requests.

### Middleware (`src/middleware.ts`)

Runs on all routes except static files. Handles:
1. Public path bypass (login pages, auth endpoints, `/api/seed`)
2. Token verification → role-based redirect enforcement
3. Automatic access token refresh from refresh token

Leaders are redirected to `/leader/home`; drivers attempting `/leader/*` paths are redirected to `/home`. `/dashboard` is accessible by both roles.

### Real-time Notifications (Pusher)

Pusher triggers in several places:
- New leave request → channel `leave-requests`, event `new-leave-request`
- Driver activated by leader → channel `driver-{userId}`, event `driver-activated`
- New car wash activity → channel `car-wash-feed`, events: `new-activity`, `update-activity`, `delete-activity`

---

## 5. Database Schema

### User (Driver - from LINE)
```javascript
{
  _id: ObjectId,
  lineUserId: String (unique),
  lineDisplayName: String,
  lineProfileImage: String,
  role: "driver",
  name: String,
  surname: String,
  phone: String,
  employeeId: String,
  status: "pending" | "active",
  vacationDays: Number,
  sickDays: Number,
  personalDays: Number,
  lastSeen: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Leader (Manual)
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  name: String,
  role: "leader",
  createdAt: Date
}
```

### LeaveRequest
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  leaveType: "vacation" | "sick" | "personal" | "unpaid",
  startDate: Date,
  endDate: Date,
  reason: String,
  status: "pending" | "approved" | "rejected" | "cancelled",
  approvedBy: ObjectId (ref: Leader),
  approvedAt: Date,
  createdAt: Date
}
```

### SubstituteRecord
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  recordType: "vacation" | "sick" | "personal" | "unpaid" | "absent" | "late" | "accident" | "damage",
  description: String,
  date: Date,
  createdBy: ObjectId (ref: Leader),
  createdAt: Date
}
```

### CarWashActivity
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  activityType: String ("car-wash"),
  imageUrl: String,
  caption: String,
  activityDate: Date,
  activityTime: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 6. API Routes

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/line` | LINE OAuth callback |
| POST | `/api/auth/leader-login` | Leader login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/leader` | Get leader info |
| PATCH | `/api/auth/leader-profile` | Update leader profile |

### Leave
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leave` | ดูรายการลา (filter) |
| POST | `/api/leave` | สร้างคำขอลา |
| GET | `/api/leave/[id]` | ดูรายละเอียดคำขอลา |
| PATCH | `/api/leave/[id]` | อนุมัติ/ไม่อนุมัติ/ยกเลิก |

### Substitute
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/substitute` | ดูรายการแทน |
| POST | `/api/substitute` | สร้างรายการแทน |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | ดูรายชื่อพนักงาน |
| POST | `/api/users` | สร้าง user ใหม่ |
| GET | `/api/users/[id]` | ดูข้อมูล user |
| PATCH | `/api/users/[id]` | อัปเดต user |
| DELETE | `/api/users/[id]` | ลบ user |
| GET | `/api/user/profile` | ดูโปรไฟล์ |
| PATCH | `/api/user/profile` | แก้ไขโปรไฟล์ |

### Car Wash
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/car-wash` | ดาวน์โหลด activities |
| POST | `/api/car-wash` | สร้าง activity ใหม่ |
| GET | `/api/car-wash/[id]` | ดูรายละเอียด activity |
| PATCH | `/api/car-wash/[id]` | แก้ไข activity |
| DELETE | `/api/car-wash/[id]` | ลบ activity |
| POST | `/api/car-wash/image` | Upload image |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/counts` | ดูสถิติ |
| POST | `/api/seed` | Seed ข้อมูลเริ่มต้น |
| GET | `/api/online` | ตรวจสอบ online status |

---

## 7. Pages Structure

### Driver Pages
```
/                           → Redirect by role
/login                      → LINE Login
/login/callback             → LINE OAuth callback
/home                       → Dashboard menu
/leave                      → ขอลา
/leave/history              → ประวัติการลา
/dashboard                  → Calendar view
/profile                    → โปรไฟล์
/profile-edit               → แก้ไขโปรไฟล์
/profile-setup              → ตั้งค่าโปรไฟล์ครั้งแรก
/settings                   → ตั้งค่า
/contacts                   → รายชื่อ
/car-wash                   → บันทึกกิจกรรม
/car-wash/feed              → ดู Feed กิจกรรม
```

### Leader Pages
```
/leader/login               → Email/Password Login
/leader/home                → Dashboard
/leader/approve             → รายการรออนุมัติ
/leader/history             → ประวัติทั้งหมด
/leader/drivers             → จัดการพนักงาน
/leader/substitute          → สร้างรายการแทน
/leader/car-wash            → ดู Feed กิจกรรม
/leader/profile-edit        → แก้ไขโปรไฟล์
```

---

## 8. UI Design System

### Brand Colors
- **Dark Blue:** `#002B5B`
- **Green:** `#00d084`

### CSS Variables (`src/app/globals.css`)
- **Colors:** `--accent`, `--success`, `--warning`, `--danger`, `--text-primary`, `--text-secondary`, `--text-muted`
- **Backgrounds:** `--bg-base`, `--bg-surface`, `--bg-inset`
- **Spacing:** `--radius-sm/md/lg/xl`, `--shadow-sm/md/lg/accent`
- **Typography:** Fluid sizing with `clamp()` — `--text-fluid-xs` through `--text-fluid-3xl`

### Shared Components
- **`PageHeader`** — Sticky header with title, optional subtitle, back button, and theme toggle
- **`Sidebar`** — Desktop navigation (hidden on mobile)
- **`BottomNav`** — Mobile navigation (hidden on desktop)
- **`DatePickerModal`** — Date range picker using `react-day-picker`
- **`ProfileModal`** — Modal for viewing user profile

### Utility Classes
- `.card` / `.card-neo` — Elevated containers with shadows
- `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-danger` — Consistent buttons
- `.input` — Form inputs with focus states
- `.badge` / `.badge-success` / `.badge-warning` / `.badge-danger` / `.badge-accent` — Status indicators

---

## 9. File Organization

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Auth endpoints
│   │   ├── car-wash/      # Car wash API
│   │   ├── leave/         # Leave API
│   │   ├── substitute/    # Substitute API
│   │   ├── users/         # User management API
│   │   └── ...
│   ├── home/              # Driver home page
│   ├── leave/             # Leave pages
│   ├── leader/            # Leader pages
│   ├── car-wash/          # Car wash pages
│   └── ...
├── components/            # Reusable React components
├── lib/                   # Utilities & helpers
│   ├── auth.ts            # Auth helpers
│   ├── api-auth.ts        # API auth helpers
│   ├── jwt-auth.ts        # JWT for API
│   ├── jwt-edge.ts        # JWT for middleware
│   ├── mongodb.ts         # MongoDB connection
│   ├── pusher.ts          # Pusher server
│   ├── pusher-client.ts   # Pusher client
│   ├── types.ts           # TypeScript types & Thai labels
│   └── thai-holidays.ts  # Thai holidays data
├── models/                # Mongoose models
│   ├── User.ts
│   ├── Leader.ts
│   ├── LeaveRequest.ts
│   ├── SubstituteRecord.ts
│   └── CarWashActivity.ts
├── hooks/                 # Custom React hooks
│   └── useOnlineStatus.ts
└── middleware.ts          # Next.js middleware
```

---

## 10. Environment Variables

### Required in `.env.local`:
```
# MongoDB
MONGODB_URI=

# LINE Login
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_REDIRECT_URI=
NEXT_PUBLIC_LINE_CHANNEL_ID=
NEXT_PUBLIC_LINE_REDIRECT_URI=

# Pusher
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=

# JWT
JWT_SECRET=
REFRESH_SECRET=

# Vercel Blob (for car wash images)
BLOB_READ_WRITE_TOKEN=
```

---

## 11. Dependencies

### Core
- `next` (16.x) - React framework
- `react`, `react-dom`
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - JWT for API routes
- `jose` - JWT for edge/middleware
- `bcryptjs` - Password hashing

### UI & Styling
- `framer-motion` - Animations
- `lucide-react` - Icons
- `react-day-picker` - Date picker
- `dayjs` - Date manipulation
- `next-themes` - Dark/light mode

### Auth & Real-time
- `next-auth` - Installed but unused
- `pusher` - Server-side Pusher
- `pusher-js` - Client-side Pusher

### Image Upload
- `@vercel/blob` - Image storage

---

## 12. Code Style Guidelines

### Imports
```typescript
// Use path alias @/ for src directory
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';

// Client components must 'use client'
'use client';
import { useState, useEffect } from 'react';
```

### TypeScript Conventions
```typescript
// Interface for API responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Use explicit return types for API routes
export async function GET(request: NextRequest): Promise<NextResponse> { }
```

### Naming Conventions
- **Files:** kebab-case (`leave-request.ts`, `date-picker-modal.tsx`)
- **Components:** PascalCase (`PageHeader.tsx`, `DatePickerModal.tsx`)
- **Interfaces:** PascalCase (`LeaveRequest`, `DriverUser`)
- **Functions:** camelCase (`fetchDrivers`, `handleSubmit`)

### API Routes Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { ModelName } from '@/models/ModelName';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    await dbConnect();
    const data = await ModelName.find();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Mongoose Models
```typescript
// Use this pattern to avoid HMR re-registration
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
```

### API Response Format
```typescript
// Success
return NextResponse.json({ success: true, data: {...} });
// Error
return NextResponse.json({ error: 'Error message' }, { status: 400 });
```

---

## 13. Thai Labels

### Leave Types (`leaveTypeLabels`)
- `vacation` → ลาพักร้อน
- `sick` → ลาป่วย
- `personal` → ลากิจ
- `unpaid` → ลากิจไม่ได้รับค่าจ้าง

### Substitute Types (`substituteTypeLabels`)
- `vacation` → ลาพักร้อน
- `sick` → ลาป่วย
- `personal` → ลากิจ
- `unpaid` → ลากิจไม่ได้รับค่าจ้าง
- `absent` → ขาดงาน
- `late` → มาสาย
- `accident` → อุบัติเหตุ
- `damage` → ทำของเสียหาย

### Status Labels (`statusLabels`)
- `pending` → รออนุมัติ
- `approved` → อนุมัติแล้ว
- `rejected` → ไม่อนุมัติ
- `cancelled` → ยกเลิก
- `active` → ใช้งาน
- `pending` (user) → รออนุมัติ

---

## 14. Key Conventions

- **Profile Completion:** Driver must have `name + surname` set before creating leave requests
- **Leave Quota:** Tracked as fields: `vacationDays`, `sickDays`, `personalDays`
- **User Display:** Show `name + surname` if available, otherwise fall back to `lineDisplayName`
- **Leave Validation:** API enforces profile completion, active status, no overlapping dates, and sufficient quota
- **Error Messages:** Returned in Thai language

---

## 15. Statistics & Metrics

### Project Stats
- **Total Files:** 65
- **Total Lines:** ~9,000
- **Tech Stack:** Next.js 16, TypeScript, MongoDB, Mongoose
- **Authentication:** Custom JWT (not NextAuth)

---

*Last Updated: March 2026*
