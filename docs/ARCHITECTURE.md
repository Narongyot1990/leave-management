# Leave Management - System Architecture

## Overview

ระบบ Leave Management เป็น Next.js application ที่มี 2 ส่วนหลัก:

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                   (Next.js App Router)                      │
│                                                              │
│   /leader/tasks       /admin/users       /leave            │
│   /leader/approve     /admin/tasks      /attendance        │
│   /leader/home        /admin/home       /profile           │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP API
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│              (Next.js API Routes + MongoDB)                  │
│                                                              │
│   /api/leave          /api/users          /api/auth/*       │
│   /api/attendance     /api/drivers        /api/tasks        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │    MongoDB     │
                    │  (Atlas Atlas) │
                    └────────────────┘
```

## Frontend Structure

### Routing Pattern

```
src/app/
├── (auth)/                    # หน้าที่ต้อง login
│   ├── login/
│   └── admin/login/
│
├── (main)/                   # หน้าหลักที่ต้อง authentication
│   ├── leader/
│   │   ├── home/            # Dashboard สำหรับ Leader
│   │   ├── approve/         # อนุมัติคำขอลา
│   │   ├── tasks/           # มอบหมายงาน (แบบทดสอบ + เงินเพิ่ม)
│   │   ├── drivers/         # จัดการพนักงาน
│   │   ├── attendance/      # บันทึกเวลางาน
│   │   └── settings/        # ตั้งค่าโปรไฟล์
│   │
│   ├── admin/
│   │   ├── home/           # Dashboard สำหรับ Admin
│   │   ├── users/          # จัดการผู้ใช้
│   │   ├── tasks/          # มอบหมายงาน (Admin)
│   │   └── approve/        # อนุมัติคำขอลา (Admin)
│   │
│   ├── driver/
│   │   ├── home/           # Dashboard สำหรับ Driver
│   │   ├── leave/          # ขอลา
│   │   ├── attendance/      # เช็คอิน/เช็คเอาท์
│   │   └── job-assignments/ # งานที่ได้รับมอบหมาย
│   │
│   └── (公共)              # หน้าสาธารณะ
│       ├── home/            # หน้าแรก
│       └── about/
│
└── api/                     # API Routes (Backend)
    ├── leave/              # CRUD คำขอลา
    ├── users/              # CRUD ผู้ใช้
    ├── auth/               # Authentication
    │   ├── line/           # LINE Login
    │   ├── leader-login/   # Leader Password Login
    │   └── callback/       # OAuth Callback
    ├── attendance/          # เช็คอิน/เอาท์
    ├── tasks/              # Quiz/Tasks
    └── job-assignments/     # มอบหมายงาน
```

### Page to API Connection

#### 1. หน้าอนุมัติคำขอลา (Leader/Admin)

**Page:** `/leader/approve/page.tsx`
```
         User Action                    API Call
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│  fetch('/api/leave?status=pending')                      │
│                                                         │
│  └─► GET /api/leave ──────────► buildLeaveScope()      │
│        ?status=pending              │                  │
│        &branch=AYA                  ▼                  │
│                              MongoDB: leaveRequests      │
│                                    │                   │
│                                    ▼                   │
│                              Filter by:                 │
│                              - role (leader/admin)     │
│                              - branch (ถ้ามี)          │
│                              - status (pending)        │
└─────────────────────────────────────────────────────────┘

Response: { success: true, requests: [...] }
```

**API Flow:**
```
1. Frontend: GET /api/leave?status=pending&branch=AYA
2. Middleware: ตรวจสอบ JWT token
3. leave.domain.ts: buildLeaveScope(actor, query)
   - actor = decoded JWT { userId, role, branch }
   - query = { status: 'pending', branch: 'AYA' }
4. MongoDB: LeaveRequest.find({ filter })
5. Response: { success: true, requests: [...] }
```

#### 2. หน้าขอลา (Driver)

**Page:** `/driver/leave/page.tsx`
```
         User Action                    API Call
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│  POST /api/leave                                        │
│    {                                                    │
│      leaveType: 'sick',                                 │
│      startDate: '2024-01-15',                          │
│      endDate: '2024-01-16',                            │
│      reason: 'ปวดหัว'                                  │
│    }                                                    │
│                                                         │
│  └─► POST /api/leave ─────────► createLeaveRequest()   │
│                                    │                    │
│                                    ▼                    │
│                              MongoDB: leaveRequests      │
│                                    │                    │
│                                    ▼                    │
│                              Return: { success: true }  │
└─────────────────────────────────────────────────────────┘
```

#### 3. หน้ามอบหมายงาน (Leader/Admin)

**Page:** `/leader/tasks/page.tsx` (Tab: มอบหมายงาน)
```
         User Action                    API Call
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│  GET /api/job-assignments?status=pending                 │
│                                                         │
│  └─► GET /api/job-assignments ─► JobAssignment.find()  │
│                                                         │
│  POST /api/job-assignments (สร้างงานใหม่)               │
│    {                                                    │
│      assignedTo: 'user_id',                              │
│      jobType: 'bring_to_center',                        │
│      title: 'นำรถ 70-0001 เข้าศูนย์',                │
│      otAmount: 200,                                     │
│      tripAmount: 100                                    │
│    }                                                    │
└─────────────────────────────────────────────────────────┘
```

## Backend Structure

### API Route Pattern

ทุก API route มีรูปแบบเดียวกัน:

```typescript
// src/app/api/[resource]/route.ts

export async function GET(request: NextRequest) {
  return apiHandler(async ({ payload }) => {
    // payload = decoded JWT token
    // {
    //   userId: string,
    //   role: 'driver' | 'leader' | 'admin',
    //   branch: string | undefined,
    //   status: string
    // }
    
    // เรียก domain service
    const result = await SomeService.getSomething(payload, input);
    
    return NextResponse.json({ success: true, data: result });
  })(request);
}
```

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN FLOW                                │
│                                                              │
│  [Driver]                                                    │
│    LINE Login ──► /api/auth/line ──► User.findOne()        │
│                                    { lineUserId }           │
│                                           │                 │
│                                           ▼                 │
│                                    JWT Token Created         │
│                                    {                        │
│                                      userId,                │
│                                      role: 'driver',         │
│                                      branch: 'AYA',          │
│                                      status: 'active'        │
│                                    }                        │
│                                                              │
│  [Leader/Admin]                                             │
│    Password Login ──► /api/auth/leader-login ──► User.findOne()
│                                                      { email }
│                                                            │
│  Cookie: session_token=JWT...                              │
└─────────────────────────────────────────────────────────────┘
```

### JWT Token Payload

```typescript
interface TokenPayload {
  userId: string;        // User ID จาก MongoDB
  role: 'driver' | 'leader' | 'admin';
  branch?: string;       // สาขาที่สังกัด (เช่น 'AYA')
  status: string;         // 'active' | 'pending'
}
```

### Authorization Middleware

**File:** `src/lib/api-auth.ts`

```typescript
// ทุก API request ต้องผ่าน middleware นี้
async function apiHandler({ req, payload }) {
  // 1. ดึง token จาก cookie
  // 2. ถอดรหัส JWT
  // 3. แนบ payload ไปกับ request
}
```

## Database Schema

### Collections

#### 1. users
```javascript
{
  _id: ObjectId,
  email: String,              // Email สำหรับ login
  password: String,           // bcrypt hash (สำหรับ leader/admin)
  name: String,               // ชื่อ
  surname: String,            // นามสกุล
  role: String,               // 'driver' | 'leader' | 'admin'
  branch: String,             // สาขา (เช่น 'AYA')
  lineUserId: String,         // LINE User ID
  lineDisplayName: String,    // ชื่อบน LINE
  lineProfileImage: String,   // รูปโปรไฟล์ LINE
  status: String,            // 'pending' | 'active'
  phone: String,              // เบอร์โทร
  employeeId: String,         // รหัสพนักงาน
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. leaveRequests
```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // ผู้ขอลา (ref: users)
  leaveType: String,          // 'sick' | 'personal' | 'vacation' | 'etc'
  startDate: Date,
  endDate: Date,
  status: String,             // 'pending' | 'approved' | 'rejected'
  reason: String,             // เหตุผล
  approvedBy: ObjectId,       // ผู้อนุมัติ (ref: users)
  approvedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. jobAssignments
```javascript
{
  _id: ObjectId,
  assignedTo: ObjectId,       // ผู้รับงาน (ref: users)
  assignedBy: ObjectId,       // ผู้มอบหมาย (ref: users)
  title: String,              // หัวข้องาน
  description: String,        // รายละเอียด
  jobType: String,            // 'bring_to_center' | 'bring_to_branch' | 'maintenance' | 'etc'
  status: String,             // 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  totalAmount: Number,        // ค่าตอบแทนรวม
  otAmount: Number,
  tripAmount: Number,
  allowanceAmount: Number,
  otherAmount: Number,
  amountNote: String,
  completionNote: String,
  completionPhotos: [{ url: String, caption: String }],
  createdAt: Date,
  updatedAt: Date
}
```

#### 4. attendance
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // ผู้เช็คอิน
  type: String,              // 'check_in' | 'check_out'
  location: {
    latitude: Number,
    longitude: Number
  },
  photo: String,             // URL รูป
  createdAt: Date
}
```

## Common Issues

### 1. Leader ไม่เห็นคำขอลา

**อาการ:** Leader login แล้วหน้า approve ว่างเปล่า

**สาเหตุที่เป็นไปได้:**
1. Leader ไม่มี `branch` ใน users collection
2. Leave request มี `userId` ที่ไม่ตรงกับ user ในสาขา
3. Branch name ต่างกัน (case-sensitive)

**วิธีแก้:**
```javascript
// buildLeaveScope() - ถ้า leader ไม่มี branch ให้ดู pending ทั้งหมด
if (actor.role === 'leader') {
  if (!actor.branch) {
    filter.status = 'pending';  // ดู pending ทั้งหมด
  } else {
    filter.userId = { $in: getBranchUserIds(actor.branch) };
  }
}
```

### 2. Login ด้วย LINE ไม่ได้

**อาการ:** LINE login redirect ไม่ถูกต้อง

**สาเหตุ:**
1. `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` ไม่ถูกต้อง
2. `LINE_REDIRECT_URI` ไม่ตรงกับ LINE Developer Console

### 3. API Return Unauthorized

**อาการ:** API ทุกตัว return `{ error: "Unauthorized" }`

**สาเหตุ:** JWT token หมดอายุ หรือ cookie ไม่ถูกส่งมา

**วิธีแก้:** Login ใหม่

## Environment Variables

```bash
# Database
MONGODB_URI=mongodb+srv://...

# LINE Login
LINE_CHANNEL_ID=...
LINE_CHANNEL_SECRET=...
LINE_REDIRECT_URI=https://your-domain.com/api/auth/callback
NEXT_PUBLIC_LINE_CHANNEL_ID=...
NEXT_PUBLIC_LINE_REDIRECT_URI=...

# Auth
JWT_SECRET=...
REFRESH_SECRET=...

# Pusher (Real-time)
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=...
NEXT_PUBLIC_PUSHER_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=...

# Admin
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

## Deployment

### Vercel Project Structure

```
Repository: Narongyot1990/leave-management
Project Name: drivers (on Vercel)
Production URL: https://drivers-tau.vercel.app

Environment Variables:
- ทั้งหมดอยู่ใน Vercel Project Settings
- ต้องมี MONGODB_URI ถึงจะ build สำเร็จ
```

### Build Process

```
1. Git push to master
2. Vercel auto-deploy
3. Build command: npm run build
4. Runtime: Node.js 24.x
5. Framework: Next.js 15 App Router
```

## Quick Reference

### Role Permissions

| Action | Driver | Leader | Admin |
|--------|--------|--------|-------|
| ขอลา (ตัวเอง) | ✅ | ✅ | ✅ |
| ดูคำขอลาตัวเอง | ✅ | ✅ | ✅ |
| ดูคำขอลาทีม/สาขา | ❌ | ✅ (สาขาตัวเอง) | ✅ (ทุกสาขา) |
| อนุมัติ/ปฏิเสธลา | ❌ | ✅ (สาขาตัวเอง) | ✅ (ทุกสาขา) |
| จัดการ Users | ❌ | บางส่วน | ✅ |
| มอบหมายงาน | ❌ | ✅ | ✅ |
